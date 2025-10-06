import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Tooltip,
} from "@mui/material";
import { AccessTime, InsertChart, Insights, People } from "@mui/icons-material";
import type { Snapshot } from "../types";

type Stats = {
  mostRecent: number;
  leastRecent: number;
  avg: number;
  recentCount: number;
  totalCount: number;
};

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

  // Calculate stats based on order_index
  const orderIndices = userList
    .map((user) => user.order_index)
    .filter((index): index is number => index !== undefined);

  if (orderIndices.length === 0) return null;

  // Sort for calculations
  const sorted = [...orderIndices].sort((a, b) => a - b);
  const mostRecent = sorted[0]; // Lowest index = most recent
  const leastRecent = sorted[sorted.length - 1]; // Highest index = least recent
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = sum / sorted.length;
  const recentCount = sorted.filter((index) => index < 100).length;

  const stats: Stats = {
    mostRecent,
    leastRecent,
    avg,
    recentCount,
    totalCount: orderIndices.length,
  };

  const title = type === "followers" ? "Follower" : "Following";

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <People color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">{title} Order Statistics</Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Lower order indices indicate more recent {type}. This data helps you
          understand the chronology of your Instagram relationships.
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <Tooltip title="The lowest order index in your list - this is your most recent relationship">
            <Chip
              icon={<AccessTime />}
              label={`Most Recent: ${stats.mostRecent}`}
              color="primary"
              variant="outlined"
            />
          </Tooltip>

          <Tooltip title="The highest order index in your list - this is your oldest relationship">
            <Chip
              icon={<AccessTime />}
              label={`Oldest: ${stats.leastRecent}`}
              color="default"
              variant="outlined"
            />
          </Tooltip>

          <Tooltip title="The average order index across all relationships">
            <Chip
              icon={<InsertChart />}
              label={`Average Index: ${stats.avg.toFixed(1)}`}
              color="default"
              variant="outlined"
            />
          </Tooltip>

          <Tooltip title="Number of relationships with an order index under 100 (relatively recent)">
            <Chip
              icon={<Insights />}
              label={`Recent (< 100): ${stats.recentCount} of ${stats.totalCount}`}
              color="success"
              variant="outlined"
            />
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}
