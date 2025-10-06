import { LDGRJson, BasicUser, Snapshot } from "../types";

/**
 * Convert username to lowercase for key comparisons
 */
export const toKey = (username: string): string => {
  return (username || "").toLowerCase();
};

/**
 * Interface to track attribute changes over time
 */
interface AttributeChange {
  attribute: string;
  oldValue: any;
  newValue: any;
  changed_at: string;
}

/**
 * Extended BasicUser interface with additional tracking properties
 */
interface EnrichedUser extends BasicUser {
  attributeHistory?: Record<string, AttributeChange[]>;
}

/**
 * Generate a v4-like UUID (not cryptographically secure, but sufficient for our needs)
 */
export const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Merge existing user data with new user data, tracking changes in aliases
 * @returns A dictionary of changes that were detected
 */
export const mergeUser = (
  existingUser: BasicUser,
  newUser: BasicUser,
  timestamp: string
): Record<string, any> => {
  const changes: Record<string, any> = {};

  // Handle username change
  if (toKey(existingUser.username) !== toKey(newUser.username)) {
    // Create a new alias entry with the old username and timestamp
    const aliasEntry = {
      username: existingUser.username,
      changed_at: timestamp,
    };

    // Check if the alias already exists to avoid duplicates
    const existingAliases = existingUser.aliases || [];
    let aliasExists = false;

    for (const alias of existingAliases) {
      if (alias.username === existingUser.username) {
        aliasExists = true;
        break;
      }
    }

    if (!aliasExists) {
      const newAliases = [...existingAliases, aliasEntry];
      existingUser.aliases = newAliases;
      changes.aliases = newAliases;
    }

    // Update username
    existingUser.username = newUser.username;
    changes.username = newUser.username;

    // Update profile URL
    existingUser.profile_url = `https://instagram.com/${newUser.username}`;
    changes.profile_url = existingUser.profile_url;
  }

  // Preserve UUID if it exists or use the new one if provided, or generate a new one
  if (newUser.uuid && !existingUser.uuid) {
    existingUser.uuid = newUser.uuid;
    changes.uuid = newUser.uuid;
  } else if (!existingUser.uuid) {
    existingUser.uuid = generateUUID();
    changes.uuid = existingUser.uuid;
  }

  // Preserve order_index if provided
  if (
    newUser.order_index !== undefined &&
    existingUser.order_index !== newUser.order_index
  ) {
    existingUser.order_index = newUser.order_index;
    changes.order_index = newUser.order_index;
  }

  // Check and update other attributes
  if (newUser.full_name && existingUser.full_name !== newUser.full_name) {
    existingUser.full_name = newUser.full_name;
    changes.full_name = newUser.full_name;
  }

  if (
    newUser.is_verified !== undefined &&
    existingUser.is_verified !== newUser.is_verified
  ) {
    existingUser.is_verified = newUser.is_verified;
    changes.is_verified = newUser.is_verified;
  }

  if (
    newUser.is_private !== undefined &&
    existingUser.is_private !== newUser.is_private
  ) {
    existingUser.is_private = newUser.is_private;
    changes.is_private = newUser.is_private;
  }

  if (
    newUser.whitelisted !== undefined &&
    existingUser.whitelisted !== newUser.whitelisted
  ) {
    existingUser.whitelisted = newUser.whitelisted;
    changes.whitelisted = newUser.whitelisted;
  }

  if (
    newUser.blocked !== undefined &&
    existingUser.blocked !== newUser.blocked
  ) {
    existingUser.blocked = newUser.blocked;
    changes.blocked = newUser.blocked;
  }

  if (
    newUser.profile_pic_url &&
    existingUser.profile_pic_url !== newUser.profile_pic_url
  ) {
    existingUser.profile_pic_url = newUser.profile_pic_url;
    changes.profile_pic_url = newUser.profile_pic_url;
  }

  // Update follower/following status if provided in the new data
  if (
    newUser.follower !== undefined &&
    existingUser.follower !== newUser.follower
  ) {
    existingUser.follower = newUser.follower;
    changes.follower = newUser.follower;
  }

  if (
    newUser.following !== undefined &&
    existingUser.following !== newUser.following
  ) {
    existingUser.following = newUser.following;
    changes.following = newUser.following;
  }

  // Always update last_seen
  existingUser.last_seen = timestamp;
  changes.last_seen = timestamp;

  // Set first_seen if it doesn't exist
  if (!existingUser.first_seen) {
    existingUser.first_seen = timestamp;
    changes.first_seen = timestamp;
  }

  return changes;
};

/**
 * Create a deep clone of the object to avoid modifying the original
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Merge a new snapshot into the base JSON, tracking all changes
 */
export const mergeSnapshots = (
  baseJson: LDGRJson,
  newSnapshot: Partial<LDGRJson>
): LDGRJson => {
  // Create a deep clone of the base to avoid modifying the original
  const base = deepClone(baseJson);

  // Get timestamp from the new snapshot or use current date
  const timestamp =
    newSnapshot.snapshots?.[0]?.timestamp || new Date().toISOString();

  // First try to match UUIDs between existing and new users
  const fullNewSnapshot = newSnapshot as LDGRJson;
  const uuidPreservedSnapshot = preserveUserUUIDs(baseJson, fullNewSnapshot);

  // Track all users in the base
  const allUsers: Record<string, BasicUser> = {};

  // Extract users from all snapshots
  for (const snapshot of base.snapshots || []) {
    for (const user of snapshot.changed_users || []) {
      const key = toKey(user.username);
      if (!allUsers[key]) {
        allUsers[key] = deepClone(user);
      }
    }
  }

  // Process new snapshot users
  const changedUsers: BasicUser[] = [];
  const newUsers = uuidPreservedSnapshot.snapshots?.[0]?.changed_users || [];

  for (const newUserData of newUsers) {
    const newUser = newUserData as BasicUser;
    const key = toKey(newUser.username);

    if (allUsers[key]) {
      // User exists, merge and track changes
      const existingUser = allUsers[key];
      const changes = mergeUser(existingUser, newUser, timestamp);

      // Only add to changedUsers if there were actual changes
      if (Object.keys(changes).length > 0) {
        changedUsers.push(deepClone(existingUser));
      }
    } else {
      // New user, add to tracking and changedUsers
      const enrichedUser: BasicUser = {
        ...newUser,
        first_seen: timestamp,
        last_seen: timestamp,
        // Ensure UUID is set
        uuid: newUser.uuid || generateUUID(),
        // Ensure aliases is initialized
        aliases: newUser.aliases || [],
      };
      allUsers[key] = enrichedUser;
      changedUsers.push(deepClone(enrichedUser));
    }
  }

  // Create new snapshot with only the changed users
  if (changedUsers.length > 0) {
    base.snapshots = [
      ...(base.snapshots || []),
      {
        timestamp,
        changed_users: changedUsers,
      },
    ];
  }

  // Update enriched_at timestamp
  base.enriched_at = new Date().toISOString();

  // Ensure schema version is set
  if (!base.schema) {
    base.schema = { version: 1 };
  }

  return base;
};

/**
 * Get statistics about the merged result
 */
export const getSnapshotStats = (
  result: LDGRJson
): {
  totalSnapshots: number;
  latestSnapshot: {
    timestamp: string;
    changedUsers: number;
  };
  totalUniqueUsers: number;
} => {
  const totalSnapshots = result.snapshots?.length || 0;
  const latestSnapshot = result.snapshots?.[totalSnapshots - 1];

  // Count unique users across all snapshots
  const uniqueUsers = new Set<string>();
  result.snapshots?.forEach((snapshot) => {
    snapshot.changed_users?.forEach((user) => {
      uniqueUsers.add(toKey(user.username));
    });
  });

  return {
    totalSnapshots,
    latestSnapshot: {
      timestamp: latestSnapshot?.timestamp || "",
      changedUsers: latestSnapshot?.changed_users?.length || 0,
    },
    totalUniqueUsers: uniqueUsers.size,
  };
};

/**
 * Get a user's state at a specific snapshot time
 * This allows viewing how a user appeared at any point in the history
 */
export const getUserStateAtSnapshot = (
  json: LDGRJson,
  username: string,
  snapshotTimestamp: string
): BasicUser | null => {
  // Convert to keys for comparison
  const userKey = toKey(username);
  const targetDate = new Date(snapshotTimestamp).getTime();

  // Sort snapshots by date (ascending)
  const sortedSnapshots = [...json.snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Find all snapshots up to and including the target date
  const relevantSnapshots = sortedSnapshots.filter(
    (s) => new Date(s.timestamp).getTime() <= targetDate
  );

  if (relevantSnapshots.length === 0) {
    return null;
  }

  let userState: BasicUser | null = null;

  // Build up user state by applying changes chronologically
  for (const snapshot of relevantSnapshots) {
    const userInSnapshot = snapshot.changed_users?.find(
      (u) => toKey(u.username) === userKey
    );

    if (userInSnapshot) {
      if (!userState) {
        userState = deepClone(userInSnapshot);
      } else {
        // Apply changes from this snapshot
        mergeUser(userState, userInSnapshot, snapshot.timestamp);
      }
    }
  }

  return userState;
};

/**
 * Find a user by any username, alias, or UUID
 * This is useful for looking up users across snapshot changes
 */
export const findUserByAnyUsername = (
  json: LDGRJson,
  usernameOrUUID: string
): BasicUser | null => {
  const searchKey = toKey(usernameOrUUID);

  // First, check if it's a UUID
  for (const snapshot of json.snapshots || []) {
    for (const user of snapshot.changed_users || []) {
      if (user.uuid === usernameOrUUID) {
        return user;
      }
    }
  }

  // Then check for direct username match
  for (const snapshot of json.snapshots || []) {
    for (const user of snapshot.changed_users || []) {
      if (toKey(user.username) === searchKey) {
        return user;
      }
    }
  }

  // If no direct match, check aliases
  for (const snapshot of json.snapshots || []) {
    for (const user of snapshot.changed_users || []) {
      const aliases = user.aliases || [];
      for (const alias of aliases) {
        if (toKey(alias.username) === searchKey) {
          return user; // Return the user with this alias
        }
      }
    }
  }

  return null;
};

/**
 * Get all changes for a specific user over time
 */
export const getUserChangeHistory = (
  json: LDGRJson,
  username: string
): Array<{ timestamp: string; changes: Record<string, any> }> => {
  const userKey = toKey(username);
  const history: Array<{ timestamp: string; changes: Record<string, any> }> =
    [];

  // Sort snapshots by date (ascending)
  const sortedSnapshots = [...json.snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let previousState: BasicUser | null = null;

  for (const snapshot of sortedSnapshots) {
    const userInSnapshot = snapshot.changed_users?.find(
      (u) =>
        toKey(u.username) === userKey ||
        u.aliases?.some((alias) => toKey(alias.username) === userKey)
    );

    if (userInSnapshot) {
      if (!previousState) {
        // First appearance - record all attributes as changes
        const initialState: Record<string, any> = {};
        Object.entries(userInSnapshot).forEach(([key, value]) => {
          if (value !== undefined && key !== "aliases") {
            initialState[key] = value;
          }
        });

        history.push({
          timestamp: snapshot.timestamp,
          changes: initialState,
        });
      } else {
        // Compare with previous state to find changes
        const changes = mergeUser(
          deepClone(previousState),
          userInSnapshot,
          snapshot.timestamp
        );

        if (Object.keys(changes).length > 0) {
          history.push({
            timestamp: snapshot.timestamp,
            changes,
          });
        }
      }

      previousState = deepClone(userInSnapshot);
    }
  }

  return history;
};

/**
 * Find users with the same username in two snapshots and preserve UUIDs
 * This helps ensure the same user keeps their UUID across snapshots
 */
export const preserveUserUUIDs = (
  baseJson: LDGRJson,
  newSnapshot: LDGRJson
): LDGRJson => {
  // Clone the new snapshot to avoid modifying the original
  const result = deepClone(newSnapshot);

  if (
    !result.snapshots?.[0]?.changed_users ||
    result.snapshots[0].changed_users.length === 0
  ) {
    return result;
  }

  // Create a map of all users in the base by username
  const baseUsers = new Map<string, BasicUser>();

  // Extract all users from base snapshots
  baseJson.snapshots?.forEach((snapshot) => {
    snapshot.changed_users?.forEach((user) => {
      // Use lowercase username as key for case-insensitive matching
      const key = toKey(user.username);
      if (!baseUsers.has(key)) {
        baseUsers.set(key, user);
      }

      // Also map by all aliases
      user.aliases?.forEach((alias) => {
        const aliasKey = toKey(alias.username);
        if (!baseUsers.has(aliasKey)) {
          baseUsers.set(aliasKey, user);
        }
      });
    });
  });

  // Update UUIDs in the new snapshot to match the base where usernames match
  result.snapshots[0].changed_users.forEach((user) => {
    const key = toKey(user.username);
    const baseUser = baseUsers.get(key);

    if (baseUser && baseUser.uuid) {
      // Preserve UUID from base user
      user.uuid = baseUser.uuid;
    } else if (!user.uuid) {
      // Generate a new UUID if one doesn't exist
      user.uuid = generateUUID();
    }
  });

  return result;
};

/**
 * Convert the new Instagram export JSON format to our format
 * This is useful when importing data from the Instagram export tool
 */
export const convertFromInstagramExport = (
  exportJson: any,
  accountUsername: string
): LDGRJson => {
  // Create a base structure
  const result: LDGRJson = {
    account: {
      username: accountUsername,
      profile_url: `https://instagram.com/${accountUsername}`,
    },
    snapshots: [],
    enriched_at: new Date().toISOString(),
    schema: {
      version: 1,
    },
  };

  // Process each snapshot in the export
  if (exportJson.snapshots && Array.isArray(exportJson.snapshots)) {
    for (const snapshot of exportJson.snapshots) {
      const changedUsers: BasicUser[] = [];

      if (snapshot.changed_users && Array.isArray(snapshot.changed_users)) {
        for (const user of snapshot.changed_users) {
          if (user.username) {
            // Convert to our format
            const basicUser: BasicUser = {
              username: user.username,
              profile_url:
                user.profile_url || `https://instagram.com/${user.username}`,
              follower: user.follower,
              following: user.following,
              is_verified: user.is_verified,
              is_private: user.is_private,
              whitelisted: user.whitelisted,
              full_name: user.full_name || "",
              blocked: user.blocked,
              // Preserve order index and UUID if they exist
              order_index: user.order_index,
              order_index_following: user.order_index_following,
              uuid: user.uuid || generateUUID(), // Generate UUID if not provided
            };

            // Add aliases if they exist
            if (user.aliases && Array.isArray(user.aliases)) {
              // Ensure aliases are in the correct format
              basicUser.aliases = user.aliases.map((alias: any) => {
                // Convert string aliases to object format if needed
                if (typeof alias === "string") {
                  return {
                    username: alias,
                    changed_at: snapshot.timestamp || new Date().toISOString(),
                  };
                }
                return alias;
              });
            } else {
              basicUser.aliases = [];
            }

            changedUsers.push(basicUser);
          }
        }
      }

      // Add snapshot to result
      result.snapshots.push({
        timestamp: snapshot.timestamp,
        changed_users: changedUsers,
      });
    }
  }

  return result;
};

/**
 * Create a new base LDGR JSON from a CSV snapshot
 * This helps convert from old CSV format to our JSON format
 */
export const createBaseFromCsv = (
  accountUsername: string,
  followers: string[],
  following: string[],
  timestamp: string = new Date().toISOString()
): LDGRJson => {
  const changedUsers: BasicUser[] = [];
  const processedUsers = new Set<string>();

  let followerIndex = 0;
  let followingIndex = 0;

  // Process followers
  for (const username of followers) {
    if (!username || username.trim() === "") continue;

    const key = toKey(username);
    if (processedUsers.has(key)) continue;

    processedUsers.add(key);
    changedUsers.push({
      username,
      profile_url: `https://instagram.com/${username}`,
      follower: true,
      following: following.some((u) => toKey(u) === key),
      first_seen: timestamp,
      last_seen: timestamp,
      // New fields
      order_index: followerIndex++,
      uuid: generateUUID(),
      aliases: [],
    });
  }

  // Process following who aren't already processed
  for (const username of following) {
    if (!username || username.trim() === "") continue;

    const key = toKey(username);
    if (processedUsers.has(key)) continue;

    processedUsers.add(key);
    changedUsers.push({
      username,
      profile_url: `https://instagram.com/${username}`,
      follower: false,
      following: true,
      first_seen: timestamp,
      last_seen: timestamp,
      // New fields
      order_index_following: followingIndex++,
      uuid: generateUUID(),
      aliases: [],
    });
  }

  return {
    account: {
      username: accountUsername,
      profile_url: `https://instagram.com/${accountUsername}`,
    },
    snapshots: [
      {
        timestamp,
        changed_users: changedUsers,
      },
    ],
    enriched_at: timestamp,
    schema: {
      version: 1,
    },
  };
};
