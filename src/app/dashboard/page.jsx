"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import {
  Box,
  Typography,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { setLoading, setNotification, clearNotification } from "../../lib/redux/slices/uiSlice";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Dashboard = () => {
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const [aiReport, setAiReport] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [settling, setSettling] = useState(false);

  const [pendingSadaqah, setPendingSadaqah] = useState(0);

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");

  // Withdrawal States
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const fetchWinnings = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/winnings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchPending = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUserRole(payload.role);
        }
        const res = await axios.get("/api/pending-sadaqah", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setPendingSadaqah(res.data.pendingCount);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchWinnings();
    fetchPending();
  }, []);

  const fetchWinnings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/winnings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const showSnack = (msg, severity = "success") => {
    setSnackMsg(msg);
    setSnackSeverity(severity);
    setSnackOpen(true);
  };

  const generateAiReport = async () => {
    setLoadingAi(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/ai-report",
        { data },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAiReport(res.data.report);
      showSnack("تم توليد التقرير بنجاح ✅", "success");
    } catch (err) {
      console.error("AI Report failed:", err);
      setAiReport("عذراً، فشل في توليد التقرير حالياً. يرجى المحاولة لاحقاً.");
      showSnack("فشل توليد التقرير ❌", "error");
    } finally {
      setLoadingAi(false);
    }
  };

  // زر تسديد الصدقات آخر الشهر
  const settleSadaqah = async () => {
    setSettling(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/settle-sadaqah",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        showSnack(res.data.message, "success");

        // Refresh data + pending
        const refreshed = await axios.get("/api/winnings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(refreshed.data);

        const pendingRes = await axios.get("/api/pending-sadaqah", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pendingRes.data.success) {
          setPendingSadaqah(pendingRes.data.pendingCount);
        }
      } else {
        showSnack(res.data.message || "حدث خطأ", "error");
      }
    } catch (err) {
      console.error(err);
      showSnack("حدث خطأ أثناء التسديد ❌", "error");
    } finally {
      setSettling(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || Number(withdrawAmount) <= 0) {
      showSnack("يرجى إدخال مبلغ صحيح", "error");
      return;
    }
    if (!withdrawReason) {
      showSnack("يرجى إدخال سبب السحب", "error");
      return;
    }

    setWithdrawing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/withdrawals",
        { amount: withdrawAmount, reason: withdrawReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showSnack(res.data.message, "success");
        setWithdrawalOpen(false);
        setWithdrawAmount("");
        setWithdrawReason("");
        fetchWinnings(); // Refresh data
      } else {
        showSnack(res.data.message || "حدث خطأ", "error");
      }
    } catch (err) {
      console.error(err);
      showSnack("فشل تسجيل السحب ❌", "error");
    } finally {
      setWithdrawing(false);
    }
  };

  const chartData = {
    labels: data.map((day) => day.date),
    datasets: [
      {
        label: "إجمالي الوارد",
        data: data.map((day) => day.totalIn),
        backgroundColor: "#4ade80", // Green 400
        borderRadius: 4,
      },
      {
        label: "إجمالي المنصرف",
        data: data.map((day) => day.totalOut),
        backgroundColor: "#f87171", // Red 400
        borderRadius: 4,
      },
      {
        label: "الصدقات",
        data: data.map((day) => day.totalSadaqah || 0),
        backgroundColor: "#60a5fa", // Blue 400
        borderRadius: 4,
      },
      {
        label: "معلق",
        data: data.map((day) => day.totalSuspended || 0),
        backgroundColor: "#fb923c", // Orange 400
        borderRadius: 4,
      },
    ],
  };

  const formatType = (type) => {
    if (type === "in") return "إيداع";
    if (type === "out") return "دفع";
    if (type === "sadaqah") return "صدقة";
    if (type === "sadaqahPaid") return "تسديد صدقات";
    if (type === "withdrawal") return "سحب مدير";
    return "معلّق";
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.5px" }}
        >
          📊 تقرير الأرباح
        </Typography>

        {data.length > 0 && userRole === "master" && (
          <Box
            className="glass-card"
            sx={{ px: 3, py: 1.5, display: "flex", gap: 3, bgcolor: "var(--glass-bg)" }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                رأس المال الأساسي
              </Typography>
              <Typography variant="h6" sx={{ color: "var(--primary)", fontWeight: 700 }}>
                {data[0]?.baseCapital?.toLocaleString() || 100000} ج.م
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                رأس المال الحالي
              </Typography>
              <Typography variant="h6" sx={{ color: "var(--secondary)", fontWeight: 700 }}>
                {data[data.length - 1].currentCapital.toLocaleString()} ج.م
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Main Chart */}
      {userRole === "master" && (
        <Box
          className="glass-card"
          sx={{ p: 3, bgcolor: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
        >
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: "var(--primary)" }}>
            📈 أداء الصيدلية (آخر 30 يوم)
          </Typography>
          <Box sx={{ height: 400 }}>
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top", labels: { font: { weight: "600" } } },
                },
                scales: {
                  y: { grid: { color: "rgba(0,0,0,0.05)" } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </Box>
        </Box>
      )}

      {/* AI Report Section */}
      {userRole === "master" && (
        <Box
          className="glass-card"
          sx={{
            p: 3,
            bgcolor: "var(--primary)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                ✨ تحليل الذكاء الاصطناعي
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                احصل على رؤى ذكية حول مبيعاتك وأرباحك.
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={generateAiReport}
              disabled={loadingAi || data.length === 0}
              sx={{
                bgcolor: "white",
                color: "var(--primary)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                fontWeight: 700,
              }}
            >
              {loadingAi ? <CircularProgress size={24} color="inherit" /> : "توليد التقرير"}
            </Button>
          </Box>

          {aiReport && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: "rgba(255,255,255,0.1)",
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                {aiReport}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* أزرار العمليات */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        {userRole === "master" && (
          <Button
            variant="contained"
            color="warning"
            onClick={() => setWithdrawalOpen(true)}
            sx={{ fontWeight: 700, bgcolor: "#ed6c02", "&:hover": { bgcolor: "#e65100" } }}
          >
            💸 سحب من الخزنة
          </Button>
        )}
        <Button
          variant="contained"
          color="secondary"
          onClick={settleSadaqah}
          disabled={settling || pendingSadaqah === 0}
          sx={{ fontWeight: 700 }}
          title={pendingSadaqah === 0 ? "لا توجد صدقات معلقة للتسديد" : ""}
        >
          {settling ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            `تسديد الصدقات الغير مدفوعة (${pendingSadaqah})`
          )}
        </Button>
      </Box>

      {/* Test Redux UI */}
      <Box sx={{ p: 2, border: '1px dashed grey', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Test 3D Loader (Redux)</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => {
            dispatch(setLoading(true));
            setTimeout(() => dispatch(setLoading(false)), 3000);
          }}>Test Loading (3s)</Button>

          <Button variant="outlined" color="success" onClick={() => {
            dispatch(setNotification({ type: 'success', message: 'Operation Successful!' }));
            setTimeout(() => dispatch(clearNotification()), 3000);
          }}>Test Success (3s)</Button>

          <Button variant="outlined" color="error" onClick={() => {
            dispatch(setNotification({ type: 'error', message: 'Something went wrong!' }));
            setTimeout(() => dispatch(clearNotification()), 3000);
          }}>Test Error (3s)</Button>
        </Stack>
      </Box>

      {/* Daily Logs */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "var(--primary)", mt: 2 }}>
          📅 السجلات اليومية
        </Typography>

        {data.map((day, i) => (
          <Box
            key={i}
            className="glass-card"
            sx={{ p: 4, bgcolor: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {day.date}
              </Typography>
              {userRole === "master" && (
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Chip label={`↑ ${day.totalIn}`} color="success" size="small" sx={{ fontWeight: 700 }} />
                  <Chip label={`↓ ${day.totalOut}`} color="error" size="small" sx={{ fontWeight: 700 }} />
                  <Chip
                    label={`💛 ${day.totalSadaqah || 0}`}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: "rgba(25, 118, 210, 0.2)",
                      color: "#64b5f6", // Light Blue for dark mode visibility
                      border: "1px solid rgba(25, 118, 210, 0.3)"
                    }}
                  />
                </Box>
              )}
            </Box>

            <TableContainer className="glass-card" sx={{ border: "1px solid var(--glass-border)" }}>
              <Table className="modern-table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      السبب / العملية
                    </TableCell>
                    {userRole === "master" && (
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        المبلغ
                      </TableCell>
                    )}
                    <TableCell align="center" sx={{ fontWeight: 800 }}>
                      النوع
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {day.orders.map((order, index) => (
                    <TableRow key={index} hover>
                      <TableCell align="right">{order.reason}</TableCell>
                      {userRole === "master" && (
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {order.amount?.toLocaleString()} ج.م
                        </TableCell>
                      )}
                      <TableCell align="center">
                        <Box
                          sx={{
                            px: 2,
                            py: 0.5,
                            borderRadius: "8px",
                            display: "inline-block",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        >
                          {formatType(order.type)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))
        }
      </Box >

      {/* Snackbar */}
      < Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 700 }}
        >
          {snackMsg}
        </Alert>
      </Snackbar >

      {/* Dialog السحب */}
      < Dialog open={withdrawalOpen} onClose={() => !withdrawing && setWithdrawalOpen(false)} maxWidth="xs" fullWidth >
        <DialogTitle sx={{ fontWeight: 800, textAlign: "center", color: "var(--primary)" }}>
          💸 سحب مبلغ من الخزنة
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
          <TextField
            label="المبلغ"
            type="number"
            fullWidth
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            disabled={withdrawing}
            autoFocus
          />
          <TextField
            label="السبب"
            fullWidth
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
            disabled={withdrawing}
            placeholder="مثال: سحب شخصي للبيت"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setWithdrawalOpen(false)} disabled={withdrawing} color="inherit" sx={{ fontWeight: 700 }}>
            إلغاء
          </Button>
          <Button
            onClick={handleWithdrawal}
            variant="contained"
            color="warning"
            disabled={withdrawing}
            sx={{ fontWeight: 700, px: 4 }}
          >
            {withdrawing ? <CircularProgress size={24} color="inherit" /> : "تأكيد السحب"}
          </Button>
        </DialogActions>
      </Dialog >
    </Box >
  );
};

export default Dashboard;
