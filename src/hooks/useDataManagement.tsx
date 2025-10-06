import { useState, useEffect, useCallback } from "react";
import type { LDGRJson, BasicUser, CategoryKey, UIState } from "../types";
import {
  buildDataset,
  getCategoryArray,
  sortUsers,
  latestOrderIndexFrom,
} from "../lib/merge";
import { loadMerged, saveMerged } from "../lib/storage";
import { alphaHeader } from "../lib/utils";

// Hook for handling file uploads
export const useFileUpload = () => {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [baseFile, setBaseFile] = useState<File | null>(null);

  const handleFileSelection = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // Add selected files to pending files list
      const newPendingFiles = [...pendingFiles];
      Array.from(files).forEach((file) => {
        if (!pendingFiles.some((f) => f.name === file.name)) {
          newPendingFiles.push(file);
        }
      });
      setPendingFiles(newPendingFiles);
    },
    [pendingFiles]
  );

  const handleRemoveFile = useCallback(
    (fileName: string) => {
      setPendingFiles(pendingFiles.filter((f) => f.name !== fileName));
      if (baseFile?.name === fileName) {
        setBaseFile(null);
      }
    },
    [pendingFiles, baseFile]
  );

  const handleMarkAsBase = useCallback(
    (file: File) => {
      if (baseFile?.name === file.name) {
        setBaseFile(null);
      } else {
        setBaseFile(file);
      }
    },
    [baseFile]
  );

  const readJson = useCallback((file: File): Promise<LDGRJson> => {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          res(JSON.parse(String(fr.result)));
        } catch (e) {
          rej(e);
        }
      };
      fr.onerror = rej;
      fr.readAsText(file);
    });
  }, []);

  // Normalize snapshots to consistent format
  const normalizeSnapshot = useCallback((json: LDGRJson): LDGRJson => {
    const normalized = { ...json };

    // Process each snapshot to convert changed_users to followers/following arrays if needed
    normalized.snapshots = normalized.snapshots.map((snapshot) => {
      // If the snapshot already has followers and following arrays, leave it as is
      if (
        snapshot.followers &&
        snapshot.followers.length > 0 &&
        snapshot.following &&
        snapshot.following.length > 0
      ) {
        return snapshot;
      }

      // If snapshot has changed_users but no followers/following, convert it
      if (snapshot.changed_users && snapshot.changed_users.length > 0) {
        const followers = snapshot.changed_users.filter(
          (user) => user.follower
        );
        const following = snapshot.changed_users.filter(
          (user) => user.following
        );

        return {
          ...snapshot,
          followers: followers,
          following: following,
        };
      }

      return snapshot;
    });

    return normalized;
  }, []);

  return {
    pendingFiles,
    uploadedFiles,
    uploading,
    baseFile,
    setPendingFiles,
    setUploadedFiles,
    setUploading,
    setBaseFile,
    handleFileSelection,
    handleRemoveFile,
    handleMarkAsBase,
    readJson,
    normalizeSnapshot,
  };
};

// Hook for handling dataset management
export const useDatasetManager = () => {
  const [ui, setUI] = useState<UIState & { step: "upload" | "dashboard" }>({
    base: undefined,
    snapshots: [],
    dataset: undefined,
    category: "followers",
    search: "",
    verified: "any",
    privacy: "any",
    whitelist: "any",
    pageSize: 50,
    page: 1,
    sort: "chronoNewest",
    showTrend: false,
    step: "upload",
    baseSnapshotIndex: undefined,
    compareSnapshotIndex: undefined,
  });

  // Load prior merged base on mount
  useEffect(() => {
    const base = loadMerged();
    if (base) {
      setUI((p) => ({ ...p, base }));
    }
  }, []);

  // Build dataset whenever base/snapshots change
  const rebuildDataset = useCallback(
    (
      base: LDGRJson | undefined,
      snaps: LDGRJson[],
      baseSnapshotIndex?: number,
      compareSnapshotIndex?: number
    ) => {
      if (snaps.length > 0)
        return buildDataset(
          base,
          snaps,
          baseSnapshotIndex,
          compareSnapshotIndex
        );
      return undefined;
    },
    []
  );

  const setAndRebuild = useCallback(
    (next: Partial<UIState>) => {
      setUI((prevUI) => {
        const base = (next.base ?? prevUI.base) as LDGRJson | undefined;
        const snaps = (next.snapshots ?? prevUI.snapshots) as LDGRJson[];
        const baseSnapshotIndex =
          next.baseSnapshotIndex !== undefined
            ? next.baseSnapshotIndex
            : prevUI.baseSnapshotIndex;
        const compareSnapshotIndex =
          next.compareSnapshotIndex !== undefined
            ? next.compareSnapshotIndex
            : prevUI.compareSnapshotIndex;

        const dataset = rebuildDataset(
          base,
          snaps,
          baseSnapshotIndex,
          compareSnapshotIndex
        );
        return { ...prevUI, ...next, dataset };
      });
    },
    [rebuildDataset]
  );

  const onToggleWhitelist = useCallback((u: BasicUser) => {
    setUI((prevUI) => {
      if (!prevUI.dataset) return prevUI;

      const dataset = { ...prevUI.dataset };
      const flip = !u.whitelisted;
      const key = (u.username || "").toLowerCase();

      const updateMap = (map: Map<string, BasicUser>) => {
        const clone = new Map(map);
        const user = clone.get(key);
        if (user) clone.set(key, { ...user, whitelisted: flip });
        return clone;
      };

      dataset.latestFollowers = updateMap(dataset.latestFollowers);
      dataset.latestFollowing = updateMap(dataset.latestFollowing);
      dataset.mutuals = updateMap(dataset.mutuals);
      dataset.notFollowingBack = updateMap(dataset.notFollowingBack);
      dataset.iDontFollowBack = updateMap(dataset.iDontFollowBack);

      return { ...prevUI, dataset };
    });
  }, []);

  const onWhitelistAll = useCallback((filteredUsers: BasicUser[]) => {
    setUI((prevUI) => {
      if (!prevUI.dataset) return prevUI;

      // Create a new dataset to avoid mutating the original
      const dataset = { ...prevUI.dataset };

      // Process all users that need to be whitelisted
      filteredUsers.forEach((user) => {
        if (!user.whitelisted) {
          const key = (user.username || "").toLowerCase();

          const updateMap = (map: Map<string, BasicUser>) => {
            const clone = new Map(map);
            const u = clone.get(key);
            if (u) clone.set(key, { ...u, whitelisted: true });
            return clone;
          };

          dataset.latestFollowers = updateMap(dataset.latestFollowers);
          dataset.latestFollowing = updateMap(dataset.latestFollowing);
          dataset.mutuals = updateMap(dataset.mutuals);
          dataset.notFollowingBack = updateMap(dataset.notFollowingBack);
          dataset.iDontFollowBack = updateMap(dataset.iDontFollowBack);
        }
      });

      return { ...prevUI, dataset };
    });
  }, []);

  const onDownloadMerged = useCallback((): LDGRJson | undefined => {
    if (!ui.dataset) return undefined;

    const merged: LDGRJson = {
      account: ui.dataset.account,
      snapshots: ui.dataset.mergedSnapshots,
      enriched_at: new Date().toISOString(),
      schema: { version: 1 },
    };

    saveMerged(merged);
    return merged;
  }, [ui.dataset]);

  return {
    ui,
    setUI,
    setAndRebuild,
    onToggleWhitelist,
    onWhitelistAll,
    onDownloadMerged,
    rebuildDataset,
  };
};

// Hook for filtering and sorting users
export const useUserFiltering = (
  dataset: any,
  category: CategoryKey,
  search: string,
  verified: string,
  privacy: string,
  whitelist: string,
  sort: string
) => {
  // Get raw items from the selected category
  const itemsRaw = dataset ? getCategoryArray(dataset, category) : [];

  // Apply filters
  const filtered = itemsRaw.filter((u: BasicUser) => {
    const uname = (u.username || "").toLowerCase();
    const fname = (u.full_name ?? "").toLowerCase();

    if (verified === "verified" && !u.is_verified) return false;
    if (verified === "notVerified" && u.is_verified) return false;

    if (privacy === "private" && !u.is_private) return false;
    if (privacy === "public" && u.is_private) return false;

    if (whitelist === "only" && !u.whitelisted) return false;
    if (whitelist === "exclude" && u.whitelisted) return false;

    if (search) {
      const q = search.toLowerCase();
      if (!uname.includes(q) && !fname.includes(q)) return false;
    }
    return true;
  });

  // Apply sorting
  const lastSnap = dataset?.mergedSnapshots[dataset.mergedSnapshots.length - 1];
  const orderIndexNewest =
    sort === "chronoNewest"
      ? latestOrderIndexFrom(
          lastSnap,
          category === "following" || category === "notFollowingBack"
            ? "following"
            : "followers"
        )
      : undefined;

  const sorted = dataset
    ? sortUsers(filtered, sort as any, orderIndexNewest)
    : filtered;

  const showAlphaHeaders = sort === "alpha" || sort === "alphaDesc";

  return {
    filtered,
    sorted,
    showAlphaHeaders,
    alphaHeaderFunc: (u: BasicUser) => alphaHeader(u.username),
  };
};
