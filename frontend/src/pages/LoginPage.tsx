import React, { useState } from "react";
import { useApiClient } from "../api/client";
import { useAuth, UserProfile } from "../state/AuthContext";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Stack,
} from "@mui/material";

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type MeResponse = {
  user_id: string;
  username: string;
  role: "superadmin" | "org_admin" | "operator";
  organization_id: string;
  organization_name: string;
  city_id: string;
  city_name: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const LoginPage: React.FC = () => {
  const api = useApiClient();
  const { tokens, setTokens, setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await api.post<LoginResponse>("/auth/login", {
        username,
        password,
      });
      setTokens({
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
      });
      // подтягиваем профиль пользователя, сразу используя новый access токен
      const me = await api.get<MeResponse>("/auth/me", {
        headers: {
          Authorization: `Bearer ${res.data.access_token}`,
        },
      });
      const profile: UserProfile = {
        userId: me.data.user_id,
        username: me.data.username,
        role: me.data.role,
        organizationId: me.data.organization_id,
        organizationName: me.data.organization_name,
        cityId: me.data.city_id,
        cityName: me.data.city_name,
      };
      setUser(profile);
      setStatus("Успешный вход");
      setUsername("");
      setPassword("");
    } catch (err: any) {
      console.error(err);
      setStatus("Ошибка входа: проверьте логин/пароль");
      setTokens(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // игнорируем ошибки логаута
    } finally {
      setTokens(null);
      setUser(null);
      setStatus("Вы вышли из системы");
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
      <Paper
        sx={{
          p: 4,
          minWidth: 340,
          maxWidth: 420,
          background: "linear-gradient(145deg, #020617, #0b1120)",
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          Вход оператора
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Введите служебный пароль для доступа к модулю «ЭКСПЕРТ_Расчет».
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              type="password"
              label="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" disabled={loading || !username || !password}>
              {loading ? "Вход..." : "Войти"}
            </Button>
            {tokens && (
              <Button variant="outlined" color="inherit" onClick={handleLogout}>
                Выйти
              </Button>
            )}
          </Stack>
        </Box>
        {status && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            {status}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

