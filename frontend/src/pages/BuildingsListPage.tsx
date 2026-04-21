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
  FormControl,
  Grid,
  InputLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";

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
  is_apartment_building: boolean;
  house_type: "monolith_brick" | "reinforced_concrete" | "other_low_capital" | null;
};

export const BuildingsListPage: React.FC = () => {
  const api = useApiClient();
  const navigate = useNavigate();
  const [items, setItems] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Building | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  type BuildingCreateForm = {
    address: string;
    total_area: number | "";
    floors_count: number | "";
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
    is_apartment_building: boolean;
    house_type: "monolith_brick" | "reinforced_concrete" | "other_low_capital";
  };
  type BuildingFormKey = keyof BuildingCreateForm;

  const [form, setForm] = useState<BuildingCreateForm>({
    address: "",
    total_area: "",
    floors_count: "",
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
    is_apartment_building: true,
    house_type: "monolith_brick",
  });
  const [formErrors, setFormErrors] = useState<{
    address?: boolean;
    total_area?: boolean;
    floors_count?: boolean;
  }>({});

  const [editForm, setEditForm] = useState<BuildingCreateForm | null>(null);
  const [editFormErrors, setEditFormErrors] = useState<{
    address?: boolean;
    total_area?: boolean;
    floors_count?: boolean;
  }>({});

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

  const openEdit = () => {
    if (!selected) return;
    setEditForm({
      address: selected.address,
      total_area: Number(selected.total_area),
      floors_count: selected.floors_count,
      year_built: selected.year_built ?? "",
      has_cws: selected.has_cws,
      has_hws: selected.has_hws,
      has_sewerage: selected.has_sewerage,
      has_gas: selected.has_gas,
      has_elevator: selected.has_elevator,
      has_trash_chute: selected.has_trash_chute,
      has_fire_alarm: selected.has_fire_alarm,
      has_local_boiler: selected.has_local_boiler,
      has_recirculation_pumps: selected.has_recirculation_pumps,
      has_askue: selected.has_askue,
      has_cleaning_stairs: selected.has_cleaning_stairs,
      has_trees_maintenance: selected.has_trees_maintenance,
      has_sandbox_service: selected.has_sandbox_service,
      has_icicle_removal: selected.has_icicle_removal,
      is_apartment_building: selected.is_apartment_building,
      house_type: selected.house_type ?? "monolith_brick",
    });
    setEditOpen(true);
    setEditFormErrors({});
  };

  const saveEdit = async () => {
    if (!selected || !editForm) return;
    setSavingEdit(true);
    setError(null);
    try {
      const totalArea = Number(editForm.total_area);
      const floorsCount = Number(editForm.floors_count);
      const nextErrors = {
        address: !editForm.address.trim(),
        total_area: !Number.isFinite(totalArea) || totalArea <= 0,
        floors_count: !Number.isFinite(floorsCount) || floorsCount <= 0,
      };
      setEditFormErrors(nextErrors);
      if (nextErrors.address || nextErrors.total_area || nextErrors.floors_count) {
        setError("Заполните обязательные поля: адрес, площадь и этажность.");
        return;
      }
      const payload = {
        ...editForm,
        total_area: totalArea,
        floors_count: floorsCount,
        year_built: editForm.year_built === "" ? null : editForm.year_built,
        house_type: editForm.is_apartment_building ? editForm.house_type : null,
      };
      const res = await api.patch<Building>(`/buildings/${selected.id}`, payload);
      // обновить выбранный и список
      setSelected(res.data);
      setItems((prev) => prev.map((b) => (b.id === res.data.id ? res.data : b)));
      setEditOpen(false);
    } catch (e) {
      setError(getApiErrorMessage(e, "Ошибка сохранения дома."));
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteBuilding = async () => {
    if (!selected) return;
    const ok = window.confirm("Удалить этот дом и все его расчеты? Действие нельзя отменить.");
    if (!ok) return;
    try {
      await api.delete(`/buildings/${selected.id}`);
      setItems((prev) => prev.filter((b) => b.id !== selected.id));
      setDetailOpen(false);
      setSelected(null);
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось удалить дом."));
    }
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
        <Button
          variant="contained"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadBuildings}
          disabled={loading}
        >
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
                onChange={(e) => {
                  setForm((p) => ({ ...p, address: e.target.value }));
                  setFormErrors((prev) => ({ ...prev, address: false }));
                }}
                error={Boolean(formErrors.address)}
                helperText={formErrors.address ? "Введите адрес." : ""}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Общая площадь, м²"
                type="number"
                placeholder="Например: 12345.67"
                inputProps={{ min: 0, step: 0.01 }}
                value={form.total_area}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    total_area: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                error={Boolean(formErrors.total_area)}
                helperText={formErrors.total_area ? "Введите площадь больше 0." : ""}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Этажность"
                type="number"
                placeholder="Например: 9"
                inputProps={{ min: 1 }}
                value={form.floors_count}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    floors_count: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                error={Boolean(formErrors.floors_count)}
                helperText={formErrors.floors_count ? "Введите этажность больше 0." : ""}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Год ввода"
                type="number"
                placeholder="Например: 1985"
                value={form.year_built}
                onChange={(e) =>
                    setForm((p) => ({ ...p, year_built: e.target.value === "" ? "" : Number(e.target.value) }))
                }
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="building-kind-label">Тип объекта</InputLabel>
                <Select
                  labelId="building-kind-label"
                  label="Тип объекта"
                  value={form.is_apartment_building ? "mkd" : "other"}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, is_apartment_building: e.target.value === "mkd" }))
                  }
                >
                  <MenuItem value="mkd">Многоквартирный дом</MenuItem>
                  <MenuItem value="other">Прочий объект (склад и т.д.)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {form.is_apartment_building && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="house-type-add-label">Тип многоквартирного дома (К1)</InputLabel>
                  <Select
                    labelId="house-type-add-label"
                    label="Тип многоквартирного дома (К1)"
                    value={form.house_type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, house_type: e.target.value as BuildingCreateForm["house_type"] }))
                    }
                  >
                    <MenuItem value="monolith_brick">Монолитные/кирпичные стены (К1 = 1.00)</MenuItem>
                    <MenuItem value="reinforced_concrete">Железобетонные стены (К1 = 1.25)</MenuItem>
                    <MenuItem value="other_low_capital">Пониженная капитальность, прочие материалы (К1 = 1.50)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
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
                const totalArea = Number(form.total_area);
                const floorsCount = Number(form.floors_count);
                const nextErrors = {
                  address: !form.address.trim(),
                  total_area: !Number.isFinite(totalArea) || totalArea <= 0,
                  floors_count: !Number.isFinite(floorsCount) || floorsCount <= 0,
                };
                setFormErrors(nextErrors);
                if (nextErrors.address || nextErrors.total_area || nextErrors.floors_count) {
                  setError("Заполните обязательные поля: адрес, площадь и этажность.");
                  return;
                }
                const payload = {
                  ...form,
                  total_area: totalArea,
                  floors_count: floorsCount,
                  year_built: form.year_built === "" ? null : form.year_built,
                  fias_id: null,
                  has_central_heating: true,
                  house_type: form.is_apartment_building ? form.house_type : null,
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
                {selected.fias_id ? (
                  <Typography variant="body2">
                    <strong>Код ФИАС:</strong> {selected.fias_id}
                  </Typography>
                ) : null}
                <Typography variant="body2">
                  <strong>Общая площадь:</strong> {Number(selected.total_area)} м²
                </Typography>
                <Typography variant="body2">
                  <strong>Этажность:</strong> {selected.floors_count}
                </Typography>
                <Typography variant="body2">
                  <strong>Год ввода:</strong> {selected.year_built ?? "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Тип объекта:</strong> {selected.is_apartment_building ? "Многоквартирный дом" : "Прочий объект"}
                </Typography>
                {selected.is_apartment_building && (
                  <Typography variant="body2">
                    <strong>Тип дома (К1):</strong>{" "}
                    {selected.house_type === "reinforced_concrete"
                      ? "Железобетонные стены"
                      : selected.house_type === "other_low_capital"
                        ? "Пониженная капитальность, прочие материалы"
                        : "Монолитные/кирпичные стены"}
                  </Typography>
                )}
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
          <Button
            startIcon={<EditIcon />}
            onClick={() => {
              openEdit();
            }}
            disabled={!selected}
          >
            Редактировать
          </Button>
          <Button color="error" startIcon={<DeleteIcon />} onClick={() => void deleteBuilding()}>
            Удалить дом
          </Button>
          <Button onClick={() => setDetailOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen && !!editForm}
        onClose={() => setEditOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Редактирование дома</DialogTitle>
        <DialogContent>
          {editForm && (
            <>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Адрес"
                    value={editForm.address}
                    onChange={(e) => {
                      setEditForm((p) => (p ? { ...p, address: e.target.value } : p));
                      setEditFormErrors((prev) => ({ ...prev, address: false }));
                    }}
                    required
                    error={Boolean(editFormErrors.address)}
                    helperText={editFormErrors.address ? "Введите адрес." : ""}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Общая площадь, м²"
                    type="number"
                    placeholder="Например: 12345.67"
                    inputProps={{ min: 0, step: 0.01 }}
                    value={editForm.total_area}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p
                          ? { ...p, total_area: e.target.value === "" ? "" : Number(e.target.value) }
                          : p,
                      )
                    }
                    required
                    error={Boolean(editFormErrors.total_area)}
                    helperText={editFormErrors.total_area ? "Введите площадь больше 0." : ""}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Этажность"
                    type="number"
                    placeholder="Например: 9"
                    inputProps={{ min: 1 }}
                    value={editForm.floors_count}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p
                          ? { ...p, floors_count: e.target.value === "" ? "" : Number(e.target.value) }
                          : p,
                      )
                    }
                    required
                    error={Boolean(editFormErrors.floors_count)}
                    helperText={editFormErrors.floors_count ? "Введите этажность больше 0." : ""}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Год ввода"
                    type="number"
                    placeholder="Например: 1985"
                    value={editForm.year_built}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p
                          ? { ...p, year_built: e.target.value === "" ? "" : Number(e.target.value) }
                          : p,
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel id="edit-building-kind-label">Тип объекта</InputLabel>
                    <Select
                      labelId="edit-building-kind-label"
                      label="Тип объекта"
                      value={editForm.is_apartment_building ? "mkd" : "other"}
                      onChange={(e) =>
                        setEditForm((p) =>
                          p ? { ...p, is_apartment_building: e.target.value === "mkd" } : p,
                        )
                      }
                    >
                      <MenuItem value="mkd">Многоквартирный дом</MenuItem>
                      <MenuItem value="other">Прочий объект (склад и т.д.)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {editForm.is_apartment_building && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="edit-house-type-label">Тип многоквартирного дома (К1)</InputLabel>
                      <Select
                        labelId="edit-house-type-label"
                        label="Тип многоквартирного дома (К1)"
                        value={editForm.house_type}
                        onChange={(e) =>
                          setEditForm((p) =>
                            p
                              ? {
                                  ...p,
                                  house_type: e.target.value as BuildingCreateForm["house_type"],
                                }
                              : p,
                          )
                        }
                      >
                        <MenuItem value="monolith_brick">Монолитные/кирпичные стены (К1 = 1.00)</MenuItem>
                        <MenuItem value="reinforced_concrete">Железобетонные стены (К1 = 1.25)</MenuItem>
                        <MenuItem value="other_low_capital">Пониженная капитальность, прочие материалы (К1 = 1.50)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
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
                          checked={Boolean(editForm[key as BuildingFormKey])}
                          onChange={(e) =>
                            setEditForm((p) =>
                              p ? ({ ...p, [key]: e.target.checked } as BuildingCreateForm) : p,
                            )
                          }
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
                          checked={Boolean(editForm[key as BuildingFormKey])}
                          onChange={(e) =>
                            setEditForm((p) =>
                              p ? ({ ...p, [key]: e.target.checked } as BuildingCreateForm) : p,
                            )
                          }
                        />
                      }
                      label={label}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" color="inherit" onClick={() => setEditOpen(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => void saveEdit()}
            disabled={savingEdit || !editForm?.address}
            startIcon={<SaveIcon />}
          >
            {savingEdit ? "Сохраняем..." : "Сохранить"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

