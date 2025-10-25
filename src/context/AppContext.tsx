import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from "react";
import type {
  LDGRJson,
  BasicUser,
  CategoryKey,
  UIState,
  Dataset,
  SortMode,
} from "../types";
import {
  buildDataset,
  getCategoryArray,
  sortUsers,
  latestOrderIndexFrom,
} from "../lib/merge";
import { loadMerged, saveMerged } from "../lib/storage";
import { alphaHeader } from "../lib/utils";

export type Step = "upload" | "dashboard";

interface AppContextType {
  // State
  ui: UIState & { step: Step };
  // Actions
  setUI: React.Dispatch<React.SetStateAction<UIState & { step: Step }>>;
  setAndRebuild: (next: Partial<UIState>) => void;
  onFilesAdded: (files: LDGRJson[]) => void;
  onBaseChosen: (file: LDGRJson) => void;
  onEnterDashboard: () => void;
  onToggleWhitelist: (u: BasicUser) => void;
  onWhitelistAll: (filteredUsers: BasicUser[]) => void;
  onDownloadMerged: () => LDGRJson | undefined;
  handleBaseSnapshotChange: (index: number) => void;
  handleCompareSnapshotChange: (index: number) => void;
  // File uploads
  fileUpload: {
    pendingFiles: File[];
    uploadedFiles: string[];
    uploading: boolean;
    baseFile: File | null;
    handleFileSelection: (files: FileList | null) => void;
    handleRemoveFile: (fileName: string) => void;
    handleMarkAsBase: (file: File) => void;
    readJson: (file: File) => Promise<LDGRJson>;
    normalizeSnapshot: (json: LDGRJson) => LDGRJson;
  };
  // Notifications
  snack: {
    open: boolean;
    msg: string;
    severity: "success" | "info" | "error";
  };
  showSnack: (msg: string, severity?: "success" | "info" | "error") => void;
  hideSnack: () => void;
}

// Initial UI state
export const initialUI: UIState & { step: Step } = {
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
};

// Create context with default values
const AppContext = createContext<AppContextType>({
  ui: initialUI,
  setUI: () => {},
  setAndRebuild: () => {},
  onFilesAdded: () => {},
  onBaseChosen: () => {},
  onEnterDashboard: () => {},
  onToggleWhitelist: () => {},
  onWhitelistAll: () => {},
  onDownloadMerged: () => undefined,
  handleBaseSnapshotChange: () => {},
  handleCompareSnapshotChange: () => {},
  // File upload defaults
  fileUpload: {
    pendingFiles: [],
    uploadedFiles: [],
    uploading: false,
    baseFile: null,
    handleFileSelection: () => {},
    handleRemoveFile: () => {},
    handleMarkAsBase: () => {},
    readJson: async () => ({
      account: { username: "", profile_url: "" },
      snapshots: [],
    }),
    normalizeSnapshot: (json) => json,
  },
  // Default snack values
  snack: { open: false, msg: "", severity: "success" },
  showSnack: () => {},
  hideSnack: () => {},
});

/**
 * Context provider for application state
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ui, setUI] = useState(initialUI);
  const [snack, setSnack] = useState<{
    open: boolean;
    msg: string;
    severity: "success" | "info" | "error";
  }>({ open: false, msg: "", severity: "success" });

  // File upload state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [baseFile, setBaseFile] = useState<File | null>(null);

  // Load prior merged base (optional) on mount
  useEffect(() => {
    const base = loadMerged();
    if (base) {
      setUI((p) => ({ ...p, base }));
    }
  }, []);

  // File upload handlers
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

  // Build dataset whenever base/snapshots change (but DO NOT auto-advance step)
  const rebuildDataset = useCallback(
    (
      base: LDGRJson | undefined,
      snaps: LDGRJson[],
      baseSnapshotIndex?: number,
      compareSnapshotIndex?: number
    ) => {
      // allow first-time users: dataset from snapshots alone
      if (snaps.length > 0)
        return buildDataset(
          base,
          snaps,
          baseSnapshotIndex,
          compareSnapshotIndex
        );
      // if only base with no snapshots, we still let them preview categories if you want
      // but per your request, show dashboard only after user clicks "Enter Dashboard"
      return undefined;
    },
    []
  );

  const setAndRebuild = useCallback(
    (next: Partial<UIState>) => {
      const base = (next.base ?? ui.base) as LDGRJson | undefined;
      const snaps = (next.snapshots ?? ui.snapshots) as LDGRJson[];
      const baseSnapshotIndex =
        next.baseSnapshotIndex !== undefined
          ? next.baseSnapshotIndex
          : ui.baseSnapshotIndex;
      const compareSnapshotIndex =
        next.compareSnapshotIndex !== undefined
          ? next.compareSnapshotIndex
          : ui.compareSnapshotIndex;

      const dataset = rebuildDataset(
        base,
        snaps,
        baseSnapshotIndex,
        compareSnapshotIndex
      );
      setUI((prev) => ({ ...prev, ...next, dataset }));
    },
    [
      ui.base,
      ui.snapshots,
      ui.baseSnapshotIndex,
      ui.compareSnapshotIndex,
      rebuildDataset,
    ]
  );

  // Handle snapshot selection changes
  const handleBaseSnapshotChange = useCallback(
    (index: number) => {
      setAndRebuild({
        baseSnapshotIndex: index,
        // If compareSnapshotIndex is not set or is the same as baseSnapshotIndex,
        // default to the next available snapshot or the previous one
        compareSnapshotIndex:
          ui.compareSnapshotIndex === undefined ||
          ui.compareSnapshotIndex === index
            ? index < ui.snapshots.length - 1
              ? index + 1
              : index - 1
            : ui.compareSnapshotIndex,
      });
    },
    [ui.compareSnapshotIndex, ui.snapshots.length, setAndRebuild]
  );

  const handleCompareSnapshotChange = useCallback(
    (index: number) => {
      setAndRebuild({ compareSnapshotIndex: index });
    },
    [setAndRebuild]
  );

  // Upload handlers
  const onFilesAdded = useCallback(
    (files: LDGRJson[]) => {
      if (files.length === 0) return;

      // Update snapshots state first
      const updatedSnapshots = [...ui.snapshots, ...files];

      setSnack({
        open: true,
        msg: `Loaded ${files.length} file(s)`,
        severity: "success",
      });

      // Make sure to rebuild dataset with the updated snapshots
      const dataset = rebuildDataset(ui.base, updatedSnapshots);

      // Update UI state with both the new snapshots and dataset
      setUI((prevUI) => ({
        ...prevUI,
        snapshots: updatedSnapshots,
        dataset,
      }));
    },
    [ui.snapshots, ui.base, rebuildDataset]
  );

  const onBaseChosen = useCallback(
    (file: LDGRJson) => {
      setSnack({
        open: true,
        msg: `Base set: @${file.account?.username ?? "unknown"}`,
        severity: "success",
      });
      setAndRebuild({ base: file });
    },
    [setAndRebuild]
  );

  const onEnterDashboard = useCallback(() => {
    if (!ui.snapshots.length) {
      setSnack({
        open: true,
        msg: "Add at least one snapshot to continue.",
        severity: "info",
      });
      return;
    }

    // If we have multiple snapshots, default to comparing the earliest with the latest
    let baseSnapshotIndex = undefined;
    let compareSnapshotIndex = undefined;

    if (ui.snapshots.length > 1) {
      baseSnapshotIndex = 0; // Oldest snapshot
      compareSnapshotIndex = ui.snapshots.length - 1; // Latest snapshot
    }

    // Rebuild dataset with snapshot indices
    const dataset = rebuildDataset(
      ui.base,
      ui.snapshots,
      baseSnapshotIndex,
      compareSnapshotIndex
    );

    // Switch to dashboard with snapshot comparison
    setUI((p) => ({
      ...p,
      step: "dashboard",
      baseSnapshotIndex,
      compareSnapshotIndex,
      dataset,
    }));
  }, [ui.snapshots, ui.base, rebuildDataset]);

  const onToggleWhitelist = useCallback((u: BasicUser) => {
    if (!ui.dataset) return;

    setUI((prevUI) => {
      if (!prevUI.dataset) return prevUI;

      const dataset = { ...prevUI.dataset } as Dataset;
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

  const onWhitelistAll = useCallback(
    (filteredUsers: BasicUser[]) => {
      if (!ui.dataset) return;

      // Get all currently filtered users
      filteredUsers.forEach((user) => {
        if (!user.whitelisted) {
          onToggleWhitelist(user);
        }
      });

      setSnack({
        open: true,
        msg: `Whitelisted ${
          filteredUsers.filter((u) => !u.whitelisted).length
        } users`,
        severity: "success",
      });
    },
    [ui.dataset, onToggleWhitelist]
  );

  const onDownloadMerged = useCallback((): LDGRJson | undefined => {
    if (!ui.dataset) return;

    const merged: LDGRJson = {
      account: ui.dataset.account,
      snapshots: ui.dataset.mergedSnapshots,
      enriched_at: new Date().toISOString(),
      schema: { version: 1 },
    };

    saveMerged(merged);
    return merged;
  }, [ui.dataset]);

  const value = {
    ui,
    setUI,
    setAndRebuild,
    onFilesAdded,
    onBaseChosen,
    onEnterDashboard,
    onToggleWhitelist,
    onWhitelistAll,
    onDownloadMerged,
    handleBaseSnapshotChange,
    handleCompareSnapshotChange,
    // File upload state and handlers
    fileUpload: {
      pendingFiles,
      uploadedFiles,
      uploading,
      baseFile,
      handleFileSelection,
      handleRemoveFile,
      handleMarkAsBase,
      readJson,
      normalizeSnapshot,
    },
    // Snack state and functions
    snack,
    showSnack: (
      msg: string,
      severity: "success" | "info" | "error" = "success"
    ) => {
      setSnack({ open: true, msg, severity });
    },
    hideSnack: () => setSnack((prev) => ({ ...prev, open: false })),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/**
 * Hook to access the application context
 */
export const useAppContext = () => useContext(AppContext);

/**
 * Hook for managing filtering and sorting users
 */
export const useUserFiltering = (
  dataset: Dataset | undefined,
  category: CategoryKey,
  filters: {
    search: string;
    verified: string;
    privacy: string;
    whitelist: string;
    sort: string;
  }
) => {
  // Get raw items from the selected category
  const itemsRaw = dataset ? getCategoryArray(dataset, category) : [];

  // Apply filters
  const filtered = itemsRaw.filter((u: BasicUser) => {
    const uname = (u.username || "").toLowerCase();
    const fname = (u.full_name ?? "").toLowerCase();

    if (filters.verified === "verified" && !u.is_verified) return false;
    if (filters.verified === "notVerified" && u.is_verified) return false;

    if (filters.privacy === "private" && !u.is_private) return false;
    if (filters.privacy === "public" && u.is_private) return false;

    if (filters.whitelist === "only" && !u.whitelisted) return false;
    if (filters.whitelist === "exclude" && u.whitelisted) return false;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!uname.includes(q) && !fname.includes(q)) return false;
    }

    return true;
  });

  // chronological indices for sorting
  const lastSnap = dataset?.mergedSnapshots[dataset.mergedSnapshots.length - 1];
  const orderIndexNewest =
    filters.sort === "chronoNewest"
      ? latestOrderIndexFrom(
          lastSnap,
          category === "following" || category === "notFollowingBack"
            ? "following"
            : "followers"
        )
      : undefined;

  // Sort the filtered results
  let sorted = filtered;
  if (dataset) {
    sorted = sortUsers(sorted, filters.sort as SortMode, orderIndexNewest);
  }

  return {
    filtered,
    sorted,
    showAlphaHeaders: filters.sort === "alpha" || filters.sort === "alphaDesc",
    getAlphaHeader: (u: BasicUser) => alphaHeader(u.username),
  };
};

export default AppContext;
