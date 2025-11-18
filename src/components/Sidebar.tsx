import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
  Stack,
  Button,
  Divider,
} from "@mui/material";
import { Star } from "@mui/icons-material";
import type {
  CategoryKey,
  VerifiedFilter,
  PrivacyFilter,
  WhitelistFilter,
  Dataset,
} from "../types";

type Props = {
  visible: boolean;
  category: CategoryKey;
  counts: Record<CategoryKey, number>;
  totalLabel: string;
  onCategory: (c: CategoryKey) => void;

  search: string;
  onSearch: (s: string) => void;

  verified: VerifiedFilter;
  onVerified: (v: VerifiedFilter) => void;

  privacy: PrivacyFilter;
  onPrivacy: (v: PrivacyFilter) => void;

  whitelist: WhitelistFilter;
  onWhitelist: (v: WhitelistFilter) => void;

  showTrend: boolean;
  onToggleTrend: () => void;
  disableWhitelist: boolean;
  onWhitelistAll?: () => void; // New prop for whitelist all functionality

  dataset?: Dataset;
};

export default function Sidebar({
  visible,
  category,
  counts,
  totalLabel,
  onCategory,
  search,
  onSearch,
  verified,
  onVerified,
  privacy,
  onPrivacy,
  whitelist,
  onWhitelist,
  showTrend,
  onToggleTrend,
  disableWhitelist,
  onWhitelistAll,
  dataset,
}: Props) {
  if (!visible) return null;

  // TabItem helper removed: replaced tabs with a compact Select to save space

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%", // Ensure it takes full width of its container
        position: { xs: "static", lg: "sticky" },
        top: { lg: "24px" },
      }}
    >
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Categories
        </Typography>
        <Typography variant="h6" color="text.secondary" fontWeight={800}>
          {totalLabel}
        </Typography>
      </Stack>

      {/* Compact category selector: use a single Select instead of large vertical tabs
          This reduces the vertical space used by the sidebar while keeping counts */}
      <FormControl size="small" fullWidth>
        <InputLabel>Category</InputLabel>
        <Select
          value={category}
          label="Category"
          onChange={(e) => onCategory(e.target.value as CategoryKey)}
        >
          <MenuItem value={"followers"}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>Followers</span>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {counts.followers ?? 0}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value={"following"}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>Following</span>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {counts.following ?? 0}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value={"mutuals"}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>Mutuals</span>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {counts.mutuals ?? 0}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value={"notFollowingBack"}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>Not following back</span>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {counts.notFollowingBack ?? 0}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value={"iDontFollowBack"}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>I don't follow back</span>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {counts.iDontFollowBack ?? 0}
              </Typography>
            </Box>
          </MenuItem>

          <Divider sx={{ my: 1 }} />

          {dataset?.selectedComparison ? (
            <MenuItem disabled>Snapshot Comparisons</MenuItem>
          ) : (
            <MenuItem disabled>History</MenuItem>
          )}

          <MenuItem value={"lostFollowers"}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>Lost followers</span>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {counts.lostFollowers ?? 0}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value={"unfollowed"}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>Unfollowed users</span>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {counts.unfollowed ?? 0}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value={"newFollowers"}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>New followers</span>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {counts.newFollowers ?? 0}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value={"newFollowing"}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>New following</span>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {counts.newFollowing ?? 0}
              </Typography>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Search"
        size="small"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      <FormControl size="small" fullWidth>
        <InputLabel>Verified</InputLabel>
        <Select
          value={verified}
          label="Verified"
          onChange={(e) => onVerified(e.target.value as VerifiedFilter)}
        >
          <MenuItem value="any">Any</MenuItem>
          <MenuItem value="verified">Verified only</MenuItem>
          <MenuItem value="notVerified">Not verified</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel>Privacy</InputLabel>
        <Select
          value={privacy}
          label="Privacy"
          onChange={(e) => onPrivacy(e.target.value as PrivacyFilter)}
        >
          <MenuItem value="any">Any</MenuItem>
          <MenuItem value="private">Private only</MenuItem>
          <MenuItem value="public">Public only</MenuItem>
        </Select>
      </FormControl>

      {!disableWhitelist && (
        <FormControl size="small" fullWidth>
          <InputLabel>Whitelist</InputLabel>
          <Select
            value={whitelist}
            label="Whitelist"
            onChange={(e) => onWhitelist(e.target.value as WhitelistFilter)}
          >
            <MenuItem value="any">Any</MenuItem>
            <MenuItem value="only">Whitelisted only</MenuItem>
            <MenuItem value="exclude">Exclude whitelisted</MenuItem>
          </Select>
        </FormControl>
      )}

      <FormControlLabel
        control={<Switch checked={showTrend} onChange={onToggleTrend} />}
        label="Show trends"
      />

      {/* Whitelist All button - only show for relevant categories */}
      {!disableWhitelist && onWhitelistAll && (
        <Button
          variant="contained"
          color="success"
          startIcon={<Star />}
          onClick={onWhitelistAll}
          sx={{ mt: 1 }}
        >
          Whitelist All Visible
        </Button>
      )}
    </Box>
  );
}
