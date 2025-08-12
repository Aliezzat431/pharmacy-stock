'use client';

import React, { useEffect, useState } from 'react';
import {
  Container, TextField, Dialog, DialogActions, DialogTitle, DialogContent,
  Typography, Divider, Button, Table, TableHead,
  TableBody, TableRow, TableCell, Card, CardContent, Box, InputAdornment,
  TableContainer, Paper, Snackbar, Alert
} from '@mui/material';
import axios from 'axios';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import PaidIcon from '@mui/icons-material/Paid';
import CloseIcon from '@mui/icons-material/Close';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import InfoIcon from '@mui/icons-material/Info';

const DebtorsPage = () => {
  const [debtors, setDebtors] = useState([]);
  const [filteredDebtors, setFilteredDebtors] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [search, setSearch] = useState('');

  // Snackbar state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState('success');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (message, severity = 'success') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  const fetchDebtors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get('/api/debt', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDebtors(res.data);
      setFilteredDebtors(res.data);
    } catch (error) {
      console.error('فشل في جلب المديونيات:', error);
      showAlert('فشل في جلب المديونيات', 'error');
    }
  };

  useEffect(() => {
    fetchDebtors();
  }, []);

  useEffect(() => {
    const lower = search.toLowerCase();
    setFilteredDebtors(
      debtors.filter(d => d.name.toLowerCase().includes(lower))
    );
  }, [search, debtors]);

  const handlePay = async () => {
    if (!selectedDebtor || !payAmount || isNaN(payAmount) || Number(payAmount) <= 0) {
      showAlert("أدخل مبلغًا صحيحًا", 'warning');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch('/api/debt', {
        name: selectedDebtor.name,
        payAmount: Number(payAmount),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showAlert(res.data.message || 'تم الدفع بنجاح', 'success');
      await fetchDebtors();
      setSelectedDebtor(null);
      setPayAmount('');
    } catch (err) {
      console.error('فشل في الدفع:', err);
      showAlert('حدث خطأ أثناء الدفع', 'error');
    }
  };

  const calcRemainingAfterPay = (debtor, amount) => {
    if (!debtor) return 0;
    let totalOrders = 0;
    debtor.orders.forEach(order => {
      totalOrders += order.total;
    });
    const partialPayments = debtor.partialPayments ?? 0;
    return totalOrders - partialPayments - Number(amount || 0);
  };

  return (
    <Container maxWidth="md" dir="rtl" sx={{ mt: 5, pb: 5 }}>
      <TextField
        fullWidth
        size="small"
        variant="outlined"
        placeholder="ابحث عن مدين..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" fontSize="small" />
            </InputAdornment>
          )
        }}
      />

      <Box display="grid" gap={1.5}>
        {filteredDebtors.map((debtor, idx) => (
          <Card
            key={idx}
            elevation={2}
            sx={{
              cursor: 'pointer',
              borderRadius: 2,
              transition: '0.2s',
              '&:hover': { boxShadow: 4 },
              backgroundColor: '#fff',
            }}
            onClick={() => {
              setSelectedDebtor(debtor);
              setPayAmount('');
            }}
          >
            <CardContent sx={{ px: 2, py: 1.5 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={600}>
                    {debtor.name}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <MoneyOffIcon sx={{ color: 'red' }} fontSize="small" />
                  <Typography variant="subtitle2" color="error">
                    {(debtor.totalOrders || 0) - (debtor.partialPayments || 0)} جنيه
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}

        {filteredDebtors.length === 0 && (
          <Typography variant="body2" align="center" color="text.secondary">
            لا يوجد مدينون مطابقون
          </Typography>
        )}
      </Box>

      <Dialog
        open={!!selectedDebtor}
        onClose={() => setSelectedDebtor(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: 16,
            fontWeight: 'bold',
            py: 1.5,
            px: 2
          }}
        >
          <InfoIcon color="primary" fontSize="small" />
          تفاصيل المديونية: {selectedDebtor?.name}
        </DialogTitle>

        <Box
          sx={{
            maxHeight: '55vh',
            overflowY: 'auto',
            bgcolor: "#fafafa",
            px: 2,
            pt: 1
          }}
        >
          {selectedDebtor?.orders.map((order, index) => (
            <Box key={index} mb={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="body2" fontWeight="bold">طلب رقم {index + 1}</Typography>
                <Typography variant="caption" color="primary">الإجمالي: {order.total} جنيه</Typography>
              </Box>

              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#eaeaea' }}>
                    <TableRow>
                      <TableCell>المنتج</TableCell>
                      <TableCell>الكمية</TableCell>
                      <TableCell>السعر</TableCell>
                      <TableCell>الإجمالي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>{item.price}</TableCell>
                        <TableCell>{item.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="body2" gutterBottom>
            أدخل المبلغ المدفوع نقدًا:
          </Typography>
          <TextField
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            fullWidth
            size="small"
            placeholder="مثلاً: 100"
            inputProps={{ min: 0 }}
          />

          <Box mt={2}>
            <Typography variant="caption" color="green">
              المدفوع سابقًا: {selectedDebtor?.partialPayments || 0} جنيه
            </Typography>
            <Typography variant="subtitle2" fontWeight="bold">
              بعد الدفع: {calcRemainingAfterPay(selectedDebtor, payAmount)} جنيه
            </Typography>
          </Box>

          <Box mt={2} display="flex" justifyContent="space-between">
            <Button
              onClick={() => setSelectedDebtor(null)}
              size="small"
              startIcon={<CloseIcon fontSize="small" />}
            >
              إغلاق
            </Button>
            <Button
              onClick={handlePay}
              size="small"
              variant="contained"
              color="success"
              disabled={!payAmount || isNaN(payAmount) || Number(payAmount) <= 0}
              startIcon={<PaidIcon fontSize="small" />}
            >
              دفع المبلغ
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Snackbar Alert */}
      <Snackbar
        open={alertOpen}
        autoHideDuration={4000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setAlertOpen(false)} severity={alertSeverity} variant="filled">
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DebtorsPage;
