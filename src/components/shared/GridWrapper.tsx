import React from "react";
import { Grid } from "@mui/material";

/**
 * Wrapper for Grid components to handle prop incompatibility between MUI versions
 */
export const GridContainer: React.FC<
  React.PropsWithChildren<{
    spacing?: number;
  }>
> = ({ children, spacing = 0 }) => {
  return (
    <Grid container spacing={spacing}>
      {children}
    </Grid>
  );
};

/**
 * Wrapper for Grid item components to handle prop incompatibility between MUI versions
 */
export const GridItem: React.FC<
  React.PropsWithChildren<{
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  }>
> = ({ children, ...props }) => {
  // Render a block-level container that spans the requested columns in CSS grid
  // This keeps children (like lists/cards) at full width of the available column area.
  const span = props.xs || 12;
  return (
    <div
      style={{
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        gridColumn: `span ${span} / span ${span}`,
      }}
    >
      {children}
    </div>
  );
};
