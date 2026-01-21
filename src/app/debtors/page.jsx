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
    <Container maxWidth="lg" sx={{ py: 4, direction: 'rtl' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>
          👥 حسابات العملاء
        </Typography>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="ابحث عن اسم العميل أو المبلغ..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{
          mb: 4,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'var(--glass-bg)',
            borderRadius: '16px',
            border: '1px solid var(--glass-border)',
            '& fieldset': { border: 'none' }
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'var(--primary)', opacity: 0.7 }} />
            </InputAdornment>
          )
        }}
      />

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
        {filteredDebtors.map((debtor, idx) => (
          <Paper
            key={idx}
            className="glass-card"
            sx={{
              p: 3,
              cursor: 'pointer',
              borderRadius: '20px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                borderColor: 'var(--primary)'
              },
            }}
            onClick={() => {
              setSelectedDebtor(debtor);
              setPayAmount('');
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="start">
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: '12px',
                  bgcolor: 'rgba(var(--primary-rgb), 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <PersonIcon sx={{ color: 'var(--primary)' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{debtor.name}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>اخر معاملة: {new Date(debtor.updatedAt).toLocaleDateString("ar-EG")}</Typography>
                </Box>
              </Box>
              <Chip
                label={`${((debtor.totalOrders || 0) - (debtor.partialPayments || 0)).toLocaleString()} ج.م`}
                color="error"
                sx={{ fontWeight: 800, borderRadius: '8px' }}
              />
            </Box>

            <Divider sx={{ borderColor: 'var(--glass-border)' }} />

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 600 }}>إجمالي المسحوبات: {debtor.totalOrders?.toLocaleString()} ج.م</Typography>
              <Button size="small" variant="text" sx={{ fontWeight: 700 }}>عرض التفاصيل ➔</Button>
            </Box>
          </Paper>
        ))}

        {filteredDebtors.length === 0 && (
          <Box gridColumn="1 / -1" sx={{ py: 10, textAlign: 'center', opacity: 0.5 }}>
            <Typography variant="h6">لا يوجد عملاء يطابقون بحثك</Typography>
          </Box>
        )}
      </Box>

      <Dialog
        open={!!selectedDebtor}
        onClose={() => setSelectedDebtor(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            bgcolor: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }
        }}
      >
        <DialogTitle component="div" sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <InfoIcon sx={{ color: 'var(--primary)' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>كشف حساب: {selectedDebtor?.name}</Typography>
          </Box>
          <IconButton onClick={() => setSelectedDebtor(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0, border: 'none' }}>
          <Box sx={{ p: 3, maxHeight: '60vh', overflowY: 'auto' }}>
            {selectedDebtor?.orders.map((order, index) => (
              <Box key={index} sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>رقم الطلب {index + 1}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--primary)' }}>الإجمالي: {order.total.toLocaleString()} ج.م</Typography>
                </Box>

                <TableContainer className="glass-card" sx={{ borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <Table size="small" className="modern-table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>المنتج</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>الكمية</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>السعر</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>الإجمالي</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                          <TableCell align="center">{item.quantity} {item.unit}</TableCell>
                          <TableCell align="center">{item.price.toLocaleString()} ج.م</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{item.total.toLocaleString()} ج.م</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Box>
        </DialogContent>

        <Box sx={{ p: 3, bgcolor: 'rgba(var(--primary-rgb), 0.03)', borderTop: '1px solid var(--glass-border)' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                type="number"
                label="سداد مبلغ"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                fullWidth
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>تم سداد سابقاً: {selectedDebtor?.partialPayments?.toLocaleString() || 0} ج.م</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>المتبقي: {calcRemainingAfterPay(selectedDebtor, payAmount).toLocaleString()} ج.م</Typography>
                </Box>
                <Button
                  variant="contained"
                  onClick={handlePay}
                  disabled={!payAmount || isNaN(payAmount) || Number(payAmount) <= 0}
                  startIcon={<PaidIcon />}
                  sx={{ py: 1.5, px: 4, borderRadius: '12px', fontWeight: 800 }}
                >
                  تأكيد الدفع
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Dialog>

      <Snackbar
        open={alertOpen}
        autoHideDuration={4000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setAlertOpen(false)} severity={alertSeverity} variant="filled" sx={{ width: '100%', borderRadius: '12px' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default DebtorsPage;
