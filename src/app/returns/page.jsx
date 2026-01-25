 "use client";
import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogActions,
  Snackbar,
  Alert,
  Box,
  MenuItem,
  Select,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import BarcodeScanner from "../components/BarcodeScanner";
import ProductSelectDialog from "../components/productSelectDialog";

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

const ReturnsPage = () => {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [total, setTotal] = useState(0);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempUnit, setTempUnit] = useState("");
  const [tempExpiry, setTempExpiry] = useState("");
  const [variants, setVariants] = useState([]);
  const [tempSelections, setTempSelections] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const getUnitFactor = (unit, selectedProduct) => {
    const baseUnit = typesWithUnits[selectedProduct.type]?.[0];
    const otherUnit = typesWithUnits[selectedProduct.type]?.[1];
    const conversion = selectedProduct.unitConversion;
    if (unit === baseUnit) return 1;
    if (unit === otherUnit) return conversion;
    return 1;
  };

  const calculateRemaining = (product, usedQty, usedUnit) => {
    if (!product || !usedUnit) return "";
    const conversion = product.unitConversion || 1;
    const isUsedInBox = usedUnit === product.unit;
    const usedInStrips = usedQty * (isUsedInBox ? conversion : 1);
    const currentStockInStrips = product.quantity * conversion;
    const remainingInStrips = currentStockInStrips + usedInStrips;
    const remainingInBoxes = remainingInStrips / conversion;
    return `${remainingInBoxes.toFixed(2)} ${product.unit}`;
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/checkout", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rawProducts = res.data.treatments || [];
      const updated = rawProducts.map((product) => ({
        ...product,
        unitOptions: typesWithUnits[product.type] || [product.unit],
      }));
      setProducts(updated);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (showSearch) setSearchResults(products);
  }, [products]);

  const calculateUnitPrice = (product, unit) => {
    if (!product) return 0;

    const baseUnit = product.unit;
    const conversion = Number(product.unitConversion || 1);

    if (unit !== baseUnit && conversion > 0) {
      return product.price / conversion;
    }

    return product.price;
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    const unit = tempUnit || selectedProduct.unitOptions?.[0] || selectedProduct.unit;
    const price = calculateUnitPrice(selectedProduct, unit);

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i._id === selectedProduct._id && i.unit === unit);

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex].quantity = tempQuantity;
        updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
        setTotal(updated.reduce((sum, i) => sum + i.total, 0));
        return updated;
      } else {
        const newItem = {
          name: selectedProduct.name,
          _id: selectedProduct._id,
          price,
          quantity: tempQuantity,
          unit,
          total: price * tempQuantity,
          unitOptions: selectedProduct.unitOptions || [selectedProduct.unit],
          fullProduct: selectedProduct,
          expiryDate: selectedProduct.expiryDate,
        };
        const next = [...prev, newItem];
        setTotal(next.reduce((sum, i) => sum + i.total, 0));
        return next;
      }
    });

    setSelectedProduct(null);
    setTempQuantity(1);
    setTempUnit("");
  };

  const handleFieldChange = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const item = next[idx];
      if (field === "quantity") item.quantity = Number(value);
      if (field === "unit") {
        item.unit = value;
        item.price = calculateUnitPrice(item.fullProduct, value);
      }
      item.total = item.quantity * item.price;
      setTotal(next.reduce((sum, i) => sum + i.total, 0));
      return next;
    });
  };

  const requestDeleteItem = (idx) => {
    const settings = JSON.parse(localStorage.getItem("settings-options") || "{}");
    if (settings.showReturnsConfirm) {
      setProductToDelete(idx);
      setDeleteConfirmOpen(true);
    } else {
      handleDeleteItem(idx);
    }
  };

  const handleDeleteItem = (idx) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setTotal(next.reduce((sum, i) => sum + i.total, 0));
      return next;
    });
    setDeleteConfirmOpen(false);
    setProductToDelete(null);
  };

  const doSave = async () => {
    const expiredItems = items.filter((item) => {
      const today = new Date();
      const expiry = new Date(item.expiryDate);
      return expiry.setHours(0, 0, 0, 0) <= today.setHours(0, 0, 0, 0);
    });
    if (expiredItems.length > 0) {
      alert("⚠️ يوجد منتجات منتهية الصلاحية، لا يمكن الحفظ.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/returns",
        { items },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems([]);
      setTotal(0);
      setSuccessMessage("✅ تم حفظ المرتجع بنجاح");
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setShowConfirmPopup(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, direction: "rtl" }}>
      <BarcodeScanner
        onScan={(barcode) => {
          const product = products.find(
            (p) => p.barcode?.toString() === barcode
          );

          if (!product) {
            alert(`🚫 لم يتم العثور على منتج بالباركود: ${barcode}`);
            return;
          }

          const expiry = new Date(product.expiryDate).setHours(0, 0, 0, 0);
          const today = new Date().setHours(0, 0, 0, 0);

          if (expiry <= today) {
            const confirmExpired = window.confirm(
              "⚠️ هذا المنتج منتهي الصلاحية، هل تريد إضافته؟"
            );
            if (!confirmExpired) return;
          }

          const unit = product.unitOptions?.[0] || product.unit;
          const price = calculateUnitPrice(product, unit);

          setItems((prev) => {
            const existingIndex = prev.findIndex(
              (i) => i._id === product._id && i.unit === unit
            );

            // لو المنتج موجود قبل كده
            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex].quantity += 1;
              updated[existingIndex].total =
                updated[existingIndex].quantity * updated[existingIndex].price;

              setTotal(
                updated.reduce((sum, i) => sum + i.total, 0)
              );

              return updated;
            }

            // لو منتج جديد
            const next = [
              ...prev,
              {
                _id: product._id,
                name: product.name,
                price,
                quantity: 1,
                unit,
                unitOptions: product.unitOptions || [product.unit],
                expiryDate: product.expiryDate,
                total: price,
                fullProduct: product,
                isShortcoming: product.isShortcoming,
              },
            ];

            setTotal(
              next.reduce((sum, i) => sum + i.total, 0)
            );

            return next;
          });
        }}
      />

      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            color: "var(--primary)",
            letterSpacing: "-0.5px",
          }}
        >
          🔄 مرتجع مبيعات
        </Typography>

        {/* ===== Stats + Save ===== */}
        <Box
          className="glass-card"
          sx={{
            px: 4,
            py: 2,
            display: "flex",
            alignItems: "center",
            gap: 4,
            borderRadius: 3,
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: "text.secondary" }}
            >
              إجمالي المرتجع
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 900, color: "var(--secondary)" }}
            >
              {total.toLocaleString()} ج.م
            </Typography>
          </Box>

          {/* Stylish Save Button */}
          <Button
            onClick={() => setShowConfirmPopup(true)}
            disabled={items.length === 0}
            sx={{
              px: 4,
              height: 48,
              borderRadius: "14px",
              fontWeight: 800,
              color: "#fff",
              background:
                "linear-gradient(135deg, #e53935, #ff7043)",
              boxShadow: "0 10px 25px rgba(229,57,53,0.35)",
              transition: "all 0.25s ease",
              "&:hover": {
                transform: "translateY(-2px) scale(1.03)",
                boxShadow: "0 14px 30px rgba(229,57,53,0.45)",
              },
              "&.Mui-disabled": {
                background: "rgba(0,0,0,0.2)",
                boxShadow: "none",
              },
            }}
          >
            💾 حفظ المرتجع
          </Button>
        </Box>
      </Box>

      {/* ===== Table ===== */}
      <Paper className="glass-card" sx={{ overflow: "hidden", borderRadius: 3 }}>
        <TableContainer sx={{ maxHeight: "60vh" }}>
          <Table className="modern-table" stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  "المنتج",
                  "السعر",
                  "الكمية",
                  "الوحدة",
                  "المتبقي",
                  "الصلاحية",
                  "الإجمالي",
                  "إجراءات",
                ].map((h) => (
                  <TableCell key={h} align="center" sx={{ fontWeight: 800 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{it.name}</TableCell>
                  <TableCell align="center">{it.price} ج.م</TableCell>

                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={it.quantity}
                      onChange={(e) =>
                        handleFieldChange(idx, "quantity", e.target.value)
                      }
                      sx={{ width: 90 }}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Select
                      size="small"
                      value={it.unit}
                      onChange={(e) =>
                        handleFieldChange(idx, "unit", e.target.value)
                      }
                    >
                      {it.unitOptions.map((u) => (
                        <MenuItem key={u} value={u}>
                          {u}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell align="center">
                    <Box
                      sx={{
                        px: 2,
                        py: 0.6,
                        borderRadius: 2,
                        bgcolor: "rgba(0,0,0,0.05)",
                        fontWeight: 700,
                      }}
                    >
                      {calculateRemaining(it.fullProduct, it.quantity, it.unit)}
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    {it.expiryDate
                      ? new Date(it.expiryDate).toLocaleDateString("ar-EG")
                      : "—"}
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{ fontWeight: 900, color: "var(--primary)" }}
                  >
                    {it.total} ج.م
                  </TableCell>

                  <TableCell align="center">
                    <IconButton
                      color="error"
                      onClick={() => requestDeleteItem(idx)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {/* ===== Add Product Button ===== */}
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Box
                    onClick={() => setShowSearch(true)}
                    sx={{
                      px: 5,
                      py: 1.8,
                      borderRadius: "999px",
                      fontWeight: 800,
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1.2,
                      cursor: "pointer",
                      background:
                        "linear-gradient(135deg, rgba(0,137,123,0.95), rgba(38,166,154,0.9))",
                      boxShadow:
                        "0 12px 35px rgba(0,137,123,0.4)",
                      transition: "all 0.25s ease",
                      "&:hover": {
                        transform: "translateY(-3px) scale(1.04)",
                        boxShadow:
                          "0 18px 45px rgba(0,137,123,0.5)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        bgcolor: "rgba(255,255,255,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ➕
                    </Box>
                    إضافة منتج يدويًا
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
     <ProductSelectDialog
  open={showSearch}
  onClose={() => setShowSearch(false)}
  products={products}
  searchResults={searchResults}
  setSearchResults={setSearchResults}
  selectedProduct={selectedProduct}
  setSelectedProduct={setSelectedProduct}
  tempQuantity={tempQuantity}
  setTempQuantity={setTempQuantity}
  tempUnit={tempUnit}
  setTempUnit={setTempUnit}
  tempExpiry={tempExpiry}
  setTempExpiry={setTempExpiry}
  variants={variants}
  setVariants={setVariants}
  handleAddProduct={handleAddProduct}
/>


    </Container>

  );
};

export default ReturnsPage;
