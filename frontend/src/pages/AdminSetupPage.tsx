import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api/config";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Divider,
  Stack,
} from "@mui/material";

type City = {
  id: string;
  name: string;
  region: string | null;
};

type Organization = {
  id: string;
  name: string;
  inn: string | null;
  city_id: string;
  is_active: boolean;
};

export const AdminSetupPage: React.FC = () => {
  const [setupPassword, setSetupPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  const [newCityName, setNewCityName] = useState("");
  const [newCityRegion, setNewCityRegion] = useState("");

  const [orgCityId, setOrgCityId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgInn, setOrgInn] = useState("");

  const [userOrgId, setUserOrgId] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"superadmin" | "org_admin" | "operator">(
    "operator",
  );

  const adminApi = axios.create({
    baseURL: API_BASE_URL,
  });

  adminApi.interceptors.request.use((config) => {
    if (setupPassword) {
      config.headers["X-Setup-Password"] = setupPassword;
    }
    return config;
  });

  const loadCities = async () => {
    if (!setupPassword) return;
    const res = await adminApi.get<City[]>("/admin/cities");
    setCities(res.data);
  };

  const loadOrgs = async (cityId?: string) => {
    if (!setupPassword) return;
    const res = await adminApi.get<Organization[]>("/admin/organizations", {
      params: cityId ? { city_id: cityId } : {},
    });
    setOrgs(res.data);
  };

  const handleUnlock = async () => {
    setStatus(null);
    try {
      await loadCities();
      await loadOrgs();
      setUnlocked(true);
      setStatus("Админ-панель разблокирована");
    } catch (err) {
      console.error(err);
      setUnlocked(false);
      setStatus("Неверный админский пароль");
    }
  };

  const handleCreateCity = async () => {
    try {
      const res = await adminApi.post<City>("/admin/cities", null, {
        params: {
          name: newCityName,
          region: newCityRegion || null,
        },
      });
      setNewCityName("");
      setNewCityRegion("");
      await loadCities();
      setStatus(`Город "${res.data.name}" сохранён`);
    } catch (err) {
      console.error(err);
      setStatus("Ошибка сохранения города");
    }
  };

  const handleCreateOrg = async () => {
    try {
      const res = await adminApi.post<Organization>("/admin/organizations", null, {
        params: {
          city_id: orgCityId,
          name: orgName,
          inn: orgInn || null,
        },
      });
      setOrgName("");
      setOrgInn("");
      await loadOrgs(orgCityId);
      setStatus(`Организация "${res.data.name}" сохранена`);
    } catch (err) {
      console.error(err);
      setStatus("Ошибка сохранения организации");
    }
  };

  const handleCreateUser = async () => {
    try {
      const res = await adminApi.post("/admin/users", null, {
        params: {
          organization_id: userOrgId,
          username: userUsername,
          password: userPassword,
          role: userRole,
        },
      });
      setUserUsername("");
      setUserPassword("");
      setStatus(`Пользователь "${res.data.username}" создан`);
    } catch (err) {
      console.error(err);
      setStatus("Ошибка создания пользователя");
    }
  };

  useEffect(() => {
    if (unlocked) {
      void loadCities();
      void loadOrgs();
    }
  }, [unlocked]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
        Админ-панель настройки
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Здесь создаются города, организации и пользователи. Доступ только по сервисному
        админскому паролю из файла .env рядом с docker-compose.yml.
      </Typography>

      <Paper
        sx={{
          p: 3,
          mb: 3,
          maxWidth: 480,
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Вход в админ-панель
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            type="password"
            label="Админский пароль"
            value={setupPassword}
            onChange={(e) => setSetupPassword(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <Button disabled={!setupPassword} onClick={handleUnlock}>
            Войти
          </Button>
        </Stack>
        {status && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            {status}
          </Typography>
        )}
      </Paper>

      {!unlocked ? (
        <Typography variant="body2" color="text.secondary">
          Введите корректный админский пароль, чтобы увидеть формы создания городов,
          организаций и пользователей.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid rgba(148,163,184,0.3)",
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Города
              </Typography>
              <TextField
                label="Название города"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                sx={{ mb: 1 }}
              />
              <TextField
                label="Регион (опционально)"
                value={newCityRegion}
                onChange={(e) => setNewCityRegion(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                disabled={!newCityName}
                onClick={handleCreateCity}
              >
                Сохранить город
              </Button>

              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Существующие города:
              </Typography>
              {cities.map((c) => (
                <Typography key={c.id} variant="body2">
                  • {c.name}
                </Typography>
              ))}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid rgba(148,163,184,0.3)",
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Организации
              </Typography>
              <TextField
                select
                label="Город"
                value={orgCityId}
                onChange={(e) => {
                  const v = e.target.value;
                  setOrgCityId(v);
                  void loadOrgs(v);
                }}
                sx={{ mb: 1 }}
              >
                {cities.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Название организации"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                sx={{ mb: 1 }}
              />
              <TextField
                label="ИНН (опционально)"
                value={orgInn}
                onChange={(e) => setOrgInn(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                disabled={!orgCityId || !orgName}
                onClick={handleCreateOrg}
              >
                Сохранить организацию
              </Button>

              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Организации выбранного города:
              </Typography>
              {orgs.map((o) => (
                <Typography key={o.id} variant="body2">
                  • {o.name} {o.inn ? `(${o.inn})` : ""}
                </Typography>
              ))}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid rgba(148,163,184,0.3)",
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Пользователи
              </Typography>
              <TextField
                select
                label="Организация"
                value={userOrgId}
                onChange={(e) => setUserOrgId(e.target.value)}
                sx={{ mb: 1 }}
              >
                {orgs.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Логин"
                value={userUsername}
                onChange={(e) => setUserUsername(e.target.value)}
                sx={{ mb: 1 }}
              />
              <TextField
                type="password"
                label="Пароль"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                sx={{ mb: 1 }}
              />
              <TextField
                select
                label="Роль"
                value={userRole}
                onChange={(e) =>
                  setUserRole(e.target.value as "superadmin" | "org_admin" | "operator")
                }
                sx={{ mb: 2 }}
              >
                <MenuItem value="operator">Оператор</MenuItem>
                <MenuItem value="org_admin">Администратор организации</MenuItem>
                <MenuItem value="superadmin">Суперадмин</MenuItem>
              </TextField>
              <Button
                fullWidth
                disabled={!userOrgId || !userUsername || !userPassword}
                onClick={handleCreateUser}
              >
                Создать пользователя
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

