import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import { Box } from '@mui/material';
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";

export default function DebtModal({ items, total, showDebt, setShowDebt, handleReset }) {
  const [debtors, setDebtors] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState("");
  const [newDebtor, setNewDebtor] = useState("");
  const [partialPayment, setPartialPayment] = useState(0);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  useEffect(() => {
    axios
      .get("/api/debt", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => setDebtors(res.data))
      .catch((err) => {
        console.error("Failed to fetch debtors", err);
        showSnackbar("فشل في تحميل العملاء ❌", "error");
      });
  }, []);

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDebtSubmit = async () => {
    const name = selectedDebtor === "__new__" ? newDebtor.trim() : selectedDebtor;

    if (!name) {
      return showSnackbar("يرجى اختيار اسم العميل أو إدخال اسم جديد", "warning");
    }

    if (partialPayment < 0 || isNaN(partialPayment)) {
      return showSnackbar("يرجى إدخال مبلغ دفع صحيح", "warning");
    }

    try {
      const response = await axios.post(
        "/api/debt",
        { name, orders: items, partialPayment },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.data.success) {
        return showSnackbar(response.data.error || "فشل الدفع كدين ❌", "error");
      }

      showSnackbar("تم تسجيل الدين بنجاح ✅", "success");
      setShowDebt(false);
      handleReset();
    } catch (error) {
      console.error("Debt submission error:", error);
      showSnackbar("حدث خطأ أثناء تسجيل الدين ❌", "error");
    }
  };

  return (
    <>
      <Dialog
        open={showDebt}
        onClose={() => setShowDebt(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          className: "glass-card",
          sx: { p: 1, bgcolor: 'var(--glass-bg)' }
        }}
      >
        <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="h6"
            component="span"
            sx={{ fontWeight: 700, color: 'var(--primary)' }}
          >            💳 تسجيل كدين
          </Typography>
          <IconButton onClick={() => setShowDebt(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <Box className="glass-card" sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(0, 137, 123, 0.05)' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--secondary)' }}>
              الإجمالي: {total.toFixed(2)} جنيه
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'var(--primary)', fontWeight: 600 }}>اسم العميل</Typography>
            <Select
              fullWidth
              value={selectedDebtor}
              displayEmpty
              onChange={(e) => setSelectedDebtor(e.target.value)}
              size="small"
            >
              <MenuItem disabled value=""><em>اختر اسم العميل</em></MenuItem>
              {debtors.map((d) => <MenuItem key={d._id} value={d.name}>{d.name}</MenuItem>)}
              <MenuItem value="__new__" sx={{ color: 'var(--primary)', fontWeight: 'bold' }}>➕ عميل جديد</MenuItem>
            </Select>
          </Box>

          {selectedDebtor === "__new__" && (
            <TextField
              fullWidth
              label="اسم العميل الجديد"
              value={newDebtor}
              onChange={(e) => setNewDebtor(e.target.value)}
              size="small"
            />
          )}

          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'var(--primary)', fontWeight: 600 }}>المبلغ المدفوع (اختياري)</Typography>
            <TextField
              fullWidth
              type="number"
              value={partialPayment}
              onChange={(e) => setPartialPayment(Number(e.target.value))}
              size="small"
            />
          </Box>

          <Button
            variant="contained"
            onClick={handleDebtSubmit}
            size="large"
            sx={{
              mt: 2, py: 1.5, borderRadius: '12px', fontWeight: 700,
              bgcolor: 'var(--primary)',
              '&:hover': { bgcolor: 'var(--primary-hover)' }
            }}
          >
            تأكيد تسجيل الدين
          </Button>
        </DialogContent>
      </Dialog>


      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
