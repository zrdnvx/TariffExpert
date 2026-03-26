import { createTheme } from "@mui/material/styles";

export const getAppTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#0f766e",
      },
      secondary: {
        main: "#1d4ed8",
      },
      background:
        mode === "dark"
          ? {
              default: "#0b1220",
              paper: "#0f172a",
            }
          : {
              default: "#f1f5f9",
              paper: "#ffffff",
            },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiPaper: {
        defaultProps: {
          elevation: 3,
        },
      },
      MuiButton: {
        defaultProps: {
          variant: "contained",
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 999,
            paddingInline: 20,
            paddingBlock: 8,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
          fullWidth: true,
        },
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 999,
            },
          },
        },
      },
    },
  });

