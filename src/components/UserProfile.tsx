import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  Chip,
  Button,
} from "@mui/material";
import { useAppContext } from "../context/AppContext";
import type { BasicUser } from "../types";

export default function UserProfile({ username }: { username: string }) {
  const { ui } = useAppContext();
  const ds = ui.dataset;

  if (!ds) {
    return (
      <Box p={4}>
        <Typography variant="h6">No dataset loaded</Typography>
        <Typography color="text.secondary">
          Load snapshots to view profiles.
        </Typography>
      </Box>
    );
  }

  const key = username.toLowerCase();

  const findUser = (): BasicUser | undefined => {
    const maps = [
      ds.latestFollowers,
      ds.latestFollowing,
      ds.mutuals,
      ds.notFollowingBack,
      ds.iDontFollowBack,
    ];
    for (const m of maps) {
      const u = m.get(key);
      if (u) return u;
    }
    // fallback: search mergedSnapshots for a match
    for (const snap of ds.mergedSnapshots) {
      const f = (snap.followers || []).find(
        (x) => x.username.toLowerCase() === key
      );
      if (f) return f;
      const fo = (snap.following || []).find(
        (x) => x.username.toLowerCase() === key
      );
      if (fo) return fo;
    }
    return undefined;
  };

  const user = findUser();

  if (!user) {
    return (
      <Box p={4}>
        <Typography variant="h6">User not found</Typography>
        <Typography color="text.secondary">
          No user with username @{username} exists in the loaded dataset.
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Button
        variant="outlined"
        onClick={() => (window.location.href = "/")}
        sx={{ mb: 2 }}
      >
        Back to dashboard
      </Button>

      <Card variant="outlined">
        <CardContent
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Avatar
            sx={{
              width: 96,
              height: 96,
              fontSize: 32,
              bgcolor: "primary.main",
            }}
          >
            {user.username.substring(0, 2).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5">@{user.username}</Typography>
            {user.full_name && (
              <Typography color="text.secondary">{user.full_name}</Typography>
            )}

            <Box
              sx={{
                mt: 1,
                display: "flex",
                gap: 1,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {user.is_verified && <Chip size="small" label="Verified" />}
              {user.is_private && <Chip size="small" label="Private" />}
              {user.whitelisted && (
                <Chip size="small" color="success" label="Whitelisted" />
              )}
            </Box>

            <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                onClick={() =>
                  window.open(
                    user.profile_url ||
                      `https://instagram.com/${user.username}`,
                    "_blank"
                  )
                }
              >
                Open on Instagram
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  // copy profile url to clipboard as a convenience
                  const url = `${
                    window.location.origin
                  }/user/${encodeURIComponent(user.username)}`;
                  navigator.clipboard?.writeText(url);
                  alert("Profile URL copied to clipboard: " + url);
                }}
              >
                Copy Followldgr Link
              </Button>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Metadata</Typography>
              <Box sx={{ mt: 1 }}>
                {user.first_seen && (
                  <Typography variant="body2">
                    First seen: {new Date(user.first_seen).toLocaleString()}
                  </Typography>
                )}
                {user.last_seen && (
                  <Typography variant="body2">
                    Last seen: {new Date(user.last_seen).toLocaleString()}
                  </Typography>
                )}
                {user.aliases && user.aliases.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">Known aliases:</Typography>
                    <Box
                      sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}
                    >
                      {user.aliases.map((a, i) => (
                        <Chip
                          key={i}
                          size="small"
                          label={`${a.username} (${new Date(
                            a.changed_at
                          ).toLocaleDateString()})`}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
