import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, Select, MenuItem, IconButton, Box, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Button
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { typesWithUnits } from '../lib/unitOptions';

const ProductsTable = ({ items, setItems, setShowSearch, setTotal, onDelete }) => {
  const [selectedRow, setSelectedRow] = useState(0);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [dragOverRow, setDragOverRow] = useState(null);

  const knownUnits = {
    ...typesWithUnits,
    "agel": ["جنيه"],
  };

  const recalculateItem = (item) => {
    const full = item.fullProduct || {};
    const type = item.type || full.type;
    const price = parseFloat(item.price ?? full.price ?? 0);
    const quantity = parseFloat(item.quantity ?? 0);
    const unit = item.unit;

    if (type === 'agel') {
      return { ...item, total: quantity * price, remaining: '-' };
    }

    const unitConversion = parseFloat(full.unitConversion ?? item.unitConversion ?? 1);
    const originalQuantity = parseFloat(full.quantity ?? item.quantity ?? 0);
    const [small, big] = knownUnits[type] || [];
    const conversions = small && big ? { [big]: 1, [small]: 1 / unitConversion } : { [unit]: 1 };
    const factor = conversions[unit] ?? 1;
    const sold = quantity * factor;
    const remaining = Math.max(0, (originalQuantity - sold).toFixed(4));
    const basePrice = parseFloat(full.price || 0);
    const unitPrice = unit === small && unitConversion > 0 ? basePrice / unitConversion : basePrice;
    const total = quantity * unitPrice;

    return { ...item, total, remaining: `${remaining} ${big || unit}` };
  };

  const recalculateAllItemsAndTotal = (updatedItems) => {
    const recalculatedItems = updatedItems.map(recalculateItem);
    const total = recalculatedItems.reduce((sum, i) => sum + (i.total || 0), 0);
    setItems(recalculatedItems);
    setTotal(total);
  };

  const handleQuantityChange = (index, newQuantity) => {
    const updated = [...items];
    updated[index] = { ...updated[index], quantity: newQuantity };
    recalculateAllItemsAndTotal(updated);
  };

  const handleUnitChange = (index, newUnit) => {
    const updated = [...items];
    updated[index] = { ...updated[index], unit: newUnit };
    recalculateAllItemsAndTotal(updated);
  };

  const confirmDelete = () => {
    onDelete(deleteIndex);
    setDeleteIndex(null);
  };

  const handleRowDragStart = (e, draggedIndex) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ ...items[draggedIndex], draggedIndex }));
  };

  const handleRowDragOver = (e, targetIndex) => {
    e.preventDefault();
    setDragOverRow(targetIndex);
  };

  const handleRowDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverRow(null);

    try {
      const droppedData = JSON.parse(e.dataTransfer.getData("application/json"));
      const draggedIndex = droppedData.draggedIndex;

      if (draggedIndex === targetIndex) return;

      const draggedItem = items[draggedIndex];
      const targetItem = items[targetIndex];

      const sameName = draggedItem.name === targetItem.name;
      const sameExpiry =
        new Date(draggedItem.expiry).toISOString().slice(0, 10) ===
        new Date(targetItem.expiry).toISOString().slice(0, 10);

      if (sameName && sameExpiry) {
        const targetConversion = parseFloat(targetItem.fullProduct?.unitConversion ?? targetItem.unitConversion ?? 1);
        const draggedConversion = parseFloat(draggedItem.fullProduct?.unitConversion ?? draggedItem.unitConversion ?? 1);

        const targetInBoxes = targetItem.unit === "شريط"
          ? parseFloat(targetItem.quantity) / targetConversion
          : parseFloat(targetItem.quantity);

        const draggedInBoxes = draggedItem.unit === "شريط"
          ? parseFloat(draggedItem.quantity) / draggedConversion
          : parseFloat(draggedItem.quantity);

        const newTotalBoxes = targetInBoxes + draggedInBoxes;

        const updatedItems = [...items];
        updatedItems[targetIndex] = {
          ...updatedItems[targetIndex],
          quantity: newTotalBoxes,
          unit: "علبة"
        };

        updatedItems.splice(draggedIndex, 1);
        recalculateAllItemsAndTotal(updatedItems);
      }
    } catch (err) {
      console.error("Invalid row drop data", err);
    }
  };


  useEffect(() => {
    recalculateAllItemsAndTotal(items);
  }, []);

  return (
    <Box className="glass-card" sx={{ p: 3, mb: 4, mt: 2 }}>
      <Typography variant="h5" sx={{ mb: 3, color: 'var(--primary)', fontWeight: 700 }}>
        🧾 فاتورة المبيعات
      </Typography>

      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader className="modern-table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>المنتج</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>سعر الوحدة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الكمية</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الوحدة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الصلاحية</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>المخزون</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الإجمالي</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>الإجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, i) => {
              const recalculated = recalculateItem(item);
              const full = item.fullProduct || {};
              const unitOptions =
                item.unitOptions?.map((u) => typeof u === "string" ? u : u.value) ||
                full.unitOptions?.map((u) => typeof u === "string" ? u : u.value) ||
                (full.unit ? [full.unit] : []);

              return (
                <TableRow
                  key={i}
                  draggable
                  onDragStart={(e) => handleRowDragStart(e, i)}
                  onDragOver={(e) => handleRowDragOver(e, i)}
                  onDrop={(e) => handleRowDrop(e, i)}
                  sx={{
                    bgcolor: dragOverRow === i ? 'rgba(0, 137, 123, 0.1)' : 'transparent',
                    '& td': { border: 0 }
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                  <TableCell>
                    {(parseFloat(item.total) / (item.quantity || 1)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(i, e.target.value)}
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={item.unit}
                      onChange={(e) => handleUnitChange(i, e.target.value)}
                    >
                      {unitOptions.map((u, idx) => (
                        <MenuItem key={idx} value={u}>{u}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    {item.expiry ? new Date(item.expiry).toLocaleDateString("ar-EG") : '-'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color={parseFloat(recalculated.remaining) < 5 ? "error" : "textSecondary"}>
                      {recalculated.remaining}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                    {parseFloat(recalculated.total).toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => setDeleteIndex(i)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}

            <TableRow
              onClick={() => setShowSearch(true)}
              sx={{ cursor: 'pointer', '& td': { border: 0 } }}
            >
              <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'var(--primary)', fontWeight: 600 }}>
                ➕ أضف منتج جديد للقائمة
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteIndex !== null} onClose={() => setDeleteIndex(null)}>
        <Box p={3} textAlign="center">
          <Typography variant="h6" gutterBottom>تأكيد الحذف</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>هل أنت متأكد أنك تريد حذف هذا المنتج من الفاتورة؟</Typography>
          <Box display="flex" justifyContent="center" gap={2}>
            <Button variant="contained" color="error" onClick={confirmDelete}>حذف</Button>
            <Button variant="outlined" onClick={() => setDeleteIndex(null)}>إلغاء</Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default ProductsTable;
