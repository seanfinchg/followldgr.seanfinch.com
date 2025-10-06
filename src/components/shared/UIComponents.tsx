import React from "react";
import { Box, Typography, Chip, Button } from "@mui/material";

// Reusable section header
export const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="h6" fontWeight={700}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    )}
  </Box>
);

// Reusable action button with consistent styling
export const ActionButton = ({
  label,
  icon,
  onClick,
  color = "primary",
  variant = "contained",
  disabled = false,
  size = "medium",
  fullWidth = false,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  color?: "primary" | "secondary" | "error" | "info" | "success" | "warning";
  variant?: "text" | "outlined" | "contained";
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
}) => (
  <Button
    variant={variant}
    color={color}
    onClick={onClick}
    disabled={disabled}
    startIcon={icon}
    size={size}
    fullWidth={fullWidth}
    sx={{
      borderRadius: 2,
      py: size === "large" ? 1.5 : 1,
      px: size === "large" ? 3 : 2,
    }}
  >
    {label}
  </Button>
);

// Status chip with consistent styling
export const StatusChip = ({
  label,
  icon,
  color = "default",
  size = "small",
}: {
  label: string;
  icon?: React.ReactElement;
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning";
  size?: "small" | "medium";
}) => (
  <Chip
    label={label}
    icon={icon}
    color={color}
    size={size}
    sx={{
      borderRadius: 1,
      "& .MuiChip-label": {
        paddingLeft: icon ? 0.5 : 1,
        paddingRight: 1,
      },
    }}
  />
);

// Card container with consistent styling
export const CardContainer = ({
  children,
  elevation = 1,
  onClick,
}: {
  children: React.ReactNode;
  elevation?: number;
  onClick?: () => void;
}) => (
  <Box
    sx={{
      p: 2,
      mb: 2,
      borderRadius: 2,
      boxShadow: elevation,
      transition: "all 0.2s",
      "&:hover": { boxShadow: elevation + 1 },
      cursor: onClick ? "pointer" : "default",
    }}
    onClick={onClick}
  >
    {children}
  </Box>
);

// Responsive container
export const ResponsiveContainer = ({
  children,
  maxWidth = "lg",
}: {
  children: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
}) => (
  <Box
    sx={{
      width: "100%",
      maxWidth: (theme) => theme.breakpoints.values[maxWidth],
      mx: "auto",
      px: { xs: 2, sm: 3 },
    }}
  >
    {children}
  </Box>
);
