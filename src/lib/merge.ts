import type {
  BasicUser,
  Dataset,
  LDGRJson,
  Snapshot,
  CategoryKey,
  SortMode,
  SnapshotComparison,
} from "../types";
import { alphaHeader, mergeUser, toKey } from "./utils";

/**
 * Compare two snapshots to generate differences
 */
export function compareSnapshots(
  baseSnapshot: Snapshot,
  compareSnapshot: Snapshot,
  seen: Map<string, BasicUser>
): SnapshotComparison {
  // Ensure arrays exist even if empty
  const baseFollowers = baseSnapshot.followers || [];
  const baseFollowing = baseSnapshot.following || [];
  const compareFollowers = compareSnapshot.followers || [];
  const compareFollowing = compareSnapshot.following || [];

  const baseFollowerSet = new Set(baseFollowers.map((u) => toKey(u)));
  const baseFollowingSet = new Set(baseFollowing.map((u) => toKey(u)));

  const compareFollowerSet = new Set(compareFollowers.map((u) => toKey(u)));
  const compareFollowingSet = new Set(compareFollowing.map((u) => toKey(u)));

  // Lost followers = in baseFollowerSet but not in compareFollowerSet
  const lostFollowers = Array.from(baseFollowerSet)
    .filter((k) => !compareFollowerSet.has(k))
    .map((k) => ({ user: seen.get(k)! }));

  // Unfollowed = in baseFollowingSet but not in compareFollowingSet
  const unfollowed = Array.from(baseFollowingSet)
    .filter((k) => !compareFollowingSet.has(k))
    .map((k) => ({ user: seen.get(k)! }));

  // New followers = in compareFollowerSet but not in baseFollowerSet
  const newFollowers = Array.from(compareFollowerSet)
    .filter((k) => !baseFollowerSet.has(k))
    .map((k) => ({ user: seen.get(k)! }));

  // New following = in compareFollowingSet but not in baseFollowingSet
  const newFollowing = Array.from(compareFollowingSet)
    .filter((k) => !baseFollowingSet.has(k))
    .map((k) => ({ user: seen.get(k)! }));

  return {
    baseSnapshot,
    compareSnapshot,
    lostFollowers,
    unfollowed,
    newFollowers,
    newFollowing,
  };
}

/**
 * Combine multiple LDGR JSON files into one unified dataset.
 * - Accepts an optional merged "base" and any number of fresh "snapshot" files.
 * - Produces mergedSnapshots + latest sets + deltas (lostFollowers/unfollowed).
 */
export function buildDataset(
  base: LDGRJson | undefined,
  files: LDGRJson[],
  baseSnapshotIndex?: number,
  compareSnapshotIndex?: number
): Dataset {
  // First, ensure that all snapshots have followers and following arrays
  const normalizeSnapshots = (input: LDGRJson[]): LDGRJson[] => {
    return input.map((f) => ({
      ...f,
      snapshots: f.snapshots.map((s) => {
        // Convert changed_users to followers/following if needed
        if (s.changed_users && (!s.followers || !s.following)) {
          const followers = s.changed_users.filter((u) => u.follower === true);
          const following = s.changed_users.filter((u) => u.following === true);
          return {
            ...s,
            followers: s.followers || followers,
            following: s.following || following,
          };
        }
        // Ensure arrays exist even if empty
        return {
          ...s,
          followers: s.followers || [],
          following: s.following || [],
        };
      }),
    }));
  };

  const normalizedBase = base ? normalizeSnapshots([base])[0] : undefined;
  const normalizedFiles = normalizeSnapshots(files);

  const all = [
    ...(normalizedBase ? [normalizedBase] : []),
    ...normalizedFiles,
  ].flatMap((f) =>
    f.snapshots.map((s) => ({
      ...s,
      // store per-snapshot order index for "chrono"
      followers: (s.followers || []).map((u, i) => ({ ...u, order_index: i })),
      following: (s.following || []).map((u, i) => ({ ...u, order_index: i })),
    }))
  );

  // Sort snapshots by timestamp ascending
  const mergedSnapshots: Snapshot[] = all.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Fold all users across time to enrich first/last seen
  const seen: Map<string, BasicUser> = new Map();
  for (const snap of mergedSnapshots) {
    // Ensure arrays exist even if empty
    const followers = snap.followers || [];
    const following = snap.following || [];

    for (const list of [followers, following]) {
      for (const u of list) {
        const k = toKey(u);
        const enriched: BasicUser = {
          ...u,
          profile_url: u.profile_url || `https://instagram.com/${u.username}`,
        };
        const prev = seen.get(k);
        if (!prev) {
          seen.set(k, {
            ...enriched,
            first_seen: snap.timestamp,
            last_seen: snap.timestamp,
          });
        } else {
          seen.set(
            k,
            mergeUser(prev, { ...enriched, last_seen: snap.timestamp })
          );
        }
      }
    }
  }

  // Compute latest followers/following from last snapshot
  const last = mergedSnapshots[mergedSnapshots.length - 1];
  const latestFollowers = new Map<string, BasicUser>();
  const latestFollowing = new Map<string, BasicUser>();
  if (last) {
    const followers = last.followers || [];
    const following = last.following || [];

    for (const u of followers)
      latestFollowers.set(toKey(u), seen.get(toKey(u))!);
    for (const u of following)
      latestFollowing.set(toKey(u), seen.get(toKey(u))!);
  }

  // Mutuals
  const mutuals = new Map<string, BasicUser>();
  for (const [k, u] of latestFollowers) {
    if (latestFollowing.has(k)) mutuals.set(k, u);
  }

  // Not following back / I don't follow back
  const notFollowingBack = new Map<string, BasicUser>(); // I follow them, they don't follow me
  const iDontFollowBack = new Map<string, BasicUser>(); // They follow me, I don't follow them

  for (const [k, u] of latestFollowing) {
    if (!latestFollowers.has(k)) notFollowingBack.set(k, u);
  }
  for (const [k, u] of latestFollowers) {
    if (!latestFollowing.has(k)) iDontFollowBack.set(k, u);
  }

  // Lost followers & Unfollowed: infer time ranges from transitions between snapshots
  const lostFollowers: Array<{ user: BasicUser; from: string; to: string }> =
    [];
  const unfollowed: Array<{ user: BasicUser; from: string; to: string }> = [];

  const fSets = mergedSnapshots.map(
    (s) => new Set((s.followers || []).map((u) => toKey(u)))
  );
  const gSets = mergedSnapshots.map(
    (s) => new Set((s.following || []).map((u) => toKey(u)))
  );

  // Detect transitions: present -> absent
  for (let i = 0; i < mergedSnapshots.length - 1; i++) {
    const aF = fSets[i];
    const bF = fSets[i + 1];
    const aG = gSets[i];
    const bG = gSets[i + 1];

    // lost followers = in aF but not in bF
    for (const k of aF) {
      if (!bF.has(k)) {
        const user = seen.get(k)!;
        lostFollowers.push({
          user,
          from: mergedSnapshots[i].timestamp,
          to: mergedSnapshots[i + 1].timestamp,
        });
      }
    }
    // unfollowed = in aG but not in bG
    for (const k of aG) {
      if (!bG.has(k)) {
        const user = seen.get(k)!;
        unfollowed.push({
          user,
          from: mergedSnapshots[i].timestamp,
          to: mergedSnapshots[i + 1].timestamp,
        });
      }
    }
  }

  // Alpha header index for grouping (only used for alpha sorts)
  const alphaIndex = new Map<string, string>();
  for (const [k, u] of seen) {
    alphaIndex.set(k, alphaHeader(u.username));
  }

  // Create snapshot comparison if indices are provided
  let selectedComparison: SnapshotComparison | undefined;
  if (
    baseSnapshotIndex !== undefined &&
    compareSnapshotIndex !== undefined &&
    baseSnapshotIndex >= 0 &&
    compareSnapshotIndex >= 0 &&
    baseSnapshotIndex < mergedSnapshots.length &&
    compareSnapshotIndex < mergedSnapshots.length
  ) {
    selectedComparison = compareSnapshots(
      mergedSnapshots[baseSnapshotIndex],
      mergedSnapshots[compareSnapshotIndex],
      seen
    );
  }

  // Fix for account name - use the hard-coded username instead of from JSON
  const accountName = "straight.up.sean";
  const accountInfo = {
    username: accountName,
    profile_url: `https://instagram.com/${accountName}`,
  };

  // Fix metadata for snapshots after June 1, 2025
  // If someone is following you now, and you were following them in a past snapshot,
  // then they should appear in both the followers and following lists of that snapshot
  const june1Date = new Date("2025-06-01T00:00:00");
  if (last) {
    // Get latest followers and following users
    const followers = last.followers || [];
    const following = last.following || [];
    const currentFollowers = new Set(followers.map((u) => toKey(u)));
    const currentFollowing = new Set(following.map((u) => toKey(u)));

    // Update snapshots after June 1, 2025
    for (let i = 0; i < mergedSnapshots.length; i++) {
      const snapDate = new Date(mergedSnapshots[i].timestamp);

      if (snapDate >= june1Date) {
        // Ensure arrays exist
        const snapshotFollowers = mergedSnapshots[i].followers || [];
        const snapshotFollowing = mergedSnapshots[i].following || [];

        // Get existing follower and following keys in this snapshot
        const existingFollowerKeys = new Set(
          snapshotFollowers.map((u) => toKey(u))
        );
        const existingFollowingKeys = new Set(
          snapshotFollowing.map((u) => toKey(u))
        );

        // Find current followers who should be added to historical snapshot
        const additionalFollowers: BasicUser[] = [];
        // If you were following someone in a past snapshot and they are now following you,
        // add them to the followers list of that snapshot
        for (const followingUser of snapshotFollowing) {
          const key = toKey(followingUser);
          if (currentFollowers.has(key) && !existingFollowerKeys.has(key)) {
            // This is someone you were following then, and they follow you now
            // So add them to your followers list for that snapshot
            const userData = seen.get(key);
            if (userData) {
              additionalFollowers.push({
                ...userData,
                order_index:
                  snapshotFollowers.length + additionalFollowers.length,
              });
            }
          }
        }

        // Find current following who should be added to historical snapshot
        const additionalFollowing: BasicUser[] = [];
        // If someone was following you in a past snapshot and you are now following them,
        // add them to the following list of that snapshot
        for (const followerUser of snapshotFollowers) {
          const key = toKey(followerUser);
          if (currentFollowing.has(key) && !existingFollowingKeys.has(key)) {
            // This is someone who was following you then, and you follow them now
            // So add them to your following list for that snapshot
            const userData = seen.get(key);
            if (userData) {
              additionalFollowing.push({
                ...userData,
                order_index:
                  snapshotFollowing.length + additionalFollowing.length,
              });
            }
          }
        }

        // Update the snapshot with corrected followers and following lists
        mergedSnapshots[i] = {
          ...mergedSnapshots[i],
          followers: [...snapshotFollowers, ...additionalFollowers],
          following: [...snapshotFollowing, ...additionalFollowing],
        };
      }
    }
  }

  return {
    account: accountInfo,
    mergedSnapshots,
    latestFollowers,
    latestFollowing,
    mutuals,
    notFollowingBack,
    iDontFollowBack,
    lostFollowers,
    unfollowed,
    alphaIndex,
    selectedComparison,
  };
}

export function sortUsers(
  arr: BasicUser[],
  mode: SortMode,
  latestOrderIndex?: Map<string, number>
): BasicUser[] {
  if (mode === "alpha") {
    return [...arr].sort((a, b) => a.username.localeCompare(b.username));
  }
  if (mode === "alphaDesc") {
    return [...arr].sort((a, b) => b.username.localeCompare(a.username));
  }

  // Handle chronological sorting
  if (!latestOrderIndex) return arr;

  return [...arr].sort((a, b) => {
    const ai = latestOrderIndex.get(a.username.toLowerCase());
    const bi = latestOrderIndex.get(b.username.toLowerCase());

    if (ai == null && bi == null) return a.username.localeCompare(b.username);
    if (ai == null) return 1;
    if (bi == null) return -1;

    // For chronoNewest, invert the comparison to show newest (lowest index) first
    if (mode === "chronoNewest") {
      return ai - bi;
    } else {
      // For regular chrono (oldest first)
      return bi - ai;
    }
  });
}

/** Latest order index map from last snapshot list (followers or following). */
export function latestOrderIndexFrom(
  last: Snapshot | undefined,
  list: "followers" | "following"
): Map<string, number> | undefined {
  if (!last) return;
  const users = last[list] || [];
  return new Map(
    users.map((u) => [u.username.toLowerCase(), u.order_index ?? 0])
  );
}

/** Category -> array accessor into a Dataset */
export function getCategoryArray(ds: Dataset, cat: CategoryKey): BasicUser[] {
  switch (cat) {
    case "followers":
      return [...ds.latestFollowers.values()];
    case "following":
      return [...ds.latestFollowing.values()];
    case "mutuals":
      return [...ds.mutuals.values()];
    case "notFollowingBack":
      return [...ds.notFollowingBack.values()];
    case "iDontFollowBack":
      return [...ds.iDontFollowBack.values()];
    case "lostFollowers":
      // If snapshot comparison is active, use that instead of all history
      if (ds.selectedComparison) {
        return ds.selectedComparison.lostFollowers.map((x) => x.user);
      }
      return ds.lostFollowers.map((x) => x.user);
    case "unfollowed":
      // If snapshot comparison is active, use that instead of all history
      if (ds.selectedComparison) {
        return ds.selectedComparison.unfollowed.map((x) => x.user);
      }
      return ds.unfollowed.map((x) => x.user);
    case "newFollowers":
      // Only available when snapshot comparison is active
      if (ds.selectedComparison) {
        return ds.selectedComparison.newFollowers.map((x) => x.user);
      }
      return [];
    case "newFollowing":
      // Only available when snapshot comparison is active
      if (ds.selectedComparison) {
        return ds.selectedComparison.newFollowing.map((x) => x.user);
      }
      return [];
  }
}
