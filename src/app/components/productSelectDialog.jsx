"use client";
import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Button,
  Snackbar,
  Alert,
  Typography,
  InputAdornment
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

const ProductSelectDialog = ({
  open,
  onClose,
  products = [],
  searchResults = [],
  setSearchResults,
  selectedProduct,
  setSelectedProduct,
  tempQuantity,
  setTempQuantity,
  tempUnit,
  setTempUnit,
  tempExpiry,
  setTempExpiry,
  variants,
  setVariants,
  handleAddProduct,
}) => {
  const [error, setError] = useState(null);
  const baseList = Array.isArray(products) ? products : [];

  const expiryKey = (v) => v.expiryDate ?? "no-expiry";

  const getBaseQuantity = (product, quantity, unit) => {
    if (!product) return quantity;
    if (product.isBaseUnit) return quantity;
    if (unit === product.unit) return quantity;
    const conv = Number(product.unitConversion || 1);
    if (conv && conv > 0) return quantity / conv;
    return quantity;
  };

  const handleSearchChange = (e) => {
    const q = (e.target.value || "").toLowerCase();
    if (!q.trim()) {
      setSearchResults(baseList);
      return;
    }
    setSearchResults(
      baseList.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toString().includes(q))
      )
    );
  };

  const resultsArray = Array.isArray(searchResults)
    ? searchResults
    : baseList;

  const grouped = useMemo(() => {
    return resultsArray.reduce((acc, product) => {
      if (!acc[product.name]) acc[product.name] = [];
      acc[product.name].push(product);
      return acc;
    }, {});
  }, [resultsArray]);

  const validateAndAdd = () => {
    if (!selectedProduct) {
      setError("الرجاء اختيار منتج أولاً.");
      return;
    }
    if (!tempQuantity || tempQuantity < 1) {
      setError("الكمية يجب أن تكون 1 أو أكثر.");
      return;
    }

    const desiredBaseQty = getBaseQuantity(
      selectedProduct,
      tempQuantity,
      tempUnit
    );
    const availableBaseQty = selectedProduct.isBaseUnit
      ? Number(selectedProduct.quantity || 0)
      : selectedProduct.unit === tempUnit
        ? Number(selectedProduct.quantity || 0)
        : Number(selectedProduct.quantity || 0) *
        Number(selectedProduct.unitConversion || 1);

    if (desiredBaseQty > availableBaseQty) {
      setError(
        `الكمية المطلوبة (${tempQuantity} ${tempUnit}) أكبر من المتوفرة (${selectedProduct.quantity} ${selectedProduct.unit})`
      );
      return;
    }

    if (availableBaseQty <= 0) {
      setError("المنتج غير متوفر في المخزون.");
      return;
    }

    try {
      if (typeof handleAddProduct === "function") {
        handleAddProduct(selectedProduct, {
          unit: tempUnit,
          quantity: Number(tempQuantity),
          expiry: tempExpiry === "no-expiry" ? null : tempExpiry,
        });
        setTempQuantity(1);
        setError(null);
      } else {
        setError("Internal: add handler not provided.");
      }
    } catch (err) {
      console.error("خطأ عند إضافة المنتج:", err);
      setError("حدث خطأ أثناء إضافة المنتج، حاول مجددًا.");
    }
  };

  return (
  <>
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="md"
    PaperProps={{
      className: "glass-card",
      sx: {
        maxHeight: "90vh",
        p: 1,
        backgroundColor: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(10px)",
      },
    }}
  >
    <DialogTitle
      component="div"
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography
        variant="h6"
        component="div"
        sx={{ fontWeight: 700, color: "var(--primary)" }}
      >
        🔍 البحث عن دواء
      </Typography>

      <IconButton onClick={onClose} size="small">
        <CloseIcon />
      </IconButton>
    </DialogTitle>

    <DialogContent
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        mt: 1,
      }}
    >
      <TextField
        fullWidth
        placeholder="اكتب اسم الدواء أو الباركود..."
        variant="outlined"
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="primary" />
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "12px",
          },
        }}
      />

      <TableContainer
        className="glass-card"
        sx={{
          maxHeight: 400,
          flexGrow: 1,
          overflow: "auto",
          border: "1px solid var(--glass-border)",
        }}
      >
        <Table stickyHeader className="modal-table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>الاسم</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>باركود</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>الكمية</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>السعر</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {Object.entries(grouped).map(([name, variantsList]) => {
              const earliest = [...variantsList]
                .sort((a, b) => {
                  const dateA = a.expiryDate
                    ? new Date(a.expiryDate)
                    : new Date(8640000000000000);
                  const dateB = b.expiryDate
                    ? new Date(b.expiryDate)
                    : new Date(8640000000000000);
                  return dateA - dateB;
                })[0];

              const isSelected = selectedProduct?.name === name;

              return (
                <TableRow
                  key={name}
                  onClick={() => {
                    setVariants(variantsList);
                    setSelectedProduct(earliest);
                    setTempUnit(
                      earliest.unitOptions?.[0] ?? earliest.unit ?? "علبة"
                    );
                    setTempExpiry(earliest.expiryDate ?? "no-expiry");
                    setTempQuantity(1);
                  }}
                  sx={{
                    cursor: "pointer",
                    bgcolor: isSelected
                      ? "rgba(0, 137, 123, 0.1)"
                      : "transparent",
                    "& td": { border: 0 },
                  }}
                >
                  <TableCell sx={{ fontWeight: isSelected ? 700 : 400 }}>
                    {name}
                  </TableCell>

                  <TableCell>{earliest.barcode}</TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      color={earliest.quantity < 5 ? "error" : "inherit"}
                    >
                      {earliest.quantity}
                    </Typography>
                  </TableCell>

                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: "var(--primary)",
                    }}
                  >
                    {earliest.price}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedProduct && (
        <Box
          className="glass-card"
          sx={{
            p: 2,
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
            mt: 1,
            bgcolor: "rgba(0, 137, 123, 0.05)",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 150 }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 0.5,
                color: "var(--primary)",
                fontWeight: 600,
              }}
            >
              الكمية
            </Typography>

            <TextField
              type="number"
              fullWidth
              value={tempQuantity}
              onChange={(e) => setTempQuantity(Number(e.target.value))}
              size="small"
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 120 }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 0.5,
                color: "var(--primary)",
                fontWeight: 600,
              }}
            >
              الوحدة
            </Typography>

            <Select
              fullWidth
              value={tempUnit}
              onChange={(e) => setTempUnit(e.target.value)}
              size="small"
            >
              {(selectedProduct?.unitOptions || ["علبة"]).map((u) => (
                <MenuItem
                  key={typeof u === "string" ? u : u.value}
                  value={typeof u === "string" ? u : u.value}
                >
                  {typeof u === "string" ? u : u.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {selectedProduct?._id !== "agel" && (
            <Box sx={{ flex: 1.5, minWidth: 180 }}>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mb: 0.5,
                  color: "var(--primary)",
                  fontWeight: 600,
                }}
              >
                تاريخ الصلاحية
              </Typography>

              <Select
                fullWidth
                value={tempExpiry}
                onChange={(e) => {
                  const newVariant = variants.find(
                    (v) => (v.expiryDate ?? "no-expiry") === e.target.value
                  );

                  if (newVariant) {
                    setSelectedProduct(newVariant);
                    setTempExpiry(newVariant.expiryDate ?? "no-expiry");
                    setTempUnit(
                      newVariant.unitOptions?.[0] ??
                        newVariant.unit ??
                        "علبة"
                    );
                    setTempQuantity(1);
                  }
                }}
                size="small"
              >
                {variants.map((v, i) => (
                  <MenuItem key={i} value={v.expiryDate ?? "no-expiry"}>
                    {v.expiryDate
                      ? new Date(v.expiryDate).toLocaleDateString("en-GB")
                      : "بدون صلاحية"}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}

          <Button
            variant="contained"
            onClick={validateAndAdd}
            sx={{
              mt: 2.5,
              height: 40,
              px: 4,
              borderRadius: "10px",
              fontWeight: 600,
              bgcolor: "var(--primary)",
              "&:hover": { bgcolor: "var(--primary-hover)" },
            }}
          >
            إضافة للفاتورة
          </Button>
        </Box>
      )}
    </DialogContent>
  </Dialog>

  <Snackbar
    open={!!error}
    autoHideDuration={4000}
    onClose={() => setError(null)}
    anchorOrigin={{ vertical: "top", horizontal: "center" }}
  >
    <Alert
      severity="error"
      variant="filled"
      onClose={() => setError(null)}
      sx={{ width: "100%", borderRadius: "12px" }}
    >
      {error}
    </Alert>
  </Snackbar>
</>

  );
};

export default ProductSelectDialog;
