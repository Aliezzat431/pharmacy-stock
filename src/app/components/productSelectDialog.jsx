"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const typesWithUnits = {
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
};

const ProductSelectDialog = ({
  open,
  onClose,
  products,
  onConfirm,
}) => {

  
    
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempUnit, setTempUnit] = useState("");

  const handleProductClick = (p) => {
    setSelectedProduct(p);
    setTempQuantity(1);
    setTempUnit(p.unitOptions?.[0] || p.unit);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateRemaining = () => {
    if (!selectedProduct || !tempUnit) return "";
    const conversion = selectedProduct.unitConversion;
const [smallUnit, bigUnit] = typesWithUnits[selectedProduct.type] || [selectedProduct.unit];
    const stockInSmall = selectedProduct.quantity * (selectedProduct.unit === smallUnit ? 1 : conversion);
    const usedInSmall = tempQuantity * (tempUnit === smallUnit ? 1 : conversion);
    return ((stockInSmall - usedInSmall) / conversion).toFixed(2);
  };

  const calculatePrice = () => {
    if (!selectedProduct) return 0;
    const conv = selectedProduct.unitConversion?.[tempUnit];
    if (tempUnit !== selectedProduct.unit && conv) return selectedProduct.price / conv;
    return selectedProduct.price;
  };

  const handleConfirm = () => {
    if (!selectedProduct) return;
    onConfirm({
      ...selectedProduct,
      price: calculatePrice(),
      quantity: tempQuantity,
      unit: tempUnit,
      total: calculatePrice() * tempQuantity,
    });
    setSelectedProduct(null);
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        البحث عن صنف
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", left: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          placeholder="اكتب اسم الدواء..."
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الكمية</TableCell>
              <TableCell>إضافة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((p) => (
              <TableRow
                key={p._id}
                hover
                onClick={() => handleProductClick(p)}
                style={{
                  cursor: "pointer",
                  backgroundColor: selectedProduct?._id === p._id ? "#f0f0f0" : "inherit",
                }}
              >
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.type}</TableCell>
                <TableCell>{p.quantity}</TableCell>
                <TableCell>➕</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {selectedProduct && (
          <Box
            sx={{
              mt: 3,
              borderTop: "1px solid #ccc",
              pt: 2,
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "center",
            }}
          >
            <TextField
              label="الكمية"
              type="number"
              size="small"
              value={tempQuantity}
              onChange={(e) => setTempQuantity(Number(e.target.value))}
              sx={{ width: 100 }}
            />

            <FormControl sx={{ width: 100 }} size="small">
              <InputLabel>الوحدة</InputLabel>
              <Select
                value={tempUnit}
                label="الوحدة"
                onChange={(e) => setTempUnit(e.target.value)}
              >
                {selectedProduct.unitOptions?.map((u) => (
                  <MenuItem key={u} value={u}>
                    {u}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="الرصيد"
              size="small"
              value={calculateRemaining()}
              InputProps={{ readOnly: true }}
              sx={{ width: 100 }}
            />

            <TextField
              label="السعر"
              size="small"
              value={calculatePrice()}
              InputProps={{ readOnly: true }}
              sx={{ width: 100 }}
            />

            <TextField
              label="الصلاحية"
              size="small"
              value={selectedProduct.expiryDate ? new Date(selectedProduct.expiryDate).toLocaleDateString("ar-EG") : "—"}
              InputProps={{ readOnly: true }}
              sx={{ width: 130 }}
            />
          </Box>
        )}
      </DialogContent>
      {selectedProduct && (
        <DialogActions>
          <Button onClick={onClose} color="error">
            إلغاء
          </Button>
          <Button onClick={handleConfirm} variant="contained">
            إضافة
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ProductSelectDialog;