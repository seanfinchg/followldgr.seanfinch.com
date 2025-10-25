import React, { useState } from "react";
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import type { Snapshot, BasicUser } from "../types";

// Helper function to calculate order index statistics
type OrderStats = {
  min: number;
  max: number;
  avg: number;
  median: number;
  recentCount: number; // Count of users with order_index < 100
};

function calculateOrderStats(users?: BasicUser[]): OrderStats | undefined {
  if (!users || users.length === 0) return undefined;

  const orderIndices = users
    .map((user) => user.order_index)
    .filter((index): index is number => index !== undefined);

  if (orderIndices.length === 0) return undefined;

  // Sort for calculations
  const sorted = [...orderIndices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = sum / sorted.length;

  // Calculate median
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  // Count recent users (order_index < 100)
  const recentCount = sorted.filter((index) => index < 100).length;

  return { min, max, avg, median, recentCount };
}

/**
 * Enhanced trend chart with order index statistics.
 */
export default function TrendChart({ snaps }: { snaps: Snapshot[] }) {
  const [viewMode, setViewMode] = useState<"trend" | "order" | "stats">(
    "trend"
  );

  if (!snaps.length) return null;

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: "trend" | "order" | "stats" | null
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const data = snaps.map((s) => ({
    t: new Date(s.timestamp).getTime(),
    date: new Date(s.timestamp).toLocaleDateString(),
    followers: s.followers?.length || 0,
    following: s.following?.length || 0,
    diff: (s.followers?.length || 0) - (s.following?.length || 0),
    // Calculate order index statistics
    followerOrderStats: calculateOrderStats(s.followers),
    followingOrderStats: calculateOrderStats(s.following),
  }));

  const minT = Math.min(...data.map((d) => d.t));
  const maxT = Math.max(...data.map((d) => d.t));
  const minY = Math.min(...data.map((d) => Math.min(d.followers, d.following)));
  const maxY = Math.max(...data.map((d) => Math.max(d.followers, d.following)));
  const paddingY = Math.max(10, Math.floor((maxY - minY) * 0.1)); // Add 10% padding

  const W = 1000; // Increased width
  const H = 350; // Increased height
  const P = 40; // Increased padding

  const x = (t: number) =>
    P + ((t - minT) / Math.max(1, maxT - minT)) * (W - 2 * P);
  const y = (v: number) =>
    H -
    P -
    ((v - (minY - paddingY)) /
      Math.max(1, maxY + paddingY - (minY - paddingY))) *
      (H - 2 * P);

  const path = (key: "followers" | "following") =>
    data
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${x(d.t).toFixed(2)} ${y(d[key]).toFixed(2)}`
      )
      .join(" ");

  // Calculate growth rates
  const firstEntry = data[0];
  const lastEntry = data[data.length - 1];
  const followerGrowth = lastEntry.followers - firstEntry.followers;
  const followingGrowth = lastEntry.following - firstEntry.following;
  const followerGrowthPct = firstEntry.followers
    ? ((followerGrowth / firstEntry.followers) * 100).toFixed(1)
    : "0";
  const followingGrowthPct = firstEntry.following
    ? ((followingGrowth / firstEntry.following) * 100).toFixed(1)
    : "0";

  // Render stats view
  const renderStatsView = () => (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
        }}
      >
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Follower Growth
            </Typography>
            <Typography
              variant="h4"
              color={followerGrowth >= 0 ? "success.main" : "error.main"}
            >
              {followerGrowth >= 0 ? "+" : ""}
              {followerGrowth} ({followerGrowthPct}%)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              From {firstEntry.followers} to {lastEntry.followers} followers
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Following Growth
            </Typography>
            <Typography
              variant="h4"
              color={followingGrowth >= 0 ? "success.main" : "error.main"}
            >
              {followingGrowth >= 0 ? "+" : ""}
              {followingGrowth} ({followingGrowthPct}%)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              From {firstEntry.following} to {lastEntry.following} following
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Recent Followers Analysis
            </Typography>
            <Box
              sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 2, md: 3 } }}
            >
              <Box sx={{ minWidth: "120px" }}>
                <Typography variant="body2" color="text.secondary">
                  Lowest Order Index
                </Typography>
                <Typography variant="h6">
                  {lastEntry.followerOrderStats?.min ?? "N/A"}
                </Typography>
              </Box>
              <Box sx={{ minWidth: "120px" }}>
                <Typography variant="body2" color="text.secondary">
                  Average Order Index
                </Typography>
                <Typography variant="h6">
                  {lastEntry.followerOrderStats?.avg.toFixed(1) ?? "N/A"}
                </Typography>
              </Box>
              <Box sx={{ minWidth: "120px" }}>
                <Typography variant="body2" color="text.secondary">
                  Recent Followers
                </Typography>
                <Typography variant="h6">
                  {lastEntry.followerOrderStats?.recentCount ?? "N/A"}
                </Typography>
              </Box>
              <Box sx={{ minWidth: "120px" }}>
                <Typography variant="body2" color="text.secondary">
                  Median Order
                </Typography>
                <Typography variant="h6">
                  {lastEntry.followerOrderStats?.median.toFixed(0) ?? "N/A"}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  // Render order analysis view
  const renderOrderView = () => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        Order Index Interpretation
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Lower order indices mean more recent followers/following. Here's how
        your account's order indices are distributed:
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
        }}
      >
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1">Follower Recency</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {lastEntry.followerOrderStats?.recentCount ?? 0} of your followers
              have an order index below 100, indicating they followed you
              relatively recently.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Most Recent
                </Typography>
                <Typography variant="body2">
                  Index: {lastEntry.followerOrderStats?.min ?? "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Least Recent
                </Typography>
                <Typography variant="body2">
                  Index: {lastEntry.followerOrderStats?.max ?? "N/A"}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1">Following Recency</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {lastEntry.followingOrderStats?.recentCount ?? 0} of the people
              you follow have an order index below 100, indicating you followed
              them relatively recently.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Most Recent
                </Typography>
                <Typography variant="body2">
                  Index: {lastEntry.followingOrderStats?.min ?? "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Least Recent
                </Typography>
                <Typography variant="body2">
                  Index: {lastEntry.followingOrderStats?.max ?? "N/A"}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  // Render trend chart
  const renderTrendChart = () => (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* background */}
      <rect x="0" y="0" width={W} height={H} fill="none" />

      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <React.Fragment key={p}>
          <line
            x1={P}
            x2={W - P}
            y1={P + p * (H - 2 * P)}
            y2={P + p * (H - 2 * P)}
            stroke="currentColor"
            opacity="0.1"
            strokeDasharray={p === 0.5 ? "4 4" : ""}
            strokeWidth="1.5"
          />
          {p > 0 && p < 1 && (
            <text
              x={P - 8}
              y={P + p * (H - 2 * P)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="12"
              opacity="0.7"
            >
              {Math.round(minY + (1 - p) * (maxY - minY))}
            </text>
          )}
        </React.Fragment>
      ))}

      {/* Vertical gridlines */}
      {data.map((d, i) => (
        <line
          key={`vgrid-${i}`}
          x1={x(d.t)}
          x2={x(d.t)}
          y1={P}
          y2={H - P}
          stroke="currentColor"
          opacity="0.05"
          strokeWidth="1"
        />
      ))}

      {/* Date markers */}
      {data.length > 1 &&
        data.map((d, i) => (
          <g key={i}>
            <line
              x1={x(d.t)}
              x2={x(d.t)}
              y1={H - P}
              y2={H - P + 5}
              stroke="currentColor"
              opacity="0.5"
            />
            <text
              x={x(d.t)}
              y={H - P + 18}
              textAnchor="middle"
              fontSize="11"
              opacity="0.8"
              transform={`rotate(30, ${x(d.t)}, ${H - P + 18})`}
            >
              {d.date}
            </text>
          </g>
        ))}

      {/* Add area under the followers line */}
      <path
        d={`${path("followers")} L ${x(data[data.length - 1].t)} ${y(
          minY - paddingY
        )} L ${x(data[0].t)} ${y(minY - paddingY)} Z`}
        fill="#10b981" // Green
        opacity="0.08"
      />

      {/* Add area under the following line */}
      <path
        d={`${path("following")} L ${x(data[data.length - 1].t)} ${y(
          minY - paddingY
        )} L ${x(data[0].t)} ${y(minY - paddingY)} Z`}
        fill="#3b82f6" // Blue
        opacity="0.05"
      />

      {/* following */}
      <path
        d={path("following")}
        fill="none"
        stroke="#3b82f6" // Blue
        strokeWidth="3"
        opacity="0.9"
      />

      {/* followers */}
      <path
        d={path("followers")}
        fill="none"
        stroke="#10b981" // Green
        strokeWidth="3"
        opacity="0.9"
      />

      {/* data points with hover effects */}
      {data.map((d, i) => (
        <g key={i}>
          <circle
            cx={x(d.t)}
            cy={y(d.following)}
            r="5"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="1.5"
            opacity="0.9"
          >
            <title>
              Following: {d.following} on {d.date}
            </title>
          </circle>
          <circle
            cx={x(d.t)}
            cy={y(d.followers)}
            r="5"
            fill="#10b981"
            stroke="white"
            strokeWidth="1.5"
            opacity="0.9"
          >
            <title>
              Followers: {d.followers} on {d.date}
            </title>
          </circle>
        </g>
      ))}

      {/* Annotations for points */}
      {data.map((d, i) => (
        <g key={`label-${i}`}>
          <text
            x={x(d.t)}
            y={y(d.followers) - 12}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#10b981"
          >
            {d.followers}
          </text>
          <text
            x={x(d.t)}
            y={y(d.following) - 12}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#3b82f6"
          >
            {d.following}
          </text>
        </g>
      ))}

      {/* legend */}
      <g transform={`translate(${P}, ${P - 14})`} fontSize="14">
        <rect width="16" height="4" fill="#10b981" />
        <text
          x="22"
          y="4"
          alignmentBaseline="middle"
          fontWeight="500"
          opacity="0.9"
        >
          Followers ({lastEntry.followers.toLocaleString()})
        </text>
        <g transform="translate(220,0)">
          <rect width="16" height="4" fill="#3b82f6" />
          <text
            x="22"
            y="4"
            alignmentBaseline="middle"
            fontWeight="500"
            opacity="0.9"
          >
            Following ({lastEntry.following.toLocaleString()})
          </text>
        </g>
        <g transform="translate(440,0)">
          <text alignmentBaseline="middle" fontWeight="500" opacity="0.9">
            Net:{" "}
            <tspan
              fontWeight="600"
              fill={lastEntry.diff >= 0 ? "#3b82f6" : "#f97316"}
            >
              {lastEntry.diff >= 0 ? "+" : ""}
              {lastEntry.diff}
            </tspan>
          </text>
        </g>
      </g>
    </svg>
  );

  // Render trend view with summary data
  const renderTrendView = () => (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-semibold text-lg">
          Follower & Following Trends
        </span>
        <div className="flex gap-6">
          <div className="flex flex-col text-base">
            <span className="font-medium">Followers</span>
            <span
              className={`font-medium ${
                followerGrowth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {followerGrowth >= 0 ? "+" : ""}
              {followerGrowth} ({followerGrowthPct}%)
            </span>
          </div>
          <div className="flex flex-col text-base">
            <span className="font-medium">Following</span>
            <span
              className={`font-medium ${
                followingGrowth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {followingGrowth >= 0 ? "+" : ""}
              {followingGrowth} ({followingGrowthPct}%)
            </span>
          </div>
          <div className="flex flex-col text-base">
            <span className="font-medium">Net</span>
            <span
              className={`font-medium ${
                lastEntry.diff >= 0 ? "text-blue-600" : "text-orange-600"
              }`}
            >
              {lastEntry.diff}
            </span>
          </div>
        </div>
      </div>

      {renderTrendChart()}
    </div>
  );

  return (
    <div className="rounded-lg bg-white p-6 shadow-md ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800 mb-5">
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" component="h2">
          Follower & Following Analytics
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          size="small"
        >
          <ToggleButton value="trend">Trend Chart</ToggleButton>
          <ToggleButton value="order">Order Analysis</ToggleButton>
          <ToggleButton value="stats">Statistics</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === "stats" && renderStatsView()}
      {viewMode === "order" && renderOrderView()}
      {viewMode === "trend" && renderTrendView()}
    </div>
  );
}
