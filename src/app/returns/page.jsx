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
  TableFooter,
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
    if (
      unit !== product.unit &&
      product.unitConversion &&
      product.unitConversion[unit]
    ) {
      return product.price / product.unitConversion[unit];
    }
    return product.price;
  };

  // FIXED: now replaces quantity instead of adding on top of already updated value
  const handleAddProduct = () => {
    if (!selectedProduct) return;
    const unit = tempUnit || selectedProduct.unitOptions?.[0] || selectedProduct.unit;
    const price = calculateUnitPrice(selectedProduct, unit);

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i._id === selectedProduct._id && i.unit === unit);

      if (existingIndex !== -1) {
        // update quantity to the new value instead of adding
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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <BarcodeScanner
        onScan={(barcode) => {
          const product = products.find((p) => p.barcode?.toString() === barcode);
          if (!product) {
            alert(`🚫 لم يتم العثور على منتج بالباركود: ${barcode}`);
            return;
          }
          const expiry = new Date(product.expiryDate).setHours(0, 0, 0, 0);
          const today = new Date().setHours(0, 0, 0, 0);
          if (expiry <= today) {
            const confirm = window.confirm("⚠️ هذا المنتج منتهي الصلاحية، هل تريد إضافته؟");
            if (!confirm) return;
          }

          const unit = product.unitOptions?.[0] || product.unit;
          const price = calculateUnitPrice(product, unit);

          setItems((prev) => {
            const existingIndex = prev.findIndex((i) => i._id === product._id && i.unit === unit);

            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex].quantity += 1;
              updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
              setTotal(updated.reduce((sum, i) => sum + i.total, 0));
              return updated;
            } else {
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
                  total: price * 1,
                  fullProduct: product,
                  isShortcoming: product.isShortcoming,
                },
              ];
              setTotal(next.reduce((sum, i) => sum + i.total, 0));
              return next;
            }
          });
        }}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">إجمالي المرتجع: {total} جنيه</Typography>
        <Button variant="contained" color="error" onClick={() => setShowConfirmPopup(true)}>
          حفظ المرتجع
        </Button>
      </Box>

      <Snackbar open={!!successMessage} autoHideDuration={4000} onClose={() => setSuccessMessage("")}>
        <Alert onClose={() => setSuccessMessage("")} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>السعر</TableCell>
              <TableCell>الكمية</TableCell>
              <TableCell>الوحدة</TableCell>
              <TableCell>المتبقي</TableCell>
              <TableCell>تاريخ الإنتهاء</TableCell>
              <TableCell>المجموع</TableCell>
              <TableCell>حذف</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow key={idx}>
                <TableCell>{it.name}</TableCell>
                <TableCell>{it.price}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={it.quantity}
                    onChange={(e) => handleFieldChange(idx, "quantity", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={it.unit}
                    onChange={(e) => handleFieldChange(idx, "unit", e.target.value)}
                  >
                    {it.unitOptions.map((u) => (
                      <MenuItem key={u} value={u}>
                        {u}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>{calculateRemaining(it.fullProduct, it.quantity, it.unit)}</TableCell>
                <TableCell>
                  {it.expiryDate
                    ? new Date(it.expiryDate).toLocaleDateString("ar-EG")
                    : "—"}
                </TableCell>
                <TableCell>{it.total}</TableCell>
                <TableCell>
                  <IconButton color="error" onClick={() => requestDeleteItem(idx)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={8} align="center" onClick={() => setShowSearch(true)} style={{ cursor: "pointer" }}>
                ➕ إضافة منتج
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>

      <ProductSelectDialog
        open={showSearch}
        onClose={() => setShowSearch(false)}
        products={products}
        searchResults={searchResults}
        setSearchResults={setSearchResults}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        tempSelections={tempSelections}
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

      {/* Save Confirmation */}
      <Dialog open={showConfirmPopup} onClose={() => setShowConfirmPopup(false)}>
        <DialogTitle>هل تريد حفظ المرتجع؟</DialogTitle>
        <DialogActions>
          <Button color="error" onClick={doSave}>
            نعم
          </Button>
          <Button onClick={() => setShowConfirmPopup(false)}>إلغاء</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>هل أنت متأكد أنك تريد حذف هذا المنتج؟</DialogTitle>
        <DialogActions>
          <Button color="error" onClick={() => handleDeleteItem(productToDelete)}>
            حذف
          </Button>
          <Button onClick={() => setDeleteConfirmOpen(false)}>إلغاء</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReturnsPage;
