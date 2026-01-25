import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, Select, MenuItem, IconButton, Box, Typography, Dialog, Button
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { typesWithUnits } from '../lib/unitOptions';

const ProductsTable = ({ items, setItems, setShowSearch, setTotal, onDelete }) => {
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
    const remainingQty = Math.max(0, originalQuantity - sold);

    const basePrice = parseFloat(full.price || 0);
    const unitPrice = unit === small && unitConversion > 0 ? basePrice / unitConversion : basePrice;
    const total = quantity * unitPrice;

    const remaining = big ? `${remainingQty.toFixed(4)} ${big}` : `${remainingQty.toFixed(4)}`;

    return { ...item, total, remaining };
  };

  const recalculateAllItemsAndTotal = (updatedItems) => {
    const recalculatedItems = updatedItems.map(recalculateItem);
    const total = recalculatedItems.reduce((sum, i) => sum + (i.total || 0), 0);
    setItems(recalculatedItems);
    setTotal(total);
  };

const handleQuantityChange = (index, newQuantity) => {
  const qty = Number(newQuantity);

  // منع القيم السالبة
  if (qty < 0) return;

  const updated = [...items];
  updated[index] = { ...updated[index], quantity: qty };
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
    e.dataTransfer.setData("application/json", JSON.stringify({ draggedIndex }));
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
        (draggedItem.expiry ? new Date(draggedItem.expiry).toISOString().slice(0, 10) : "") ===
        (targetItem.expiry ? new Date(targetItem.expiry).toISOString().slice(0, 10) : "");

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
  <Box className="glass-card" sx={{ p: 4, mb: 4, mt: 3 }}>
    {/* ===== Header ===== */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 4,
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        🧾 فاتورة المبيعات
      </Typography>

      <Typography variant="body2" sx={{ opacity: 0.6 }}>
        {items.length} منتجات
      </Typography>
    </Box>

    {/* ===== Table ===== */}
    <TableContainer
      sx={{
        maxHeight: 600,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <Table stickyHeader className="modern-table">
        <TableHead>
          <TableRow>
            {[
              'المنتج',
              'سعر الوحدة',
              'الكمية',
              'الوحدة',
              'الصلاحية',
              'المخزون',
              'الإجمالي',
              'الإجراء',
            ].map((h, i) => (
              <TableCell
                key={i}
                align="center"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                }}
              >
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {items.map((item, i) => {
            const full = item.fullProduct || {};
            const unitOptions =
              item.unitOptions?.map((u) => (typeof u === 'string' ? u : u.value)) ||
              full.unitOptions?.map((u) => (typeof u === 'string' ? u : u.value)) ||
              (full.unit ? [full.unit] : []);

            const recalculated = recalculateItem(item);
            const remainingNumber = parseFloat(recalculated.remaining);
            const remainingColor =
              !isNaN(remainingNumber) && remainingNumber < 5
                ? 'error'
                : 'text.secondary';

            return (
              <TableRow
                key={i}
                draggable
                onDragStart={(e) => handleRowDragStart(e, i)}
                onDragOver={(e) => handleRowDragOver(e, i)}
                onDrop={(e) => handleRowDrop(e, i)}
                sx={{
                  bgcolor:
                    dragOverRow === i
                      ? 'rgba(0, 137, 123, 0.12)'
                      : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(0, 137, 123, 0.05)',
                  },
                  '& td': { border: 0 },
                }}
              >
                <TableCell sx={{ fontWeight: 600 }}>
                  {item.name}
                </TableCell>

                <TableCell sx={{ opacity: 0.8 }}>
                  {(recalculated.total / (item.quantity || 1)).toFixed(2)}
                </TableCell>

                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={item.quantity}
                    onChange={(e) =>
                      handleQuantityChange(i, e.target.value)
                    }
                    sx={{
                      width: 80,
                      '& input': { textAlign: 'center' },
                    }}
                  />
                </TableCell>

                <TableCell>
                  <Select
                    size="small"
                    value={item.unit}
                    onChange={(e) =>
                      handleUnitChange(i, e.target.value)
                    }
                    sx={{ minWidth: 90 }}
                  >
                    {unitOptions.map((u, idx) => (
                      <MenuItem key={idx} value={u}>
                        {u}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>

                <TableCell sx={{ fontSize: 13, opacity: 0.7 }}>
                  {item.expiry
                    ? new Date(item.expiry).toLocaleDateString('ar-EG')
                    : '—'}
                </TableCell>

                <TableCell>
                  <Typography
                    variant="body2"
                    color={remainingColor}
                    sx={{ fontWeight: 600 }}
                  >
                    {recalculated.remaining}
                  </Typography>
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 800,
                    color: 'var(--primary)',
                    fontSize: 15,
                  }}
                >
                  {recalculated.total.toFixed(2)}
                </TableCell>

                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => setDeleteIndex(i)}
                    sx={{
                      bgcolor: 'rgba(229,57,53,0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(229,57,53,0.2)',
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}

      <TableRow
  onClick={() => setShowSearch(true)}
  sx={{
    cursor: 'pointer',
    '& td': { border: 0 },
  }}
>
  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.2,
        px: 3,
        py: 1.4,
        borderRadius: 999,
        fontWeight: 700,
        color: 'var(--primary)',
        background:
          'linear-gradient(135deg, rgba(0,137,123,0.12), rgba(0,137,123,0.05))',
        border: '1px dashed var(--primary)',
        transition: 'all 0.25s ease',
        '&:hover': {
          background:
            'linear-gradient(135deg, rgba(0,137,123,0.2), rgba(0,137,123,0.1))',
          transform: 'translateY(-2px) scale(1.02)',
        },
      }}
    >
      <Typography sx={{ fontSize: 20 }}>➕</Typography>
      <Typography sx={{ letterSpacing: '0.4px' }}>
        أضف منتج جديد للقائمة
      </Typography>
    </Box>
  </TableCell>
</TableRow>

        </TableBody>
      </Table>
    </TableContainer>

    {/* ===== Delete Dialog ===== */}
    <Dialog open={deleteIndex !== null} onClose={() => setDeleteIndex(null)}>
      <Box p={4} textAlign="center">
        <Typography variant="h6" fontWeight={700} gutterBottom>
          تأكيد الحذف
        </Typography>
        <Typography sx={{ mb: 3, opacity: 0.8 }}>
          هل أنت متأكد أنك تريد حذف هذا المنتج من الفاتورة؟
        </Typography>
        <Box display="flex" justifyContent="center" gap={2}>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            حذف
          </Button>
          <Button variant="outlined" onClick={() => setDeleteIndex(null)}>
            إلغاء
          </Button>
        </Box>
      </Box>
    </Dialog>
  </Box>
);

};

export default ProductsTable;
