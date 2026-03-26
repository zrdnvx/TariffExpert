import React, { useEffect, useState } from "react";
import { useApiClient } from "../api/client";
import { getApiErrorMessage } from "../api/errors";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";

type Tariff = {
  id: number;
  item_number: string;
  name: string;
  rate: number;
  category: string;
  is_active: boolean;
  min_area?: number | null;
  max_area?: number | null;
  is_elevator_required?: boolean | null;
  is_gas_required?: boolean | null;
  min_floors?: number | null;
};

type CityOption = {
  id: string;
  name: string;
  region: string | null;
};

export const TariffsPage: React.FC = () => {
  const api = useApiClient();
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<number, string>>({});

  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTariffId, setEditingTariffId] = useState<number | null>(null);
  const [newTariff, setNewTariff] = useState({
    item_number: "",
    name: "",
    rate: "",
    category: "maintenance",
    is_active: true,
    min_area: "",
    max_area: "",
    is_elevator_required: "",
    is_gas_required: "",
    min_floors: "",
  });
  const [editTariff, setEditTariff] = useState({
    name: "",
    rate: "",
    category: "maintenance",
    is_active: true,
    min_area: "",
    max_area: "",
    is_elevator_required: "",
    is_gas_required: "",
    min_floors: "",
  });

  const loadTariffs = async (cityId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Tariff[]>("/tariffs/", {
        params: cityId ? { city_id: cityId } : {},
      });
      setTariffs(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить тарифы. Проверьте пароль и состояние API."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // Города, в которых у организации есть объекты
        const citiesRes = await api.get<CityOption[]>("/buildings/cities");
        const cityList = citiesRes.data;
        setCities(cityList);
        const firstCityId = cityList[0]?.id ?? "";
        setSelectedCityId((prev) => prev || firstCityId);
        await loadTariffs(firstCityId || undefined);
      } catch (err) {
        setError(getApiErrorMessage(err, "Не удалось загрузить города организации."));
        // Даже если не удалось загрузить города, попробуем загрузить тарифы по умолчанию
        await loadTariffs();
      }
    };
    void init();
  }, [api]);

  const handleChangeRate = (id: number, value: string) => {
    setEditing((prev) => ({ ...prev, [id]: value }));
  };

  const categoryLabel = (value: string): string => {
    switch (value) {
      case "maintenance":
        return "Содержание";
      case "repair":
        return "Текущий ремонт";
      case "management":
        return "Управление";
      default:
        return value;
    }
  };

  const handleSaveRate = async (t: Tariff) => {
    const value = editing[t.id];
    if (!value) return;
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate <= 0) {
      setError("Ставка должна быть положительным числом.");
      return;
    }
    try {
      await api.patch(`/tariffs/${t.id}`, { rate });
      await loadTariffs(selectedCityId || undefined);
      setEditing((prev) => {
        const next = { ...prev };
        delete next[t.id];
        return next;
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Ошибка сохранения тарифа."));
    }
  };

  const openEditDialog = (t: Tariff) => {
    setEditingTariffId(t.id);
    setEditTariff({
      name: t.name,
      rate: String(t.rate),
      category: t.category,
      is_active: t.is_active,
      min_area: t.min_area == null ? "" : String(t.min_area),
      max_area: t.max_area == null ? "" : String(t.max_area),
      is_elevator_required:
        t.is_elevator_required == null ? "" : String(t.is_elevator_required),
      is_gas_required: t.is_gas_required == null ? "" : String(t.is_gas_required),
      min_floors: t.min_floors == null ? "" : String(t.min_floors),
    });
    setEditOpen(true);
  };

  const saveTariffEdit = async () => {
    if (!editingTariffId) return;
    const rate = Number(editTariff.rate);
    if (!editTariff.name.trim() || !Number.isFinite(rate) || rate <= 0) {
      setError("Заполните наименование и корректную ставку.");
      return;
    }
    const payload: any = {
      name: editTariff.name.trim(),
      rate,
      category: editTariff.category,
      is_active: editTariff.is_active,
      min_area: editTariff.min_area === "" ? null : Number(editTariff.min_area),
      max_area: editTariff.max_area === "" ? null : Number(editTariff.max_area),
      min_floors: editTariff.min_floors === "" ? null : Number(editTariff.min_floors),
      is_elevator_required:
        editTariff.is_elevator_required === ""
          ? null
          : editTariff.is_elevator_required === "true",
      is_gas_required:
        editTariff.is_gas_required === "" ? null : editTariff.is_gas_required === "true",
    };
    try {
      await api.patch(`/tariffs/${editingTariffId}`, payload);
      setEditOpen(false);
      setEditingTariffId(null);
      await loadTariffs(selectedCityId || undefined);
    } catch (err) {
      setError(getApiErrorMessage(err, "Ошибка редактирования тарифа."));
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
        Справочник тарифов (Приложение 1)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Актуальные значения ставок используются во всех расчетах. Изменения применяются сразу после
        сохранения.
      </Typography>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1 }}>
        <TextField
          select
          size="small"
          label="Город"
          value={selectedCityId}
          onChange={async (e) => {
            const nextId = e.target.value;
            setSelectedCityId(nextId);
            await loadTariffs(nextId || undefined);
          }}
          sx={{ minWidth: 220 }}
        >
          {cities.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
              {c.region ? ` (${c.region})` : ""}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => void loadTariffs(selectedCityId || undefined)}
          disabled={loading}
        >
          Обновить
        </Button>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Добавить тариф
        </Button>
      </Box>
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить тариф</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Тариф добавится для текущего города. Заполняй строго как в Приложении 1.
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              label="№ пункта"
              value={newTariff.item_number}
              onChange={(e) => setNewTariff((p) => ({ ...p, item_number: e.target.value }))}
            />
            <TextField
              select
              label="Категория"
              value={newTariff.category}
              onChange={(e) => setNewTariff((p) => ({ ...p, category: e.target.value }))}
            >
              <MenuItem value="maintenance">Содержание</MenuItem>
              <MenuItem value="repair">Текущий ремонт</MenuItem>
              <MenuItem value="management">Управление</MenuItem>
            </TextField>
            <TextField
              label="Ставка, руб./м²"
              value={newTariff.rate}
              onChange={(e) => setNewTariff((p) => ({ ...p, rate: e.target.value }))}
            />
            <TextField
              select
              label="Активен"
              value={String(newTariff.is_active)}
              onChange={(e) =>
                setNewTariff((p) => ({ ...p, is_active: e.target.value === "true" }))
              }
            >
              <MenuItem value="true">Да</MenuItem>
              <MenuItem value="false">Нет</MenuItem>
            </TextField>
            <TextField
              label="Наименование"
              value={newTariff.name}
              onChange={(e) => setNewTariff((p) => ({ ...p, name: e.target.value }))}
              sx={{ gridColumn: "1 / 3" }}
            />
            <TextField
              label="Мин. площадь, м² (опц.)"
              value={newTariff.min_area}
              onChange={(e) => setNewTariff((p) => ({ ...p, min_area: e.target.value }))}
            />
            <TextField
              label="Макс. площадь, м² (опц.)"
              value={newTariff.max_area}
              onChange={(e) => setNewTariff((p) => ({ ...p, max_area: e.target.value }))}
            />
            <TextField
              select
              label="Требует лифт (опц.)"
              value={newTariff.is_elevator_required}
              onChange={(e) =>
                setNewTariff((p) => ({ ...p, is_elevator_required: e.target.value }))
              }
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="true">Да</MenuItem>
              <MenuItem value="false">Нет</MenuItem>
            </TextField>
            <TextField
              select
              label="Требует газ (опц.)"
              value={newTariff.is_gas_required}
              onChange={(e) =>
                setNewTariff((p) => ({ ...p, is_gas_required: e.target.value }))
              }
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="true">Да</MenuItem>
              <MenuItem value="false">Нет</MenuItem>
            </TextField>
            <TextField
              label="Мин. этажность (опц.)"
              value={newTariff.min_floors}
              onChange={(e) => setNewTariff((p) => ({ ...p, min_floors: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" color="inherit" onClick={() => setAddOpen(false)}>
            Отмена
          </Button>
          <Button
            onClick={async () => {
              try {
                const rate = Number(newTariff.rate);
                if (!newTariff.item_number.trim() || !newTariff.name.trim() || !Number.isFinite(rate) || rate <= 0) {
                  setError("Заполните № пункта, наименование и корректную ставку.");
                  return;
                }
                const payload: any = {
                  item_number: newTariff.item_number.trim(),
                  name: newTariff.name.trim(),
                  rate,
                  category: newTariff.category,
                  is_active: newTariff.is_active,
                };
                if (newTariff.min_area) payload.min_area = Number(newTariff.min_area);
                if (newTariff.max_area) payload.max_area = Number(newTariff.max_area);
                if (newTariff.min_floors) payload.min_floors = Number(newTariff.min_floors);
                if (newTariff.is_elevator_required !== "") payload.is_elevator_required = newTariff.is_elevator_required === "true";
                if (newTariff.is_gas_required !== "") payload.is_gas_required = newTariff.is_gas_required === "true";

                await api.post("/tariffs/", payload);
                setAddOpen(false);
                setNewTariff({
                  item_number: "",
                  name: "",
                  rate: "",
                  category: "maintenance",
                  is_active: true,
                  min_area: "",
                  max_area: "",
                  is_elevator_required: "",
                  is_gas_required: "",
                  min_floors: "",
                });
                await loadTariffs(selectedCityId || undefined);
              } catch (e) {
                setError(getApiErrorMessage(e, "Ошибка добавления тарифа."));
              }
            }}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать тариф</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              select
              label="Категория"
              value={editTariff.category}
              onChange={(e) => setEditTariff((p) => ({ ...p, category: e.target.value }))}
            >
              <MenuItem value="maintenance">Содержание</MenuItem>
              <MenuItem value="repair">Текущий ремонт</MenuItem>
              <MenuItem value="management">Управление</MenuItem>
            </TextField>
            <TextField
              select
              label="Активен"
              value={String(editTariff.is_active)}
              onChange={(e) =>
                setEditTariff((p) => ({ ...p, is_active: e.target.value === "true" }))
              }
            >
              <MenuItem value="true">Да</MenuItem>
              <MenuItem value="false">Нет</MenuItem>
            </TextField>
            <TextField
              label="Ставка, руб./м²"
              value={editTariff.rate}
              onChange={(e) => setEditTariff((p) => ({ ...p, rate: e.target.value }))}
            />
            <TextField
              label="Наименование"
              value={editTariff.name}
              onChange={(e) => setEditTariff((p) => ({ ...p, name: e.target.value }))}
            />
            <TextField
              label="Мин. площадь, м² (опц.)"
              value={editTariff.min_area}
              onChange={(e) => setEditTariff((p) => ({ ...p, min_area: e.target.value }))}
            />
            <TextField
              label="Макс. площадь, м² (опц.)"
              value={editTariff.max_area}
              onChange={(e) => setEditTariff((p) => ({ ...p, max_area: e.target.value }))}
            />
            <TextField
              select
              label="Требует лифт (опц.)"
              value={editTariff.is_elevator_required}
              onChange={(e) =>
                setEditTariff((p) => ({ ...p, is_elevator_required: e.target.value }))
              }
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="true">Да</MenuItem>
              <MenuItem value="false">Нет</MenuItem>
            </TextField>
            <TextField
              select
              label="Требует газ (опц.)"
              value={editTariff.is_gas_required}
              onChange={(e) =>
                setEditTariff((p) => ({ ...p, is_gas_required: e.target.value }))
              }
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="true">Да</MenuItem>
              <MenuItem value="false">Нет</MenuItem>
            </TextField>
            <TextField
              label="Мин. этажность (опц.)"
              value={editTariff.min_floors}
              onChange={(e) => setEditTariff((p) => ({ ...p, min_floors: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" color="inherit" onClick={() => setEditOpen(false)}>
            Отмена
          </Button>
          <Button onClick={() => void saveTariffEdit()} startIcon={<SaveIcon />}>
            Сохранить
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
              <TableCell>№ п/п</TableCell>
              <TableCell>Вид работ</TableCell>
              <TableCell>Категория</TableCell>
              <TableCell align="right">Ставка, руб./м²</TableCell>
              <TableCell align="center">Активен</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tariffs.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.item_number}</TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>{categoryLabel(t.category)}</TableCell>
                <TableCell align="right" sx={{ minWidth: 120 }}>
                  <TextField
                    type="number"
                    size="small"
                    inputProps={{ step: 0.001 }}
                    value={editing[t.id] ?? t.rate}
                    onChange={(e) => handleChangeRate(t.id, e.target.value)}
                  />
                </TableCell>
                <TableCell align="center">{t.is_active ? "Да" : "Нет"}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleSaveRate(t)} size="small" title="Сохранить ставку">
                    <SaveIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={() => openEditDialog(t)}
                    size="small"
                    title="Редактировать тариф"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

