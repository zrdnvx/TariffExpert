import React, { useState } from "react";
import { useApiClient } from "../api/client";
import { getApiErrorMessage } from "../api/errors";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  TextField,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
} from "@mui/material";

type DetailFormState = {
  address: string;
  total_area: number | "";
  floors_count: number | "";
  year_built: number | "";
  existing_rate: number | "";
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
  has_trees_maintenance: boolean;
  has_sandbox_service: boolean;
  has_icicle_removal: boolean;
};

type DetailComponent = {
  item_number: string;
  name: string;
  normative_rate: string;
  share: string;
  applied_rate: string;
};

type DetailResult = {
  address: string;
  existing_rate: string;
  total_normative_rate: string;
  components: DetailComponent[];
};

export const DetailCalculationPage: React.FC = () => {
  const api = useApiClient();
  const [form, setForm] = useState<DetailFormState>({
    address: "",
    total_area: "",
    floors_count: "",
    year_built: "",
    existing_rate: "",
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
    has_trees_maintenance: false,
    has_sandbox_service: false,
    has_icicle_removal: false,
  });
  const [result, setResult] = useState<DetailResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    address?: boolean;
    total_area?: boolean;
    floors_count?: boolean;
    existing_rate?: boolean;
  }>({});

  const handleChange = (field: keyof DetailFormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const totalArea = Number(form.total_area);
      const floorsCount = Number(form.floors_count);
      const existingRate = Number(form.existing_rate);
      const nextErrors = {
        address: !form.address.trim(),
        total_area: !Number.isFinite(totalArea) || totalArea <= 0,
        floors_count: !Number.isFinite(floorsCount) || floorsCount <= 0,
        existing_rate: !Number.isFinite(existingRate) || existingRate <= 0,
      };
      setFieldErrors(nextErrors);
      if (nextErrors.address || nextErrors.total_area || nextErrors.floors_count || nextErrors.existing_rate) {
        setError("Заполните обязательные поля: адрес, площадь, этажность и имеющуюся плату.");
        return;
      }
      const payload = {
        ...form,
        total_area: totalArea,
        floors_count: floorsCount,
        existing_rate: existingRate,
        year_built: form.year_built === "" ? null : form.year_built,
        fias_id: null,
        has_boiler: false,
        has_central_heating: true,
        has_cleaning_stairs: true,
      };
      const res = await api.post<DetailResult>("/calculations/detail", payload);
      setResult(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Ошибка детализации. Проверьте данные и пароль."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
        Детализация платы
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Введите параметры МКД и фактический размер платы, чтобы разложить её по видам работ
        согласно Приложению 1.
      </Typography>

      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 3,
          mb: 3,
          maxWidth: 960,
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Адрес"
              value={form.address}
              onChange={(e) => {
                handleChange("address", e.target.value);
                setFieldErrors((prev) => ({ ...prev, address: false }));
              }}
              required
              error={Boolean(fieldErrors.address)}
              helperText={fieldErrors.address ? "Введите адрес." : ""}
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
                handleChange("total_area", e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              error={Boolean(fieldErrors.total_area)}
              helperText={fieldErrors.total_area ? "Введите площадь больше 0." : ""}
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
                handleChange("floors_count", e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              error={Boolean(fieldErrors.floors_count)}
              helperText={fieldErrors.floors_count ? "Введите этажность больше 0." : ""}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Год ввода"
              type="number"
              placeholder="Например: 1985"
              value={form.year_built}
              onChange={(e) =>
                handleChange("year_built", e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Имеющаяся плата, руб./м²"
              type="number"
              placeholder="Например: 32.50"
              inputProps={{ min: 0, step: 0.01 }}
              value={form.existing_rate}
              onChange={(e) =>
                handleChange("existing_rate", e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              error={Boolean(fieldErrors.existing_rate)}
              helperText={fieldErrors.existing_rate ? "Введите плату больше 0." : ""}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Инженерные системы
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_cws}
                  onChange={(e) => handleChange("has_cws", e.target.checked)}
                />
              }
              label="Холодное водоснабжение"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_hws}
                  onChange={(e) => handleChange("has_hws", e.target.checked)}
                />
              }
              label="Горячее водоснабжение"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_sewerage}
                  onChange={(e) => handleChange("has_sewerage", e.target.checked)}
                />
              }
              label="Канализация"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_gas}
                  onChange={(e) => handleChange("has_gas", e.target.checked)}
                />
              }
              label="Газ"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_elevator}
                  onChange={(e) => handleChange("has_elevator", e.target.checked)}
                />
              }
              label="Лифты"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_trash_chute}
                  onChange={(e) => handleChange("has_trash_chute", e.target.checked)}
                />
              }
              label="Мусоропровод"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_fire_alarm}
                  onChange={(e) => handleChange("has_fire_alarm", e.target.checked)}
                />
              }
              label="Пожарная сигнализация"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_local_boiler}
                  onChange={(e) => handleChange("has_local_boiler", e.target.checked)}
                />
              }
              label="Локальная котельная"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_recirculation_pumps}
                  onChange={(e) => handleChange("has_recirculation_pumps", e.target.checked)}
                />
              }
              label="Рециркуляционные насосы ГВС"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_askue}
                  onChange={(e) => handleChange("has_askue", e.target.checked)}
                />
              }
              label="АСКУЭ / узлы учета"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Благоустройство
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_trees_maintenance}
                  onChange={(e) => handleChange("has_trees_maintenance", e.target.checked)}
                />
              }
              label="Благоустройство / снос аварийных деревьев (2.4.6)"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_sandbox_service}
                  onChange={(e) => handleChange("has_sandbox_service", e.target.checked)}
                />
              }
              label="Замена песка в песочницах (2.4.8)"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.has_icicle_removal}
                  onChange={(e) => handleChange("has_icicle_removal", e.target.checked)}
                />
              }
              label="Удаление наледей и сосулек (2.4.9)"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Button type="submit" disabled={loading}>
            {loading ? "Считаем..." : "Рассчитать детализацию"}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      {result && (
        <Box sx={{ mt: 3 }}>
          <Paper
            sx={{
              p: 3,
              mb: 2,
              border: "1px solid rgba(148,163,184,0.3)",
            }}
          >
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Итоги детализации
            </Typography>
            <Typography variant="body2">
              Адрес: <strong>{result.address}</strong>
            </Typography>
            <Typography variant="body2">
              Имеющаяся плата: <strong>{result.existing_rate}</strong> руб./м²
            </Typography>
            <Typography variant="body2">
              Нормативная сумма: <strong>{result.total_normative_rate}</strong> руб./м²
            </Typography>
          </Paper>

          <TableContainer
            component={Paper}
            sx={{ border: "1px solid rgba(148,163,184,0.3)", maxHeight: 480 }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>№ п/п</TableCell>
                  <TableCell>Вид работ</TableCell>
                  <TableCell align="right">Норматив, руб./м²</TableCell>
                  <TableCell align="right">Доля</TableCell>
                  <TableCell align="right">Распределенная плата, руб./м²</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.components?.map((item) => (
                  <TableRow key={item.item_number + item.name} hover>
                    <TableCell>{item.item_number}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right">{item.normative_rate}</TableCell>
                    <TableCell align="right">{item.share}</TableCell>
                    <TableCell align="right">{item.applied_rate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

