import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiClient } from "../api/client";
import { getApiErrorMessage } from "../api/errors";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CalculateIcon from "@mui/icons-material/Calculate";
import AddIcon from "@mui/icons-material/Add";

type Building = {
  id: string;
  address: string;
  fias_id?: string | null;
  total_area: number;
  floors_count: number;
  year_built: number | null;
  has_cws: boolean;
  has_hws: boolean;
  has_sewerage: boolean;
  has_gas: boolean;
  has_elevator: boolean;
  has_trash_chute: boolean;
  has_fire_alarm: boolean;
  has_central_heating: boolean;
  has_local_boiler: boolean;
  has_recirculation_pumps: boolean;
  has_askue: boolean;
  has_cleaning_stairs: boolean;
  has_trees_maintenance: boolean;
  has_sandbox_service: boolean;
  has_icicle_removal: boolean;
};

export const BuildingsListPage: React.FC = () => {
  const api = useApiClient();
  const navigate = useNavigate();
  const [items, setItems] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Building | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  type BuildingCreateForm = {
    address: string;
    total_area: number;
    floors_count: number;
    year_built: number | "";
    has_cws: boolean;
    has_hws: boolean;
    has_sewerage: boolean;
    has_gas: boolean;
    has_elevator: boolean;
    has_trash_chute: boolean;
    has_fire_alarm: boolean;
    has_local_boiler: boolean;
    has_recirculation_pumps: boolean;
    has_askue: boolean;
    has_cleaning_stairs: boolean;
    has_trees_maintenance: boolean;
    has_sandbox_service: boolean;
    has_icicle_removal: boolean;
  };

  const [form, setForm] = useState<BuildingCreateForm>({
    address: "",
    total_area: 0,
    floors_count: 1,
    year_built: "",
    has_cws: true,
    has_hws: false,
    has_sewerage: true,
    has_gas: false,
    has_elevator: false,
    has_trash_chute: false,
    has_fire_alarm: false,
    has_local_boiler: false,
    has_recirculation_pumps: false,
    has_askue: false,
    has_cleaning_stairs: true,
    has_trees_maintenance: false,
    has_sandbox_service: false,
    has_icicle_removal: false,
  });

  const loadBuildings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Building[]>("/buildings/");
      setItems(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить список домов."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBuildings();
  }, []);

  const goToCalculation = (id: string) => {
    navigate(`/calculations/run?buildingId=${id}`);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
        Объекты организации
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Здесь отображаются все многоквартирные дома вашей организации. Отсюда можно перейти к
        расчету платы по каждому дому.
      </Typography>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button variant="outlined" size="small" onClick={loadBuildings} disabled={loading}>
          Обновить
        </Button>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Добавить МКД
        </Button>
      </Box>
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Добавить многоквартирный дом</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Заполните данные дома. Эти параметры используются в расчёте и детализации платы.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Адрес"
                value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Общая площадь, м²"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={form.total_area}
                  onChange={(e) => setForm((p) => ({ ...p, total_area: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Этажность"
                type="number"
                inputProps={{ min: 1 }}
                value={form.floors_count}
                  onChange={(e) => setForm((p) => ({ ...p, floors_count: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Год ввода"
                type="number"
                value={form.year_built}
                onChange={(e) =>
                    setForm((p) => ({ ...p, year_built: e.target.value === "" ? "" : Number(e.target.value) }))
                }
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Инженерные системы
          </Typography>
          <Grid container spacing={1}>
            {[
              ["has_cws", "Холодное водоснабжение"],
              ["has_hws", "Горячее водоснабжение"],
              ["has_sewerage", "Канализация"],
              ["has_gas", "Газ"],
              ["has_elevator", "Лифты"],
              ["has_trash_chute", "Мусоропровод"],
              ["has_fire_alarm", "Пожарная сигнализация"],
              ["has_local_boiler", "Локальная котельная"],
              ["has_recirculation_pumps", "Рециркуляционные насосы ГВС"],
              ["has_askue", "АСКУЭ / узлы учета"],
              ["has_cleaning_stairs", "Уборка лестничных клеток"],
            ].map(([key, label]) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(form[key])}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                    />
                  }
                  label={label}
                />
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Благоустройство
          </Typography>
          <Grid container spacing={1}>
            {[
              ["has_trees_maintenance", "Снос аварийных деревьев (2.4.6)"],
              ["has_sandbox_service", "Замена песка в песочницах (2.4.8)"],
              ["has_icicle_removal", "Удаление наледей и сосулек (2.4.9)"],
            ].map(([key, label]) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(form[key])}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                    />
                  }
                  label={label}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" color="inherit" onClick={() => setAddOpen(false)}>
            Отмена
          </Button>
          <Button
            disabled={creating || !form.address}
            onClick={async () => {
              try {
                setCreating(true);
                const payload = {
                  ...form,
                  year_built: form.year_built === "" ? null : form.year_built,
                  fias_id: null,
                  has_central_heating: true,
                };
                await api.post("/buildings/", payload);
                setAddOpen(false);
                await loadBuildings();
              } catch (e) {
                setError(getApiErrorMessage(e, "Ошибка создания МКД."));
              } finally {
                setCreating(false);
              }
            }}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      <TableContainer
        component={Paper}
        sx={{
          mt: 2,
          border: "1px solid rgba(148,163,184,0.3)",
          maxHeight: 520,
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Адрес</TableCell>
              <TableCell align="right">Площадь, м²</TableCell>
              <TableCell align="right">Этажность</TableCell>
              <TableCell align="right">Год ввода</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((b) => (
              <TableRow
                key={b.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => {
                  setSelected(b);
                  setDetailOpen(true);
                }}
              >
                <TableCell>{b.address}</TableCell>
                <TableCell align="right">{Number(b.total_area)}</TableCell>
                <TableCell align="right">{b.floors_count}</TableCell>
                <TableCell align="right">{b.year_built ?? "—"}</TableCell>
                <TableCell align="center">
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToCalculation(b.id);
                    }}
                    title="Рассчитать плату"
                  >
                    <CalculateIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={detailOpen && !!selected}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Карточка дома</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                  Основные параметры
                </Typography>
                <Typography variant="body2">
                  <strong>Адрес:</strong> {selected.address}
                </Typography>
                <Typography variant="body2">
                  <strong>FIAS ID:</strong> {selected.fias_id ?? "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Общая площадь:</strong> {Number(selected.total_area)} м²
                </Typography>
                <Typography variant="body2">
                  <strong>Этажность:</strong> {selected.floors_count}
                </Typography>
                <Typography variant="body2">
                  <strong>Год ввода:</strong> {selected.year_built ?? "—"}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                  Инженерные системы
                </Typography>
                <Grid container spacing={1}>
                  {[
                    ["Холодное водоснабжение", selected.has_cws],
                    ["Горячее водоснабжение", selected.has_hws],
                    ["Канализация", selected.has_sewerage],
                    ["Газ", selected.has_gas],
                    ["Лифты", selected.has_elevator],
                    ["Мусоропровод", selected.has_trash_chute],
                    ["Пожарная сигнализация", selected.has_fire_alarm],
                    ["Централизованное отопление", selected.has_central_heating],
                    ["Локальная котельная", selected.has_local_boiler],
                    ["Рециркуляционные насосы ГВС", selected.has_recirculation_pumps],
                    ["АСКУЭ / узлы учета", selected.has_askue],
                    ["Уборка лестничных клеток", selected.has_cleaning_stairs],
                  ].map(([label, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={label as string}>
                      <Typography variant="body2">
                        <strong>{label}:</strong> {value ? "Да" : "Нет"}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                  Благоустройство
                </Typography>
                <Grid container spacing={1}>
                  {[
                    ["Снос аварийных деревьев (2.4.6)", selected.has_trees_maintenance],
                    ["Замена песка в песочницах (2.4.8)", selected.has_sandbox_service],
                    ["Удаление наледей и сосулек (2.4.9)", selected.has_icicle_removal],
                  ].map(([label, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={label as string}>
                      <Typography variant="body2">
                        <strong>{label}:</strong> {value ? "Да" : "Нет"}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

