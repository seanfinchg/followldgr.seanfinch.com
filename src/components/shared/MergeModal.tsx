import { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Box,
  Typography,
} from "@mui/material";
import { useAppContext } from "../../context/AppContext";

export default function MergeModal() {
  const { mergeSource, onConfirmMerge, onCancelMerge, ui } = useAppContext();
  const [value, setValue] = useState("");

  const dataset = ui.dataset;

  useEffect(() => {
    setValue("");
  }, [mergeSource]);

  const suggestions = useMemo(() => {
    if (!dataset) return [] as string[];
    const s = new Set<string>();
    // gather usernames from latest maps
    [
      dataset.latestFollowers,
      dataset.latestFollowing,
      dataset.mutuals,
      dataset.notFollowingBack,
      dataset.iDontFollowBack,
    ].forEach((map) => {
      if (!map) return;
      for (const u of map.values()) {
        s.add(u.username.toLowerCase());
      }
    });
    // remove source
    if (mergeSource) s.delete(mergeSource.username.toLowerCase());
    return Array.from(s).sort();
  }, [dataset, mergeSource]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 200);
    return suggestions.filter((s) => s.includes(q)).slice(0, 200);
  }, [suggestions, value]);

  if (!mergeSource) return null;

  const handleConfirm = () => {
    let target = value.trim();
    if (!target) return;
    // allow @prefix and normalize to lowercase username
    if (target.startsWith("@")) target = target.slice(1);
    target = target.toLowerCase();
    onConfirmMerge(mergeSource, target);
  };

  return (
    <Dialog
      open={!!mergeSource}
      onClose={onCancelMerge}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Merge @{mergeSource.username} into another user</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2">
            Enter the target username to merge into.
          </Typography>
          <TextField
            label="Target username"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fullWidth
            autoFocus
            placeholder="username"
          />

          <Typography variant="subtitle2">Suggestions</Typography>
          <List dense sx={{ maxHeight: 200, overflow: "auto" }}>
            {filtered.length === 0 && (
              <ListItem>
                <ListItemText
                  primary={value ? "No matches" : "No suggestions"}
                />
              </ListItem>
            )}
            {filtered.map((name) => (
              <ListItem key={name} disablePadding>
                <ListItemButton onClick={() => setValue(name)}>
                  <ListItemText primary={`@${name}`} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancelMerge}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleConfirm}>
          Merge
        </Button>
      </DialogActions>
    </Dialog>
  );
}
