import { useState, useRef } from "react";
import {
  Paper,
  Typography,
  Stack,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Chip,
  CircularProgress,
} from "@mui/material";
import type { LDGRJson } from "../types";
import { useAppContext } from "../context/AppContext";

type Props = {
  hasSnapshot: boolean;
  hasBase: boolean;
};

/**
 * UploadPanel component for handling JSON file uploads
 */
export default function UploadPanel({ hasSnapshot }: Props) {
  const { onFilesAdded, onBaseChosen, onEnterDashboard, fileUpload } =
    useAppContext();

  const {
    pendingFiles,
    baseFile,
    handleFileSelection,
    handleRemoveFile,
    handleMarkAsBase,
    readJson,
    normalizeSnapshot,
  } = fileUpload;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [baseName, setBaseName] = useState<string | null>(null);

  // Process and upload files
  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;

    setUploading(true);

    // Process all files
    const snapshotFiles: LDGRJson[] = [];
    let baseJson: LDGRJson | null = null;

    try {
      // Process files in parallel
      const results = await Promise.all(
        pendingFiles.map(async (file) => {
          try {
            const json = await readJson(file);
            // Normalize the JSON to ensure followers/following arrays exist
            const normalizedJson = normalizeSnapshot(json);
            return { file, json: normalizedJson, success: true };
          } catch (e) {
            console.error(`Error parsing ${file.name}:`, e);
            return { file, json: null, success: false };
          }
        })
      );

      // Sort results into snapshots and base
      for (const result of results) {
        if (result.success && result.json) {
          if (baseFile && result.file.name === baseFile.name) {
            baseJson = result.json;
          } else {
            snapshotFiles.push(result.json);
          }
        }
      }

      // Update state with successful uploads
      if (snapshotFiles.length > 0) {
        onFilesAdded(snapshotFiles);
      }

      if (baseJson) {
        onBaseChosen(baseJson);
        setBaseName(baseFile?.name || null);
      }

      // Update UI state
      const successfulFiles = results
        .filter((r) => r.success)
        .map((r) => r.file.name);
      setUploadedFiles((prev) => [...prev, ...successfulFiles]);
    } catch (e) {
      console.error("Error processing files:", e);
    } finally {
      setUploading(false);
    }
  };

  // Render a file item for the pending files list
  const renderFileItem = (file: File) => (
    <ListItem
      key={file.name}
      secondaryAction={
        <Stack direction="row" spacing={1}>
          <Chip
            label={baseFile?.name === file.name ? "BASE" : "Set as Base"}
            color={baseFile?.name === file.name ? "secondary" : "default"}
            size="small"
            onClick={() => handleMarkAsBase(file)}
            sx={{ cursor: "pointer" }}
          />
          <Chip
            label="✕"
            size="small"
            onClick={() => handleRemoveFile(file.name)}
            sx={{ cursor: "pointer" }}
          />
        </Stack>
      }
    >
      <ListItemText
        primary={file.name}
        secondary={baseFile?.name === file.name ? "Base (Merged)" : "Snapshot"}
      />
    </ListItem>
  );

  return (
    <Paper sx={{ p: 4, borderRadius: 2 }} elevation={3}>
      <Typography variant="h5" gutterBottom fontWeight={700} textAlign="center">
        Welcome to FollowLDGR
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        textAlign="center"
        gutterBottom
      >
        Upload multiple snapshots at once and process them together.
      </Typography>

      {/* File selection button */}
      <Stack direction="column" spacing={4} alignItems="center" mt={3}>
        <input
          type="file"
          multiple
          accept="application/json"
          hidden
          ref={fileInputRef}
          onChange={(e) => handleFileSelection(e.target.files)}
        />
        <Button
          variant="contained"
          size="large"
          onClick={() => fileInputRef.current?.click()}
          sx={{
            py: 1.5,
            px: 3,
            borderRadius: 3,
          }}
        >
          Select JSON Files
        </Button>

        {/* Pending files list */}
        {pendingFiles.length > 0 && (
          <Box width="100%" mt={2}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Selected Files
            </Typography>
            <List
              dense
              sx={{
                maxHeight: 220,
                overflow: "auto",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {pendingFiles.map((file) => renderFileItem(file))}
            </List>

            <Stack direction="row" justifyContent="center" mt={2}>
              <Button
                variant="contained"
                color="primary"
                disabled={uploading}
                onClick={handleUpload}
                sx={{ px: 4, py: 1 }}
              >
                {uploading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Upload Files"
                )}
              </Button>
            </Stack>
          </Box>
        )}

        {/* Uploaded files */}
        {(uploadedFiles.length > 0 || baseName) && (
          <Box width="100%" mt={2}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Uploaded Files
            </Typography>
            <List
              dense
              sx={{
                maxHeight: 220,
                overflow: "auto",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {baseName && (
                <>
                  <ListItem>
                    <ListItemText
                      primary={baseName}
                      secondary="Base (Merged)"
                    />
                    <Chip color="secondary" size="small" label="BASE" />
                  </ListItem>
                  <Divider />
                </>
              )}
              {uploadedFiles.length === 0 && !baseName && (
                <ListItem>
                  <ListItemText primary="No files yet" />
                </ListItem>
              )}
              {uploadedFiles.map((name, i) => (
                <ListItem key={`${name}-${i}`}>
                  <ListItemText primary={name} secondary="Snapshot" />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Stack>

      {/* Enter Dashboard button */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="center"
        mt={4}
      >
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={onEnterDashboard}
          disabled={!hasSnapshot}
          sx={{
            py: 1.5,
            px: 4,
            borderRadius: 3,
            fontWeight: "bold",
          }}
        >
          Enter Dashboard
        </Button>
        {!hasSnapshot && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ alignSelf: "center" }}
          >
            Upload at least one snapshot to continue.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
