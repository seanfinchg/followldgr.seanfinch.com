import { Container, Box, Paper, CssBaseline } from "@mui/material";
import { CssVarsProvider, extendTheme } from "@mui/material/styles";
import {
  AppProvider,
  useAppContext,
  useUserFiltering,
} from "./context/AppContext";
import CustomSnackbar from "./components/shared/Snackbar";
import { GridContainer, GridItem } from "./components/shared/GridWrapper";

import Header from "./components/Header";
import UploadPanel from "./components/UploadPanel";
import Sidebar from "./components/Sidebar";
import Controls from "./components/Controls";
import UserList from "./components/UserList";
import TrendChart from "./components/TrendChart";
import OrderStatsSummary from "./components/OrderStatsSummary";

import type { CategoryKey } from "./types";
import { clamp } from "./lib/utils";

// ===== Material You theme =====
const theme = extendTheme({
  colorSchemes: { light: true, dark: true },
  shape: { borderRadius: 8 }, // Reduced from 20 to make corners less rounded
  typography: {
    fontFamily: `"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif`,
  },
});

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

// The actual app content, now using the context
function AppContent() {
  const {
    ui,
    setUI,
    onToggleWhitelist,
    onWhitelistAll,
    onDownloadMerged,
    handleBaseSnapshotChange,
    handleCompareSnapshotChange,
  } = useAppContext();

  // Get filtered and sorted users using the useUserFiltering hook
  const { sorted, showAlphaHeaders, getAlphaHeader } = useUserFiltering(
    ui.dataset,
    ui.category,
    {
      search: ui.search,
      verified: ui.verified,
      privacy: ui.privacy,
      whitelist: ui.whitelist,
      sort: ui.sort,
    }
  );

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
                  verified={ui.verified}
                  onVerified={(v) => setUI({ ...ui, verified: v, page: 1 })}
                  privacy={ui.privacy}
                  onPrivacy={(v) => setUI({ ...ui, privacy: v, page: 1 })}
                  whitelist={ui.whitelist}
                  onWhitelist={(v) => setUI({ ...ui, whitelist: v, page: 1 })}
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
                    sorted.length > 0
                      ? () => onWhitelistAll(sorted)
                      : undefined
                  }
                  dataset={ds}
                />
              </GridItem>

              <GridItem xs={12} lg={7} xl={8}>
                {ui.showTrend && <TrendChart snaps={ds.mergedSnapshots} />}
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
                  sort={ui.sort}
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
                  sort={ui.sort}
                  alphaHeaders={showAlphaHeaders}
                  alphaOf={(u) => getAlphaHeader(u)}
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
