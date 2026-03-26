import React from "react";
import { Link as RouterLink, Route, Routes, Navigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  Link,
  Slide,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ApartmentIcon from "@mui/icons-material/Apartment";
import CalculateIcon from "@mui/icons-material/Calculate";
import TableChartIcon from "@mui/icons-material/TableChart";
import LoginIcon from "@mui/icons-material/Login";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { LoginPage } from "./LoginPage";
import { BuildingCreatePage } from "./BuildingCreatePage";
import { CalculationRunPage } from "./CalculationRunPage";
import { DetailCalculationPage } from "./DetailCalculationPage";
import { TariffsPage } from "./TariffsPage";
import { AdminSetupPage } from "./AdminSetupPage";
import { BuildingsListPage } from "./BuildingsListPage";
import { useAuth } from "../state/AuthContext";
import { useThemeMode } from "../state/ThemeModeContext";

const drawerWidth = 260;

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactElement;
};

const navItems: NavItem[] = [
  { label: "Вход", to: "/login", icon: <LoginIcon /> },
  { label: "Объекты", to: "/buildings", icon: <ApartmentIcon /> },
  { label: "Расчет платы", to: "/calculations/run", icon: <CalculateIcon /> },
  // { label: "Детализация платы", to: "/calculations/detail", icon: <InsightsIcon /> },
  { label: "Тарифы", to: "/tariffs", icon: <TableChartIcon /> },
  { label: "Админ-панель", to: "/admin", icon: <AdminPanelSettingsIcon /> },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tokens, user } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width:900px)");
  const [open, setOpen] = React.useState(false);

  const toggleDrawer = () => setOpen((o) => !o);

  const roleLabel = (role: string): string => {
    switch (role) {
      case "operator":
        return "Оператор";
      case "org_admin":
        return "Администратор организации";
      case "superadmin":
        return "Суперадминистратор";
      default:
        return "Пользователь";
    }
  };

  const drawerContent = tokens && (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          ТарифЭксперт
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Расчет и детализация платы
        </Typography>
      </Box>
      <List sx={{ flexGrow: 1 }}>
        {navItems.map((item) => {
          const selected = location.pathname === item.to;
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={selected}
              sx={{
                borderRadius: 2,
                mx: 1,
                my: 0.5,
              }}
              onClick={() => isMobile && setOpen(false)}
            >
              <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
      {!tokens && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" color="error">
            Для работы с модулем выполните вход.
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        minHeight: "100vh",
        background:
          theme.palette.mode === "dark"
            ? "radial-gradient(circle at top, #1f2937 0, #020617 55%)"
            : "radial-gradient(circle at top, #e2e8f0 0, #f8fafc 55%)",
      })}
    >
      <AppBar
        position="fixed"
        elevation={0}
        color="default"
        sx={(theme) => ({
          backdropFilter: "blur(12px)",
          backgroundColor:
            theme.palette.mode === "dark" ? "rgba(15,23,42,0.85)" : "rgba(248,250,252,0.9)",
          color: theme.palette.mode === "dark" ? theme.palette.grey[100] : theme.palette.grey[900],
          borderBottom: "1px solid rgba(148,163,184,0.2)",
        })}
      >
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={toggleDrawer} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">ТарифЭксперт</Typography>
            {user && (
              <Typography variant="caption" color="text.secondary">
                {user.organizationName} · {user.cityName} · {roleLabel(user.role)}
              </Typography>
            )}
          </Box>
          <Tooltip title={mode === "dark" ? "Светлая тема" : "Тёмная тема"}>
            <IconButton
              onClick={toggleMode}
              sx={(theme) => ({
                mr: 1,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.14)"
                    : "#1e293b",
                color: "#ffffff",
                "&:hover": {
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.22)"
                      : "#0f172a",
                },
              })}
            >
              {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          {tokens ? null : (
            <Link
              component={RouterLink}
              to="/login"
              color="secondary"
              underline="hover"
              sx={{ fontWeight: 500 }}
            >
              Войти
            </Link>
          )}
        </Toolbar>
      </AppBar>

      {tokens && (
        <Box
          component="nav"
          sx={{
            width: { sm: drawerWidth },
            flexShrink: { sm: 0 },
          }}
        >
          {isMobile ? (
            <Drawer
              variant="temporary"
              open={open}
              onClose={toggleDrawer}
              ModalProps={{ keepMounted: true }}
              sx={{
                "& .MuiDrawer-paper": {
                  width: drawerWidth,
                  boxSizing: "border-box",
                  backgroundColor: "background.paper",
                },
              }}
            >
              {drawerContent}
            </Drawer>
          ) : (
            <Drawer
              variant="permanent"
              open
              sx={{
                "& .MuiDrawer-paper": {
                  width: drawerWidth,
                  boxSizing: "border-box",
                  backgroundColor: "background.paper",
                  borderRight: "1px solid rgba(148,163,184,0.2)",
                },
              }}
            >
              <Toolbar />
              {drawerContent}
            </Drawer>
          )}
        </Box>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          pl: { xs: 2, sm: 3 },
          pt: 0,
          maxWidth: "none",
          mx: 0,
        }}
      >
        <Toolbar />
        <Slide
          in
          direction="up"
          appear
          timeout={400}
          easing={{ enter: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          <Box>{children}</Box>
        </Slide>
      </Box>
    </Box>
  );
};

export const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/buildings" element={<BuildingsListPage />} />
        <Route path="/buildings/new" element={<BuildingCreatePage />} />
        <Route path="/calculations/run" element={<CalculationRunPage />} />
        <Route path="/calculations/history" element={<Navigate to="/calculations/run?tab=history" replace />} />
        <Route path="/calculations/detail" element={<DetailCalculationPage />} />
        <Route path="/tariffs" element={<TariffsPage />} />
        <Route path="/admin" element={<AdminSetupPage />} />
      </Routes>
    </Layout>
  );
};

