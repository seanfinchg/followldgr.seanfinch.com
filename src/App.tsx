import React from "react";
import { Container, Box, Paper, CssBaseline } from "@mui/material";
import { CssVarsProvider, extendTheme } from "@mui/material/styles";
import { AppProvider, useAppContext } from "./context/AppContext";
import CustomSnackbar from "./components/shared/Snackbar";
import { GridContainer, GridItem } from "./components/shared/GridWrapper";

import Header from "./components/Header";
import UploadPanel from "./components/UploadPanel";
import Sidebar from "./components/Sidebar";
import Controls from "./components/Controls";
import UserList from "./components/UserList";
import EnhancedTrendChart from "./components/EnhancedTrendChart";
import OrderStatsSummary from "./components/OrderStatsSummary";

import type {
  BasicUser,
  CategoryKey,
  LDGRJson,
  UIState,
  SortMode,
  VerifiedFilter,
  PrivacyFilter,
  WhitelistFilter,
} from "./types";
import {
  buildDataset,
  getCategoryArray,
  latestOrderIndexFrom,
  sortUsers,
} from "./lib/merge";
import { alphaHeader, clamp } from "./lib/utils";
import { loadMerged, saveMerged } from "./lib/storage";

// ===== Material You theme =====
const theme = extendTheme({
  colorSchemes: { light: true, dark: true },
  shape: { borderRadius: 8 }, // Reduced from 20 to make corners less rounded
  typography: {
    fontFamily: `"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif`,
  },
});

// Step type is now imported from AppContext

// Using initialUI from AppContext

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

// The actual app content, now using the context
function AppContent() {
  // Use the AppContext now instead of local state
  const { ui, setUI, showSnack } = useAppContext();

  // Load prior merged base (optional) on mount
  React.useEffect(() => {
    const base = loadMerged();
    if (base) {
      setUI((p) => ({ ...p, base }));
    }
  }, []);

  // Build dataset whenever base/snapshots change (but DO NOT auto-advance step)
  const rebuildDataset = React.useCallback(
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
      // if only base with no snapshots, we still let them preview categories if you want — but per your request, show dashboard only after user clicks "Enter Dashboard"
      return undefined;
    },
    []
  );

  const setAndRebuild = (next: Partial<UIState>) => {
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
  };

  // Handle snapshot selection changes
  const handleBaseSnapshotChange = (index: number) => {
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
  };

  const handleCompareSnapshotChange = (index: number) => {
    setAndRebuild({ compareSnapshotIndex: index });
  };

  // Upload handlers
  const onFilesAdded = (files: LDGRJson[]) => {
    if (files.length === 0) return;

    // Update snapshots state first
    const updatedSnapshots = [...ui.snapshots, ...files];

    // Partition: if a file has enriched flags/aliases, consider it a "base" candidate; otherwise treat as snapshot.
    // Simpler: let user mark base inside UploadPanel; here we just accept arrays.
    // We always merge into snapshots unless UploadPanel marks exactly one as base.
    showSnack(`Loaded ${files.length} file(s)`, "success");

    // Make sure to rebuild dataset with the updated snapshots
    const dataset = rebuildDataset(ui.base, updatedSnapshots);

    // Update UI state with both the new snapshots and dataset
    setUI((prevUI) => ({
      ...prevUI,
      snapshots: updatedSnapshots,
      dataset,
    }));
  };

  const onBaseChosen = (file: LDGRJson) => {
    showSnack(`Base set: @${file.account?.username ?? "unknown"}`, "success");
    setAndRebuild({ base: file });
  };

  const onEnterDashboard = () => {
    if (!ui.snapshots.length) {
      showSnack("Add at least one snapshot to continue.", "info");
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
  };

  const onToggleWhitelist = (u: BasicUser) => {
    if (!ui.dataset) return;
    const flip = !u.whitelisted;
    const apply = (m: Map<string, BasicUser>) => {
      const key = (u.username || "").toLowerCase();
      const v = m.get(key);
      if (v) m.set(key, { ...v, whitelisted: flip });
    };
    apply(ui.dataset.latestFollowers);
    apply(ui.dataset.latestFollowing);
    apply(ui.dataset.mutuals);
    apply(ui.dataset.notFollowingBack);
    apply(ui.dataset.iDontFollowBack);
    setUI({ ...ui });
  };

  // New function to whitelist all currently filtered users
  const onWhitelistAll = () => {
    if (!ui.dataset) return;

    // Get all currently filtered users
    filtered.forEach((user) => {
      if (!user.whitelisted) {
        onToggleWhitelist(user);
      }
    });

    showSnack(
      `Whitelisted ${filtered.filter((u) => !u.whitelisted).length} users`,
      "success"
    );
  };

  const onDownloadMerged = (): LDGRJson | undefined => {
    if (!ui.dataset) return;
    const merged: LDGRJson = {
      account: ui.dataset.account,
      snapshots: ui.dataset.mergedSnapshots,
      enriched_at: new Date().toISOString(),
      schema: { version: 1 },
    };
    saveMerged(merged);
    return merged;
  };

  // === derive counts (for sidebar labels) ===
  const ds = ui.dataset;
  const counts: Record<CategoryKey, number> = {
    followers: ds ? ds.latestFollowers.size : 0,
    following: ds ? ds.latestFollowing.size : 0,
    mutuals: ds ? ds.mutuals.size : 0,
    notFollowingBack: ds ? ds.notFollowingBack.size : 0,
    iDontFollowBack: ds ? ds.iDontFollowBack.size : 0,
    lostFollowers:
      ds && ds.selectedComparison
        ? ds.selectedComparison.lostFollowers.length
        : ds
        ? ds.lostFollowers.length
        : 0,
    unfollowed:
      ds && ds.selectedComparison
        ? ds.selectedComparison.unfollowed.length
        : ds
        ? ds.unfollowed.length
        : 0,
    newFollowers:
      ds && ds.selectedComparison
        ? ds.selectedComparison.newFollowers.length
        : 0,
    newFollowing:
      ds && ds.selectedComparison
        ? ds.selectedComparison.newFollowing.length
        : 0,
  };

  // === filtering & sorting ===
  const itemsRaw = ds ? getCategoryArray(ds, ui.category) : [];
  const filtered = itemsRaw.filter((u) => {
    const uname = (u.username || "").toLowerCase();
    const fname = (u.full_name ?? "").toLowerCase();

    if (ui.verified === "verified" && !u.is_verified) return false;
    if (ui.verified === "notVerified" && u.is_verified) return false;

    if (ui.privacy === "private" && !u.is_private) return false;
    if (ui.privacy === "public" && u.is_private) return false;

    if (ui.whitelist === "only" && !u.whitelisted) return false;
    if (ui.whitelist === "exclude" && u.whitelisted) return false;

    if (ui.search) {
      const q = ui.search.toLowerCase();
      if (!uname.includes(q) && !fname.includes(q)) return false;
    }
    return true;
  });

  // chronological indices for sorting:
  const lastSnap = ds?.mergedSnapshots[ds.mergedSnapshots.length - 1];
  const orderIndexNewest =
    ui.sort === "chronoNewest"
      ? latestOrderIndexFrom(
          lastSnap,
          ui.category === "following" || ui.category === "notFollowingBack"
            ? "following"
            : "followers"
        )
      : undefined;

  let sorted = filtered;
  if (ds) {
    sorted = sortUsers(filtered, ui.sort as SortMode, orderIndexNewest);
  }

  const alphaHeaders = ui.sort === "alpha" || ui.sort === "alphaDesc";

  return (
    <CssVarsProvider theme={theme}>
      <CssBaseline />

      <Header
        username={ds?.account.username}
        onDownloadMerged={onDownloadMerged}
        canDownload={!!ds}
      />

      {/* UPLOAD STEP */}
      {ui.step === "upload" && (
        <Container maxWidth="md">
          <Box mt={10}>
            <UploadPanel
              onAddFiles={onFilesAdded}
              onSetBase={onBaseChosen}
              onEnterDashboard={onEnterDashboard}
              hasSnapshot={ui.snapshots.length > 0}
              hasBase={!!ui.base}
            />
          </Box>
        </Container>
      )}

      {/* DASHBOARD STEP */}
      {ui.step === "dashboard" && ds && (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              borderRadius: 4,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <GridContainer spacing={3}>
              {/* Sidebar even wider */}
              <GridItem xs={12} lg={5} xl={4}>
                <Sidebar
                  visible={!!ds}
                  category={ui.category}
                  counts={counts}
                  totalLabel={`${sorted.length.toLocaleString()} users`}
                  onCategory={(c) =>
                    setUI({ ...ui, category: c as CategoryKey, page: 1 })
                  }
                  search={ui.search}
                  onSearch={(v) => setUI({ ...ui, search: v, page: 1 })}
                  verified={ui.verified as VerifiedFilter}
                  onVerified={(v) =>
                    setUI({ ...ui, verified: v as VerifiedFilter, page: 1 })
                  }
                  privacy={ui.privacy as PrivacyFilter}
                  onPrivacy={(v) =>
                    setUI({ ...ui, privacy: v as PrivacyFilter, page: 1 })
                  }
                  whitelist={ui.whitelist as WhitelistFilter}
                  onWhitelist={(v) =>
                    setUI({ ...ui, whitelist: v as WhitelistFilter, page: 1 })
                  }
                  showTrend={ui.showTrend}
                  onToggleTrend={() =>
                    setUI({ ...ui, showTrend: !ui.showTrend })
                  }
                  disableWhitelist={
                    !(
                      ui.category === "notFollowingBack" ||
                      ui.category === "iDontFollowBack"
                    )
                  }
                  onWhitelistAll={
                    (ui.category === "notFollowingBack" ||
                      ui.category === "iDontFollowBack") &&
                    filtered.length > 0
                      ? onWhitelistAll
                      : undefined
                  }
                  dataset={ds}
                />
              </GridItem>

              <GridItem xs={12} lg={7} xl={8}>
                {ui.showTrend && (
                  <EnhancedTrendChart snaps={ds.mergedSnapshots} />
                )}
                <OrderStatsSummary
                  snapshots={ds.mergedSnapshots}
                  type={
                    ui.category === "following" ||
                    ui.category === "notFollowingBack" ||
                    ui.category === "newFollowing"
                      ? "following"
                      : "followers"
                  }
                />
                <Controls
                  sort={ui.sort as SortMode}
                  onSort={(s) => setUI({ ...ui, sort: s, page: 1 })}
                  page={ui.page}
                  onPage={(p) =>
                    setUI({
                      ...ui,
                      page: clamp(
                        p,
                        1,
                        Math.max(1, Math.ceil(sorted.length / ui.pageSize))
                      ),
                    })
                  }
                  pageSize={ui.pageSize}
                  onPageSize={(n) =>
                    setUI({ ...ui, pageSize: clamp(n || 10, 10, 500), page: 1 })
                  }
                  total={sorted.length}
                  snapshots={ds.mergedSnapshots}
                  baseSnapshotIndex={ui.baseSnapshotIndex}
                  compareSnapshotIndex={ui.compareSnapshotIndex}
                  onBaseSnapshotChange={handleBaseSnapshotChange}
                  onCompareSnapshotChange={handleCompareSnapshotChange}
                />
                <UserList
                  users={sorted}
                  category={ui.category}
                  page={ui.page}
                  pageSize={ui.pageSize}
                  sort={ui.sort as SortMode}
                  alphaHeaders={alphaHeaders}
                  alphaOf={(u) => alphaHeader(u.username)}
                  onToggleWhitelist={onToggleWhitelist}
                />
              </GridItem>
            </GridContainer>
          </Paper>
        </Container>
      )}

      <CustomSnackbar />
    </CssVarsProvider>
  );
}
