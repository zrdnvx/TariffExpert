import React, { useMemo, useState } from "react";
import { useApiClient } from "../api/client";
import { getApiErrorMessage } from "../api/errors";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";

type HistoryItem = {
  id: string;
  created_at: string;
  building_id: string;
  building_address: string;
  total_rate: string;
};

type CalculationItem = {
  id: number;
  item_number: string;
  name: string;
  applied_rate: string;
};

type CalculationDetail = {
  id: string;
  building_id: string;
  building_address: string;
  created_at: string;
  total_rate: string;
  items: CalculationItem[];
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU");
};

const compareItemNumbers = (a: string, b: string): number => {
  const pa = a
    .replace(/\.+$/, "")
    .split(".")
    .map((part) => Number(part));
  const pb = b
    .replace(/\.+$/, "")
    .split(".")
    .map((part) => Number(part));
  const maxLen = Math.max(pa.length, pb.length);
  for (let i = 0; i < maxLen; i += 1) {
    const va = Number.isFinite(pa[i]) ? pa[i] : -1;
    const vb = Number.isFinite(pb[i]) ? pb[i] : -1;
    if (va !== vb) return va - vb;
  }
  return a.localeCompare(b, "ru");
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

export const CalculationHistoryPage: React.FC<{
  embedded?: boolean;
  highlightedCalculationId?: string | null;
}> = ({ embedded = false, highlightedCalculationId = null }) => {
  const api = useApiClient();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<CalculationDetail | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedRates, setEditedRates] = useState<Record<number, string>>({});

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<HistoryItem[]>("/calculations/");
      setItems(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить историю расчетов."));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void loadHistory();
  }, []);

  const sortedItems = useMemo(() => {
    const next = [...items];
    next.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortDirection === "desc" ? tb - ta : ta - tb;
    });
    return next;
  }, [items, sortDirection]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelected(null);
    setError(null);
    try {
      const res = await api.get<CalculationDetail>(`/calculations/${id}`);
      setSelected(res.data);
      setEditMode(false);
      setEditedRates({});
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить карточку расчета."));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCalculation = async (id: string) => {
    try {
      const res = await api.get(`/calculations/${id}/export`, { responseType: "blob" });
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

  const deleteCalculation = async (id: string) => {
    const ok = window.confirm("Удалить этот расчет? Действие нельзя отменить.");
    if (!ok) return;
    try {
      await api.delete(`/calculations/${id}`);
      setItems((prev) => prev.filter((row) => row.id !== id));
      if (selected?.id === id) {
        setDetailOpen(false);
        setSelected(null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось удалить расчет."));
    }
  };

  const handleStartEdit = () => {
    if (!selected) return;
    const next: Record<number, string> = {};
    selected.items.forEach((item) => {
      next[item.id] = String(item.applied_rate);
    });
    setEditedRates(next);
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const invalid = selected.items.some((item) => {
        const value = Number(editedRates[item.id] ?? item.applied_rate);
        return !Number.isFinite(value) || value < 0;
      });
      if (invalid) {
        setError("Ставки должны быть числами не меньше нуля.");
        setSaving(false);
        return;
      }
      const payload = {
        items: selected.items.map((item) => ({
          item_id: item.id,
          applied_rate: Number(editedRates[item.id] ?? item.applied_rate),
        })),
      };
      const res = await api.patch<CalculationDetail>(`/calculations/${selected.id}`, payload);
      setSelected(res.data);
      setItems((prev) =>
        prev.map((h) =>
          h.id === res.data.id ? { ...h, total_rate: res.data.total_rate } : h,
        ),
      );
      setEditMode(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось сохранить изменения расчета."));
    } finally {
      setSaving(false);
    }
  };

  const sortedDetailItems = useMemo(() => {
    if (!selected) return [];
    return [...selected.items].sort((a, b) => compareItemNumbers(a.item_number, b.item_number));
  }, [selected]);

  return (
    <Box>
      {!embedded && (
        <>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            История расчетов
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Здесь отображаются все расчеты вашей организации. Нажмите на строку, чтобы открыть карточку.
          </Typography>
        </>
      )}

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1, mt: embedded ? 1 : 0 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => void loadHistory()}
          disabled={loading}
        >
          Обновить
        </Button>
        <Button
          size="small"
          onClick={() => setSortDirection((p) => (p === "desc" ? "asc" : "desc"))}
        >
          Сортировка: {sortDirection === "desc" ? "сначала новые" : "сначала старые"}
        </Button>
      </Box>

      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      <TableContainer component={Paper} sx={{ mt: 2, border: "1px solid rgba(148,163,184,0.3)" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Дом</TableCell>
              <TableCell align="right">Сумма, руб./м²</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((row) => (
              <TableRow
                key={row.id}
                hover
                sx={{
                  cursor: "pointer",
                  backgroundColor:
                    highlightedCalculationId && row.id === highlightedCalculationId
                      ? "rgba(34,197,94,0.18)"
                      : undefined,
                }}
                onClick={() => void openDetail(row.id)}
              >
                <TableCell>{formatDate(row.created_at)}</TableCell>
                <TableCell>{row.building_address}</TableCell>
                <TableCell align="right">{row.total_rate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Карточка расчета</DialogTitle>
        <DialogContent dividers>
          {detailLoading && <Typography>Загрузка...</Typography>}
          {!detailLoading && selected && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography variant="body2">
                  <strong>Дата:</strong> {formatDate(selected.created_at)}
                </Typography>
                <Typography variant="body2">
                  <strong>Дом:</strong> {selected.building_address}
                </Typography>
                <Typography variant="body2">
                  <strong>Итоговая ставка:</strong> {selected.total_rate} руб./м²
                </Typography>
              </Box>
              <TableContainer component={Paper} sx={{ border: "1px solid rgba(148,163,184,0.3)" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>№ п/п</TableCell>
                      <TableCell>Вид работ</TableCell>
                      <TableCell align="right">Ставка, руб./м²</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedDetailItems.map((item) => (
                      <TableRow key={item.item_number + item.name} hover>
                        <TableCell>{item.item_number}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right">
                          {editMode ? (
                            <TextField
                              type="number"
                              size="small"
                              placeholder="Например: 2.35"
                              inputProps={{ step: 0.0001, min: 0 }}
                              value={editedRates[item.id] ?? item.applied_rate}
                              onChange={(e) =>
                                setEditedRates((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                            />
                          ) : (
                            item.applied_rate
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!editMode ? (
            <Button onClick={handleStartEdit} disabled={!selected}>
              Редактировать
            </Button>
          ) : (
            <Button onClick={() => void handleSaveEdit()} disabled={saving || !selected}>
              {saving ? "Сохраняем..." : "Сохранить изменения"}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              if (selected) {
                void exportCalculation(selected.id);
              }
            }}
            disabled={!selected}
          >
            Скачать Excel
          </Button>
          <Button
            color="error"
            onClick={() => {
              if (selected) {
                void deleteCalculation(selected.id);
              }
            }}
            disabled={!selected}
          >
            Удалить расчет
          </Button>
          <Button onClick={() => setDetailOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

