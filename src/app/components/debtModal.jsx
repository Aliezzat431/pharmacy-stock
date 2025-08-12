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
      <Dialog open={showDebt} onClose={() => setShowDebt(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ position: "relative", pr: 5 }}>
          تسجيل كدين
          <IconButton
            onClick={() => setShowDebt(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Typography variant="h6" align="center" color="primary">
            الإجمالي: {total.toFixed(2)} جنيه
          </Typography>

          <Select
            fullWidth
            value={selectedDebtor}
            displayEmpty
            onChange={(e) => setSelectedDebtor(e.target.value)}
            variant="outlined"
          >
            <MenuItem disabled value="">
              اختر اسم العميل
            </MenuItem>
            {debtors.map((d) => (
              <MenuItem key={d._id} value={d.name}>
                {d.name}
              </MenuItem>
            ))}
            <MenuItem value="__new__">➕ عميل جديد</MenuItem>
          </Select>

          {selectedDebtor === "__new__" && (
            <TextField
              fullWidth
              label="اسم العميل الجديد"
              value={newDebtor}
              onChange={(e) => setNewDebtor(e.target.value)}
              variant="outlined"
            />
          )}

          <TextField
            fullWidth
            type="number"
            label="المبلغ المدفوع (اختياري)"
            value={partialPayment}
            onChange={(e) => setPartialPayment(Number(e.target.value))}
            variant="outlined"
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleDebtSubmit}
            size="large"
            sx={{ mt: 2 }}
          >
            تأكيد الدين
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
