"use client";
import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  IconButton,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

const ReturnsPage = () => {
  const [lastPeriod, setLastPeriod] = useState([]);
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const fetchLastPeriod = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/last-period", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLastPeriod(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLastPeriod();
  }, []);

  // ➕ إضافة منتج للمرتجع
  const addItem = (product) => {
    setItems((prev) => {
      const index = prev.findIndex(
        (i) => i.name === product.name && i.unit === product.unit
      );

      if (index !== -1) {
        const updated = [...prev];
        updated[index].quantity += 1;
        updated[index].total =
          updated[index].quantity * updated[index].price;
        setTotal(updated.reduce((s, i) => s + i.total, 0));
        return updated;
      }

      const price =
        product.quantity > 0
          ? product.total / product.quantity
          : 0;

      const newItem = {
        name: product.name,
        unit: product.unit,
        price,
        quantity: 1,
        total: price,
        type: product.type,
      };

      const next = [...prev, newItem];
      setTotal(next.reduce((s, i) => s + i.total, 0));
      return next;
    });
  };

  const handleDeleteItem = (idx) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setTotal(next.reduce((s, i) => s + i.total, 0));
      return next;
    });
  };

  const doSave = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/returns",
        { items },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems([]);
      setTotal(0);
      alert("✅ تم حفظ المرتجع بنجاح");
    } catch (error) {
      console.error(error);
      alert("❌ حصل خطأ أثناء الحفظ");
    }
  };

  if (loading) {
    return (
      <Box sx={{ height: "70vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, direction: "rtl" }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 3 }}>
        🔄 مرتجع مبيعات (آخر 15 يوم)
      </Typography>

      {/* ===== Products by Day ===== */}
      {lastPeriod.map((day) => (
        <Accordion key={day.date} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <Typography fontWeight={900}>{day.date}</Typography>
              <Typography fontWeight={800}>
                كاش: {day.cashSales.toLocaleString()} ج.م
              </Typography>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">المنتج</TableCell>
                    <TableCell align="center">الوحدة</TableCell>
                    <TableCell align="center">الكمية</TableCell>
                    <TableCell align="center">الإجمالي</TableCell>
                    <TableCell align="center">نوع</TableCell>
                    <TableCell align="center">مرتجع</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {day.products.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell align="center">{p.name}</TableCell>
                      <TableCell align="center">{p.unit}</TableCell>
                      <TableCell align="center">{p.quantity}</TableCell>
                      <TableCell align="center">{p.total}</TableCell>
                      <TableCell align="center">
                        {p.type === "cash" ? "كاش" : "آجل"}
                      </TableCell>
                      <TableCell align="center">
                        <Button variant="contained" onClick={() => addItem(p)}>
                          + مرتجع
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* ===== Return Cart ===== */}
      <Paper sx={{ mt: 4, p: 2 }}>
        <Typography fontWeight={900} mb={2}>
          📦 المرتجع الحالي
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">المنتج</TableCell>
              <TableCell align="center">السعر</TableCell>
              <TableCell align="center">الكمية</TableCell>
              <TableCell align="center">الوحدة</TableCell>
              <TableCell align="center">الإجمالي</TableCell>
              <TableCell align="center">حذف</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((it, idx) => (
              <TableRow key={idx}>
                <TableCell align="center">{it.name}</TableCell>
                <TableCell align="center">{it.price}</TableCell>
                <TableCell align="center">
                  <TextField
                    type="number"
                    size="small"
                    value={it.quantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setItems((prev) => {
                        const next = [...prev];
                        next[idx].quantity = val;
                        next[idx].total = val * next[idx].price;
                        setTotal(next.reduce((s, i) => s + i.total, 0));
                        return next;
                      });
                    }}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell align="center">{it.unit}</TableCell>
                <TableCell align="center">{it.total}</TableCell>
                <TableCell align="center">
                  <IconButton color="error" onClick={() => handleDeleteItem(idx)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            <TableRow>
              <TableCell colSpan={4} align="right" fontWeight={900}>
                الإجمالي
              </TableCell>
              <TableCell align="center" fontWeight={900}>
                {total.toLocaleString()} ج.م
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>

        <Box textAlign="center" mt={3}>
          <Button variant="contained" disabled={!items.length} onClick={doSave}>
            💾 حفظ المرتجع
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ReturnsPage;
