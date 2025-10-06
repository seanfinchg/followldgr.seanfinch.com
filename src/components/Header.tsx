import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

import type { LDGRJson } from "../types";

type Props = {
  username?: string;
  onDownloadMerged: () => LDGRJson | undefined;
  canDownload: boolean;
};

export default function Header({
  username,
  onDownloadMerged,
  canDownload,
}: Props) {
  const handleDownload = () => {
    const data = onDownloadMerged();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `followldgr_merged_${
      data.account.username
    }_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <AppBar position="sticky" color="primary" elevation={2}>
      <Toolbar
        sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          📊 FollowLDGR {username ? `— @${username}` : ""}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={handleDownload}
            disabled={!canDownload}
            startIcon={<DownloadIcon />}
            variant="contained"
            color="secondary"
          >
            Download merged/base JSON
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
