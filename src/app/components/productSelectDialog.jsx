"use client";
import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  Box,
  Paper,
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ProductSelectDialog = ({
  open,
  onClose,
  products = [],
  setProducts,
  searchResults = [],
  setSearchResults,
  selectedProduct,
  setSelectedProduct,
  tempSelections,
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
          sx: {
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            fontSize: 16,
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 18, px: 2, py: 1.5 }}>
          البحث عن دواء
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            px: 1.5,
            py: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            fontSize: 16,
          }}
        >
          <TextField
            fullWidth
            placeholder="اكتب اسم الدواء..."
            size="medium"
            sx={{
              mb: 1.5,
              "& .MuiInputBase-root": { fontSize: 16 },
              "& .MuiInputLabel-root": { fontSize: 16 },
            }}
            onChange={handleSearchChange}
          />

          <Box
            sx={{
              maxHeight: 56 * 5 + 57,
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: 1,
              mb: 2,
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              fontSize: 16,
            }}
          >
            <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
              <Table size="medium" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 16 }}>الاسم</TableCell>
                    <TableCell sx={{ fontSize: 16 }}>باركود</TableCell>
                    <TableCell sx={{ fontSize: 16 }}>الكمية</TableCell>
                    <TableCell sx={{ fontSize: 16 }}>السعر</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(grouped).map(([name, variants]) => {
                    const earliest = [...variants].sort((a, b) => {
                      const dateA = a.expiryDate
                        ? new Date(a.expiryDate)
                        : new Date(8640000000000000);
                      const dateB = b.expiryDate
                        ? new Date(b.expiryDate)
                        : new Date(8640000000000000);
                      return dateA - dateB;
                    })[0];

                    return (
                      <TableRow
                        key={`${earliest._id}-${expiryKey(earliest)}`}
                        onClick={() => {
                          setVariants(variants);
                          setSelectedProduct(earliest);
                          setTempUnit(
                            earliest.unitOptions?.[0] ??
                              earliest.unit ??
                              "علبة"
                          );
                          setTempExpiry(
                            earliest.expiryDate ?? "no-expiry"
                          );
                          setTempQuantity(1);
                        }}
                        hover
                        sx={{
                          cursor: "pointer",
                          backgroundColor:
                            selectedProduct?._id === earliest._id
                              ? "#f0f0f0"
                              : "transparent",
                          "&:hover": { backgroundColor: "#e0e0e0" },
                          fontSize: 16,
                        }}
                      >
                        <TableCell sx={{ fontSize: 16 }}>{name}</TableCell>
                        <TableCell sx={{ fontSize: 16 }}>
                          {earliest.barcode}
                        </TableCell>
                        <TableCell sx={{ fontSize: 16 }}>
                          {earliest.quantity}
                        </TableCell>
                        <TableCell sx={{ fontSize: 16 }}>
                          {earliest.price}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box
            sx={{
              p: 1,
              borderTop: "1px solid #ccc",
              display: "flex",
              gap: 1,
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              fontSize: 16,
            }}
          >
            <TextField
              label="الكمية"
              type="number"
              value={tempQuantity}
              onChange={(e) => setTempQuantity(Number(e.target.value))}
              size="medium"
              sx={{
                flex: 1,
                minWidth: 80,
                "& .MuiInputBase-root": { fontSize: 16, py: 1 },
                "& .MuiInputLabel-root": { fontSize: 16 },
              }}
              disabled={!selectedProduct}
            />

            <Select
              value={tempUnit}
              onChange={(e) => setTempUnit(e.target.value)}
              size="medium"
              sx={{
                flex: 1,
                minWidth: 90,
                fontSize: 16,
                "& .MuiSelect-select": { fontSize: 16, py: 1 },
              }}
              disabled={!selectedProduct}
            >
              {(selectedProduct?.unitOptions || ["علبة"]).map((u) => (
                <MenuItem
                  key={typeof u === "string" ? u : u.value}
                  value={typeof u === "string" ? u : u.value}
                  sx={{ fontSize: 16 }}
                >
                  {typeof u === "string" ? u : u.label}
                </MenuItem>
              ))}
            </Select>

            {selectedProduct?._id !== "agel" && (
              <Select
                value={tempExpiry}
                onChange={(e) => {
                  const newVariant = variants.find(
                    (v) =>
                      (v.expiryDate ?? "no-expiry") === e.target.value
                  );
                  if (newVariant) {
                    setSelectedProduct(newVariant);
                    setTempExpiry(
                      newVariant.expiryDate ?? "no-expiry"
                    );
                    setTempUnit(
                      newVariant.unitOptions?.[0] ??
                        newVariant.unit ??
                        "علبة"
                    );
                    setTempQuantity(1);
                  }
                }}
                size="medium"
                sx={{
                  flex: 1,
                  minWidth: 100,
                  fontSize: 16,
                  "& .MuiSelect-select": { fontSize: 16, py: 1 },
                }}
                disabled={!selectedProduct}
              >
                {variants.map((v, i) => (
                  <MenuItem
                    key={i}
                    value={v.expiryDate ?? "no-expiry"}
                    sx={{ fontSize: 16 }}
                  >
                    {v.expiryDate
                      ? new Date(v.expiryDate).toLocaleDateString(
                          "en-GB"
                        )
                      : "بدون صلاحية"}
                  </MenuItem>
                ))}
              </Select>
            )}

            <Button
              variant="contained"
              onClick={validateAndAdd}
              sx={{
                flexShrink: 0,
                height: 42,
                fontSize: 16,
                px: 3,
                minWidth: 80,
              }}
              disabled={!selectedProduct}
            >
              إضافة
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" sx={{ fontSize: 15 }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProductSelectDialog;
