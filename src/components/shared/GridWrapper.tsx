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
  return (
    <div
      style={{ gridColumn: `span ${props.xs || 12} / span ${props.xs || 12}` }}
    >
      {children}
    </div>
  );
};
