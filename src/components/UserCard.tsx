import React from "react";
import {
  Card,
  CardContent,
  Avatar,
  Typography,
  Stack,
  Chip,
  Button,
  Box,
  Tooltip,
} from "@mui/material";
import {
  Verified,
  Lock,
  Star,
  PersonAddAlt,
  PersonRemove,
  HighlightOff,
  AccessTime,
  Insights,
  MergeType,
} from "@mui/icons-material";
import type { BasicUser, CategoryKey } from "../types";

// Props type definition
type Props = {
  user: BasicUser;
  category: CategoryKey;
  onToggleWhitelist: (u: BasicUser) => void;
  onMergeRequest?: (u: BasicUser) => void;
  ranges?: Array<{ from: string; to?: string }>;
};

/**
 * Component for user status indicators
 */
const UserStatusIndicators = ({ user }: { user: BasicUser }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      flexWrap: "wrap",
      width: "100%",
    }}
  >
    <a
      href={user.profile_url || `https://instagram.com/${user.username}`}
      target="_blank"
      rel="noreferrer"
      style={{
        fontWeight: 700,
        textDecoration: "none",
        color: "var(--mui-palette-primary-main)",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      @{user.username}
    </a>
    {user.is_verified && (
      <Chip size="small" icon={<Verified />} label="Verified" />
    )}
    {user.is_private && <Chip size="small" icon={<Lock />} label="Private" />}
    {user.whitelisted && (
      <Chip size="small" icon={<Star />} label="Whitelisted" color="success" />
    )}
  </Box>
);

/**
 * UserCard component displays information about a user with actions
 */
export default function UserCard({
  user,
  category,
  onToggleWhitelist,
  onMergeRequest,
  ranges,
}: Props) {
  // Action logic
  const canWhitelist =
    category === "notFollowingBack" || category === "iDontFollowBack";

  // Generate relationship-based actions
  const actions: Array<{
    label: string;
    icon: React.ReactNode;
    color?: "primary" | "error" | "success";
  }> = [];

  if (
    category === "following" ||
    category === "notFollowingBack" ||
    category === "mutuals"
  ) {
    actions.push({
      label: "Unfollow",
      icon: <PersonRemove fontSize="small" />,
      color: "error",
    });
  }

  if (
    category === "followers" ||
    category === "iDontFollowBack" ||
    category === "mutuals"
  ) {
    actions.push({
      label: "Remove follower",
      icon: <HighlightOff fontSize="small" />,
      color: "error",
    });
  }

  if (category === "lostFollowers" || category === "iDontFollowBack") {
    actions.push({
      label: "Follow",
      icon: <PersonAddAlt fontSize="small" />,
      color: "primary",
    });
  }

  // Merge action available on all categories
  actions.push({
    label: "Merge",
    icon: <MergeType fontSize="small" />,
    color: "primary",
  });

  // Open profile in a new tab
  const openProfile = () => {
    const url = user.profile_url || `https://instagram.com/${user.username}`;
    window.open(url, "_blank");
  };

  // Component for user metadata (followers, following info)
  const UserMetadata = () => (
    <>
      <Typography noWrap variant="body2" color="text.secondary">
        {user.full_name ?? ""}
      </Typography>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        {user.order_index !== undefined && (
          <Tooltip title="Lower index means more recent. This represents how recently the user followed you or you followed them.">
            <Chip
              size="small"
              icon={<AccessTime fontSize="small" />}
              label={`Index: ${user.order_index}`}
              color={user.order_index < 100 ? "primary" : "default"}
            />
          </Tooltip>
        )}
        {user.first_seen && (
          <Tooltip title="First time user appeared in your snapshots">
            <Chip
              size="small"
              icon={<Insights fontSize="small" />}
              label={`First seen: ${new Date(
                user.first_seen
              ).toLocaleDateString()}`}
            />
          </Tooltip>
        )}

        {/* Show presence intervals (clear): each interval shows start — end (or 'Present' if to is undefined) */}
        {ranges && ranges.length > 0 && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {ranges.map((interval, i) => (
              <Tooltip
                key={i}
                title={`Present from ${new Date(
                  interval.from
                ).toLocaleString()}${
                  interval.to
                    ? ` to ${new Date(interval.to).toLocaleString()}`
                    : " (still present)"
                }`}
              >
                <Chip
                  size="small"
                  icon={<AccessTime fontSize="small" />}
                  label={
                    interval.to
                      ? `${new Date(
                          interval.from
                        ).toLocaleDateString()} — ${new Date(
                          interval.to
                        ).toLocaleDateString()}`
                      : `${new Date(
                          interval.from
                        ).toLocaleDateString()} — Present`
                  }
                  color={interval.to ? "warning" : "success"}
                />
              </Tooltip>
            ))}
          </Box>
        )}
      </Box>

      {ranges && ranges.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {ranges
            .map((r) =>
              r.to
                ? `${new Date(r.from).toLocaleDateString()} — ${new Date(
                    r.to
                  ).toLocaleDateString()}`
                : `${new Date(r.from).toLocaleDateString()} — Present`
            )
            .join(" • ")}
        </Typography>
      )}
    </>
  );

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        display: "block",
        borderRadius: 2,
        mb: 2,
        transition: "all 0.2s",
        "&:hover": { boxShadow: 3 },
        flexGrow: 1,
        flexShrink: 0,
        flexBasis: "100%",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          p: 2,
          pb: "16px !important",
          width: "100%",
        }}
      >
        {/* Using initials avatar instead of profile image */}
        <Avatar
          sx={{
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 },
            bgcolor: "primary.main",
            fontSize: "1.2rem",
            fontWeight: "bold",
            flexShrink: 0,
          }}
        >
          {user.username.substring(0, 2).toUpperCase()}
        </Avatar>

        <Stack
          flex={1}
          spacing={0.5}
          minWidth={0}
          mb={{ xs: 2, sm: 0 }}
          overflow="hidden"
        >
          <UserStatusIndicators user={user} />
          <UserMetadata />
        </Stack>

        {/* Actions */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: { xs: "flex-start", sm: "flex-end" },
            width: { xs: "100%", sm: "auto" },
            marginLeft: { sm: "auto" },
            flexShrink: 0,
          }}
        >
          {actions.map(({ label, icon, color }) => (
            <Button
              key={label}
              size="small"
              variant="outlined"
              color={color || "primary"}
              onClick={() =>
                label === "Merge" && onMergeRequest
                  ? onMergeRequest(user)
                  : openProfile()
              }
              startIcon={icon}
            >
              {label}
            </Button>
          ))}
          {canWhitelist && (
            <Button
              size="small"
              variant={user.whitelisted ? "contained" : "outlined"}
              color="success"
              onClick={() => onToggleWhitelist(user)}
              startIcon={<Star />}
            >
              {user.whitelisted ? "Un-whitelist" : "Whitelist"}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
