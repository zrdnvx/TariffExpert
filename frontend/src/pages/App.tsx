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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ApartmentIcon from "@mui/icons-material/Apartment";
import CalculateIcon from "@mui/icons-material/Calculate";
import InsightsIcon from "@mui/icons-material/Insights";
import TableChartIcon from "@mui/icons-material/TableChart";
import LoginIcon from "@mui/icons-material/Login";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { LoginPage } from "./LoginPage";
import { BuildingCreatePage } from "./BuildingCreatePage";
import { CalculationRunPage } from "./CalculationRunPage";
import { DetailCalculationPage } from "./DetailCalculationPage";
import { TariffsPage } from "./TariffsPage";
import { AdminSetupPage } from "./AdminSetupPage";
import { BuildingsListPage } from "./BuildingsListPage";
import { useAuth } from "../state/AuthContext";

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
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width:900px)");
  const [open, setOpen] = React.useState(false);

  const toggleDrawer = () => setOpen((o) => !o);

  const drawerContent = tokens && (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          TariffExpert
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
    <Box sx={{ display: "flex", minHeight: "100vh", background: "radial-gradient(circle at top, #1f2937 0, #020617 55%)" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(15,23,42,0.85)",
          borderBottom: "1px solid rgba(148,163,184,0.2)",
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={toggleDrawer} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">TariffExpert</Typography>
            {user && (
              <Typography variant="caption" color="text.secondary">
                {user.organizationName} · {user.cityName} · {user.role}
              </Typography>
            )}
          </Box>
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
          p: 3,
          pl: { sm: `calc(${drawerWidth}px + 24px)` },
          pt: 10,
          maxWidth: "1440px",
          mx: "auto",
        }}
      >
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
        <Route path="/calculations/detail" element={<DetailCalculationPage />} />
        <Route path="/tariffs" element={<TariffsPage />} />
        <Route path="/admin" element={<AdminSetupPage />} />
      </Routes>
    </Layout>
  );
};

