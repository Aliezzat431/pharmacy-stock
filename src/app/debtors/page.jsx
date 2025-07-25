'use client';
import React, { useEffect, useState } from 'react';
import {
  Container, TextField, List, Dialog, DialogActions, DialogTitle, DialogContent,
  Typography, Divider, Paper, Checkbox, Button, Table, TableHead,
  TableBody, TableRow, TableCell, Card, CardContent, Box
} from '@mui/material';
import axios from 'axios';

const DebtorsPage = () => {
  const [debtors, setDebtors] = useState([]);
  const [filteredDebtors, setFilteredDebtors] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [search, setSearch] = useState('');

  const fetchDebtors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get('/api/debt', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setDebtors(res.data);
      setFilteredDebtors(res.data);
    } catch (error) {
      console.error('فشل في جلب المديونيات:', error);
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

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAllInOrder = (orderIndex, items) => {
    const itemIds = items.map((_, idx) => `${orderIndex}-${idx}`);
    const allSelected = itemIds.every(id => selectedItems.includes(id));
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...itemIds])]);
    }
  };

  const handlePaySelected = async () => {
    if (!selectedDebtor || selectedItems.length === 0) return;
    const paidItems = selectedItems.map(id => {
      const [orderIndex, itemIndex] = id.split('-').map(Number);
      return { orderIndex, itemIndex };
    });

    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch('/api/debt', {
        name: selectedDebtor.name,
        paidItems,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      alert(res.data.message);
      await fetchDebtors();
      setSelectedDebtor(null);
      setSelectedItems([]);
    } catch (err) {
      console.error('فشل في الدفع:', err);
      alert('حدث خطأ أثناء الدفع');
    }
  };

  const getDebtorTotal = (debtor) => {
    if (!debtor) return 0;
    return debtor.orders.reduce((total, order) =>
      total + order.items.reduce((sum, item) => sum + item.total, 0)
    , 0);
  };

  return (
    <Container maxWidth="md" dir="rtl" sx={{ mt: 5 }}>
      <TextField
        fullWidth
        label="ابحث عن مدين..."
        variant="outlined"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 4 }}
      />

      <Box display="grid" gap={2}>
        {filteredDebtors.map((debtor, idx) => (
          <Card
            key={idx}
            sx={{
              cursor: 'pointer',
              transition: '0.3s',
              '&:hover': { boxShadow: 4 },
              backgroundColor: '#f9f9f9',
            }}
            onClick={() => {
              setSelectedDebtor(debtor);
              setSelectedItems([]);
            }}
          >
<CardContent sx={{ px: 2, py: 1 }}>
  <Box
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    sx={{
      backgroundColor: "#fff",
      borderRadius: 3,
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      px: 2,
      py: 1.5,
      direction: "rtl",
    }}
  >
    {/* Right side: Number circle and name */}
    <Box display="flex" alignItems="center" gap={1.5}>
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          backgroundColor: "#1976d2",
          color: "white",
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        {idx + 1}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 600, color: "#333" }}>
        {debtor.name}
      </Typography>
    </Box>

    {/* Left side: Total */}
    <Typography
      variant="h6"
      sx={{
        color: "#d32f2f",
        fontWeight: 700,
        fontSize: "1rem",
        whiteSpace: "nowrap",
      }}
    >
      الإجمالي: {getDebtorTotal(debtor)} جنيه
    </Typography>
  </Box>
</CardContent>



          </Card>
        ))}

        {filteredDebtors.length === 0 && (
          <Typography variant="body1">لا يوجد مدينون مطابقون</Typography>
        )}
      </Box>

      <Dialog open={!!selectedDebtor} onClose={() => setSelectedDebtor(null)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل المديونية: {selectedDebtor?.name}</DialogTitle>
        <DialogContent>
          {selectedDebtor?.orders.map((order, orderIndex) => {
            const orderTotal = order.items.reduce((sum, item) => sum + item.total, 0);
            return (
              <Box key={orderIndex} mb={4}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle1" fontWeight="bold">طلب رقم {orderIndex + 1}</Typography>
                  <Typography variant="body2" color="primary">الإجمالي: {orderTotal} جنيه</Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => handleSelectAllInOrder(orderIndex, order.items)}
                  sx={{ mb: 1, fontWeight: 'bold' }}
                >
                  تحديد الكل
                </Button>
                <Table size="small" sx={{ backgroundColor: '#fafafa' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>تحديد</TableCell>
                      <TableCell>المنتج</TableCell>
                      <TableCell>الكمية</TableCell>
                      <TableCell>السعر</TableCell>
                      <TableCell>الإجمالي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item, itemIndex) => {
                      const itemId = `${orderIndex}-${itemIndex}`;
                      return (
                        <TableRow key={itemIndex}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.includes(itemId)}
                              onChange={() => handleSelectItem(itemId)}
                            />
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.quantity} {item.unit}</TableCell>
                          <TableCell>{item.price}</TableCell>
                          <TableCell>{item.total}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            );
          })}
          <Divider sx={{ my: 2 }} />
          <Box mt={2} textAlign="left">
            <Typography variant="h6" fontWeight="bold">
              المجموع الكلي: {getDebtorTotal(selectedDebtor)} جنيه
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedDebtor(null)}>إغلاق</Button>
          <Button
            onClick={handlePaySelected}
            variant="contained"
            color="success"
            disabled={selectedItems.length === 0}
          >
            دفع المحدد
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DebtorsPage;
