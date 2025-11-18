import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { InsertChart, People } from "@mui/icons-material";
import { useState } from "react";
import type { Snapshot } from "../types";

/* order-index stats removed from the UI (backend-only)
   kept the component to show a lightweight, non-index summary */

type OrderStatsSummaryProps = {
  snapshots: Snapshot[];
  type: "followers" | "following";
};

export default function OrderStatsSummary({
  snapshots,
  type,
}: OrderStatsSummaryProps) {
  if (!snapshots.length) return null;

  // Get the latest snapshot
  const latestSnapshot = snapshots[snapshots.length - 1];
  const userList =
    type === "followers" ? latestSnapshot.followers : latestSnapshot.following;

  if (!userList || userList.length === 0) return null;

  // The UI should not expose order indices (backend-only). Show a minimal
  //, non-order-based summary instead.
  const totalCount = userList.length;
  const title = type === "followers" ? "Followers" : "Following";

  const [open, setOpen] = useState(false);

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <People color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">{title} Summary</Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            A lightweight summary — index/order statistics are hidden because
            they are backend-only metrics.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Chip
              icon={<People />}
              label={`Total: ${totalCount}`}
              variant="outlined"
            />
            <Chip
              icon={<InsertChart />}
              label={`Snapshots: ${snapshots.length}`}
              variant="outlined"
              onClick={() => setOpen(true)}
              sx={{ cursor: "pointer" }}
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Snapshots ({snapshots.length})</DialogTitle>
        <DialogContent>
          <List>
            {snapshots.map((s, i) => (
              <ListItem key={`snap-${i}`} divider>
                <ListItemText
                  primary={new Date(s.timestamp).toLocaleString()}
                  secondary={`Followers: ${
                    s.followers?.length ?? 0
                  } • Following: ${s.following?.length ?? 0}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}
