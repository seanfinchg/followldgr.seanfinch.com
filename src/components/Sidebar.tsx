import {
  Box,
  Tabs,
  Tab,
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

  const TabItem = (label: string, value: CategoryKey) => (
    <Tab
      label={
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
            width: "100%",
          }}
        >
          <span>{label}</span>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            {counts[value] ?? 0}
          </Typography>
        </Box>
      }
      value={value}
      sx={{ alignItems: "flex-start" }}
    />
  );

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

      <Tabs
        orientation="vertical"
        value={category}
        onChange={(_, val) => onCategory(val)}
        variant="scrollable"
        sx={{
          borderRight: 1,
          borderColor: "divider",
          width: "100%", // Take full width
          minWidth: { xs: "100%", sm: 280 }, // Wider on larger screens
          height: { xs: 350, sm: 420 }, // Taller on larger screens
          "& .MuiTab-root": {
            minHeight: 56,
            padding: "10px 16px",
            justifyContent: "flex-start",
            textAlign: "left",
          },
        }}
      >
        {TabItem("Followers", "followers")}
        {TabItem("Following", "following")}
        {TabItem("Mutuals", "mutuals")}
        {TabItem("Not following back", "notFollowingBack")}
        {TabItem("I don't follow back", "iDontFollowBack")}

        <Divider
          textAlign="left"
          sx={{ my: 1, fontWeight: "bold", fontSize: "0.8rem" }}
        >
          {dataset?.selectedComparison ? "Snapshot Comparisons" : "History"}
        </Divider>

        {TabItem("Lost followers", "lostFollowers")}
        {TabItem("Unfollowed users", "unfollowed")}
        {TabItem("New followers", "newFollowers")}
        {TabItem("New following", "newFollowing")}
      </Tabs>

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
