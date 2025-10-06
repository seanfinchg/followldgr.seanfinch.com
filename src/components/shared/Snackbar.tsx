import React from "react";
import { Snackbar as MuiSnackbar, Alert } from "@mui/material";
import type { AlertProps } from "@mui/material";
import { useAppContext } from "../../context/AppContext";

/**
 * Global notification component using MUI Snackbar
 * Automatically connects to the AppContext snack state
 */
const Snackbar: React.FC = () => {
  const { snack, hideSnack } = useAppContext();

  const handleClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") return;
    hideSnack();
  };

  return (
    <MuiSnackbar
      open={snack.open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={handleClose}
        severity={snack.severity as AlertProps["severity"]}
        sx={{ width: "100%" }}
        elevation={6}
        variant="filled"
      >
        {snack.msg}
      </Alert>
    </MuiSnackbar>
  );
};

export default Snackbar;
