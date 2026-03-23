import React, { useEffect, useState } from "react";
import { useApiClient } from "../api/client";
import { useLocation } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
} from "@mui/material";

type BuildingOption = {
  id: string;
  address: string;
};

type CalculationItem = {
  item_number: string;
  name: string;
  applied_rate: string;
};

type CalculationResult = {
  id: string;
  total_rate: string;
  items: CalculationItem[];
};

export const CalculationRunPage: React.FC = () => {
  const api = useApiClient();
  const location = useLocation();
  const [buildingId, setBuildingId] = useState<string>("");
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get("buildingId");
    if (fromUrl) {
      setBuildingId(fromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<BuildingOption[]>("/buildings/");
        setBuildings(res.data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Не удалось загрузить список домов."));
      }
    };
    void load();
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<CalculationResult>(`/calculations/${buildingId}/run`);
      setResult(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Ошибка расчета. Проверьте дом и авторизацию."));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!result?.id) return;
    try {
      const res = await api.get(`/calculations/${result.id}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `calculation_${result.id}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiErrorMessage(err, "Ошибка выгрузки в Excel."));
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
        Расчет размера платы
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Вставьте идентификатор дома, созданного на предыдущем шаге, и выполните расчет по
        утвержденным тарифам.
      </Typography>

      <Paper
        sx={{
          p: 3,
          mb: 3,
          maxWidth: 720,
          border: "1px solid rgba(148,163,184,0.3)",
          background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6))",
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}
        >
          <TextField
            select
            label="Дом"
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 260 }}
          >
            {buildings.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.address}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit" disabled={loading || !buildingId}>
            {loading ? "Считаем..." : "Рассчитать"}
          </Button>
        </Box>
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Paper>

      {result && (
        <Box>
          <Paper
            sx={{
              p: 3,
              mb: 2,
              border: "1px solid rgba(148,163,184,0.3)",
              background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.7))",
            }}
          >
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Результаты расчета
            </Typography>
            <Typography variant="body2">
              ID расчета: <code>{result.id}</code>
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              Итоговая ставка: <strong>{result.total_rate}</strong> руб./м²
            </Typography>
            <Button sx={{ mt: 2 }} variant="outlined" color="secondary" onClick={handleExport}>
              Выгрузить в Excel
            </Button>
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
                  <TableCell align="right">Ставка, руб./м²</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items?.map((item) => (
                  <TableRow key={item.item_number + item.name} hover>
                    <TableCell>{item.item_number}</TableCell>
                    <TableCell>{item.name}</TableCell>
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

