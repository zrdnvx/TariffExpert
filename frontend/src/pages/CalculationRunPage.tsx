import React, { useEffect, useState } from "react";
import { useApiClient } from "../api/client";
import { useLocation } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import { CalculationHistoryPage } from "./CalculationHistoryPage";
import {
  Box,
  Button,
  Paper,
  Tab,
  Tabs,
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
import DownloadIcon from "@mui/icons-material/Download";

type BuildingOption = {
  id: string;
  address: string;
};

type CalculationItem = {
  item_number: string;
  name: string;
  applied_rate: string;
  formula_label?: string | null;
  formula_substitution?: string | null;
};

type CalculationResult = {
  id: string;
  total_rate: string;
  items: CalculationItem[];
};

const extractFilenameFromDisposition = (header?: string): string | null => {
  if (!header) return null;
  const utfMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }
  const asciiMatch = header.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] ?? null;
};

export const CalculationRunPage: React.FC = () => {
  const api = useApiClient();
  const location = useLocation();
  const [tab, setTab] = useState(0);
  const [justCreatedCalculationId, setJustCreatedCalculationId] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string>("");
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get("buildingId");
    const tabParam = params.get("tab");
    setTab(tabParam === "history" ? 1 : 0);
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
      setJustCreatedCalculationId(res.data.id);
      setTab(1);
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
      const disposition = res.headers["content-disposition"] as string | undefined;
      a.download = extractFilenameFromDisposition(disposition) ?? "raschet.xlsx";
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
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2, borderBottom: "1px solid rgba(148,163,184,0.25)" }}
      >
        <Tab label="Новый расчет" />
        <Tab label="История расчетов" />
      </Tabs>

      {tab === 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Выберите дом из списка и выполните расчет по утвержденным тарифам.
          </Typography>
          <Paper
            sx={{
              p: 3,
              mb: 3,
              maxWidth: 720,
              border: "1px solid rgba(148,163,184,0.3)",
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
        </>
      )}

      {tab === 0 && result && (
        <Box>
          <Paper
            sx={{
              p: 3,
              mb: 2,
              border: "1px solid rgba(148,163,184,0.3)",
            }}
          >
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Результаты расчета
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              Итоговая ставка: <strong>{result.total_rate}</strong> руб./м²
            </Typography>
            <Button
              sx={{ mt: 2 }}
              variant="contained"
              color="secondary"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
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
                  <TableCell>Формула</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items?.map((item) => (
                  <TableRow key={item.item_number + item.name} hover>
                    <TableCell>{item.item_number}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right">{item.applied_rate}</TableCell>
                    <TableCell>
                      {item.formula_label ? (
                        <>
                          <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>
                            {item.formula_label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.formula_substitution}
                          </Typography>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tab === 1 && (
        <CalculationHistoryPage
          embedded
          highlightedCalculationId={justCreatedCalculationId}
        />
      )}
    </Box>
  );
};

