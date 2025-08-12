import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, Select, MenuItem, IconButton, Box, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Button
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const ProductsTable = ({ items, setItems, setShowSearch, setTotal, resetTrigger }) => {
  const [selectedRow, setSelectedRow] = useState(0);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [dragOverRow, setDragOverRow] = useState(null);

  const knownUnits = {
    "مضاد حيوي شرب": ["علبة"],
    "مضاد حيوي برشام": ["شريط", "علبة"],
    "دواء عادي برشام": ["شريط", "علبة"],
    "فيتامين برشام": ["شريط", "علبة"],
    "فيتامين شرب": ["علبة"],
    "دواء شرب عادي": ["علبة"],
    "نقط فم": ["علبة"],
    "نقط أنف": ["علبة"],
    "بخاخ فم": ["علبة"],
    "بخاخ أنف": ["علبة"],
    "مرهم": ["علبة"],
    "مستحضرات": ["علبة"],
    "لبوس": ["شريط", "علبة"],
    "حقن": ["أمبول", "علبة"],
    "فوار": ["كيس", "علبة"],
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
    const updated = [...items];
    updated.splice(deleteIndex, 1);
    setDeleteIndex(null);
    recalculateAllItemsAndTotal(updated);
  };

  // Row-to-row drag and drop merge
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

      // Convert both to boxes
      const targetInBoxes = targetItem.unit === "شريط"
        ? parseFloat(targetItem.quantity) / targetConversion
        : parseFloat(targetItem.quantity);

      const draggedInBoxes = draggedItem.unit === "شريط"
        ? parseFloat(draggedItem.quantity) / draggedConversion
        : parseFloat(draggedItem.quantity);

      // New total in boxes
      const newTotalBoxes = targetInBoxes + draggedInBoxes;

      const updatedItems = [...items];
      updatedItems[targetIndex] = {
        ...updatedItems[targetIndex],
        quantity: newTotalBoxes, // always store as boxes
        unit: "علبة" // force to boxes
      };

      // Remove dragged row
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

  useEffect(() => {
    if (resetTrigger) {
      setItems([]);
      setTotal(0);
    }
  }, [resetTrigger]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", p: 2 }}>
      <Typography variant="h6" gutterBottom>
        قائمة المنتجات
      </Typography>

      <TableContainer component={Paper} sx={{ flexGrow: 1, overflowY: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>السعر</TableCell>
              <TableCell>الكمية</TableCell>
              <TableCell>الوحدة</TableCell>
              <TableCell>تاريخ الانتهاء</TableCell>
              <TableCell>المتبقي</TableCell>
              <TableCell>الإجمالي</TableCell>
              <TableCell>حذف</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, i) => {
              const recalculated = recalculateItem(item);
              const full = item.fullProduct || {};
              const unitOptions = item.unitOptions?.map(u => typeof u === 'string' ? u : u.value)
                || full.unitOptions?.map(u => typeof u === 'string' ? u : u.value)
                || (full.unit ? [full.unit] : []);

              return (
                <TableRow
                  key={i}
                  draggable
                  onDragStart={(e) => handleRowDragStart(e, i)}
                  onDragOver={(e) => handleRowDragOver(e, i)}
                  onDrop={(e) => handleRowDrop(e, i)}
                  selected={i === selectedRow}
                  sx={{ backgroundColor: dragOverRow === i ? "#e3f2fd" : "inherit" }}
                >
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {parseFloat(recalculated.total) > 0 && parseFloat(item.quantity) > 0
                      ? (recalculated.total / item.quantity).toFixed(2)
                      : "0.00"}
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(i, e.target.value)}
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
                  <TableCell>{new Date(item.expiry).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell>{recalculated.remaining}</TableCell>
                  <TableCell>{recalculated.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => setDeleteIndex(i)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow
              onClick={() => setShowSearch(true)}
              sx={{ cursor: 'pointer', backgroundColor: '#f0d1d1b4' }}
            >
              <TableCell sx={{ height: 50 }} colSpan={8} align="center">
                ➕ أضف للقائمة
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteIndex !== null} onClose={() => setDeleteIndex(null)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>هل أنت متأكد أنك تريد حذف هذا المنتج؟</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteIndex(null)}>إلغاء</Button>
          <Button color="error" onClick={confirmDelete}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsTable;
