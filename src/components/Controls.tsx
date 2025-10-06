import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Typography,
  FormGroup,
  FormLabel,
} from "@mui/material";
import type { SortMode, Snapshot } from "../types";

type Props = {
  sort: SortMode;
  onSort: (s: SortMode) => void;
  page: number;
  onPage: (p: number) => void;
  pageSize: number;
  onPageSize: (n: number) => void;
  total: number;
  snapshots?: Snapshot[];
  baseSnapshotIndex?: number;
  compareSnapshotIndex?: number;
  onBaseSnapshotChange?: (index: number) => void;
  onCompareSnapshotChange?: (index: number) => void;
};

export default function Controls({
  sort,
  onSort,
  page,
  onPage,
  pageSize,
  onPageSize,
  total,
  snapshots = [],
  baseSnapshotIndex,
  compareSnapshotIndex,
  onBaseSnapshotChange,
  onCompareSnapshotChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasSnapshots = snapshots.length > 0;
  const showSnapshotSelector =
    hasSnapshots && onBaseSnapshotChange && onCompareSnapshotChange;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
      <Box
        sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}
      >
        <FormControl size="medium" sx={{ minWidth: 280 }}>
          <InputLabel>Sort</InputLabel>
          <Select<SortMode>
            value={sort}
            label="Sort"
            onChange={(e) => onSort(e.target.value as SortMode)}
          >
            <MenuItem value="chronoNewest">
              Chronological — Newest first (Low Index)
            </MenuItem>
            <MenuItem value="chrono">
              Chronological — Oldest first (High Index)
            </MenuItem>
            <MenuItem value="alpha">Alphabetical A–Z</MenuItem>
            <MenuItem value="alphaDesc">Alphabetical Z–A</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="medium" sx={{ minWidth: 180 }}>
          <InputLabel>Per page</InputLabel>
          <Select<number>
            value={pageSize}
            label="Per page"
            onChange={(e) => onPageSize(Number(e.target.value))}
          >
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
            <MenuItem value={200}>200</MenuItem>
          </Select>
        </FormControl>

        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ fontWeight: 800 }}
        >
          {total.toLocaleString()} users
        </Typography>
      </Box>

      {showSnapshotSelector && (
        <Box
          sx={{
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
            p: 2,
            bgcolor: "rgba(0,0,0,0.02)",
            borderRadius: 1,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <FormGroup>
            <FormLabel sx={{ mb: 1, fontWeight: "bold" }}>
              Compare Snapshots
            </FormLabel>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Base Snapshot</InputLabel>
                <Select
                  value={
                    baseSnapshotIndex !== undefined ? baseSnapshotIndex : ""
                  }
                  label="Base Snapshot"
                  onChange={(e) => onBaseSnapshotChange(Number(e.target.value))}
                >
                  {snapshots.map((snapshot, index) => (
                    <MenuItem key={`base-${index}`} value={index}>
                      {new Date(snapshot.timestamp).toLocaleDateString()}
                      {index === 0
                        ? " (Oldest)"
                        : index === snapshots.length - 1
                        ? " (Latest)"
                        : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="body2" sx={{ mx: 1 }}>
                ➡️
              </Typography>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Compare Snapshot</InputLabel>
                <Select
                  value={
                    compareSnapshotIndex !== undefined
                      ? compareSnapshotIndex
                      : ""
                  }
                  label="Compare Snapshot"
                  onChange={(e) =>
                    onCompareSnapshotChange(Number(e.target.value))
                  }
                >
                  {snapshots.map((snapshot, index) => (
                    <MenuItem key={`compare-${index}`} value={index}>
                      {new Date(snapshot.timestamp).toLocaleDateString()}
                      {index === 0
                        ? " (Oldest)"
                        : index === snapshots.length - 1
                        ? " (Latest)"
                        : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </FormGroup>

          {baseSnapshotIndex !== undefined &&
            compareSnapshotIndex !== undefined && (
              <Typography
                variant="body2"
                sx={{ alignSelf: "center", color: "text.secondary" }}
              >
                Comparing data from{" "}
                {baseSnapshotIndex < compareSnapshotIndex
                  ? "earlier to later"
                  : "later to earlier"}{" "}
                snapshot
              </Typography>
            )}
        </Box>
      )}

      <Pagination
        count={totalPages}
        page={page}
        onChange={(_, val) => onPage(val)}
        shape="rounded"
        size="medium"
        sx={{ alignSelf: "flex-start" }}
      />
    </Box>
  );
}
