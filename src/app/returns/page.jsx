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
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Box,
  IconButton,
  MenuItem,
  Select,
  TableFooter,
  FormControl,
  InputLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import BarcodeScanner from "../components/BarcodeScanner";

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

  const getUnitFactor = (unit, selectedProduct) => {
    const baseUnit = typesWithUnits[selectedProduct.type]?.[0]; // مثل "شريط"
    const otherUnit = typesWithUnits[selectedProduct.type]?.[1]; // مثل "علبة"
    const conversion = selectedProduct.unitConversion;

    if (unit === baseUnit) return 1;
    if (unit === otherUnit) return conversion;
    return 1; // fallback
  };

  const calculateRemaining = (product, usedQty, usedUnit) => {
    if (!product || !usedUnit) return "";

    const conversion = product.unitConversion;
    const units = typesWithUnits[product.type] || [product.unit];
    const smallUnit = units[0];
    const bigUnit = units[1] || product.unit;

    const stockInSmallUnit = product.quantity * (product.unit === smallUnit ? 1 : conversion);
    const usedInSmallUnit = usedQty * (usedUnit === smallUnit ? 1 : conversion);
    const remainingInSmallUnit = stockInSmallUnit + usedInSmallUnit;
    const remainingInBoxes = remainingInSmallUnit / conversion;

    return remainingInBoxes;
  };





  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/returns", {
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
    if (unit !== product.unit && product.unitConversion && product.unitConversion[unit]) {
      return product.price / product.unitConversion[unit];
    }
    return product.price;
  };



  const handleAddProductClick = (product) => {
    setSelectedProduct(product);
    setTempQuantity(1);
    setTempUnit(product.unitOptions?.[0] || product.unit);
    setShowSearch(false);
  };

  const handleConfirmAdd = () => {
    if (!selectedProduct) return;
    const price = calculateUnitPrice(selectedProduct, tempUnit);
    const newItem = {
      name: selectedProduct.name,
      _id: selectedProduct._id,
      price,
      quantity: tempQuantity,
      unit: tempUnit,
      total: price * tempQuantity,
      unitOptions: selectedProduct.unitOptions || [selectedProduct.unit],
      fullProduct: selectedProduct,
      expiryDate: selectedProduct.expiryDate,
    };
    setItems((prev) => {
      const next = [...prev, newItem];
      setTotal(next.reduce((sum, i) => sum + i.total, 0));
      return next;
    });
    setSelectedProduct(null);
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
console.log(barcode);

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

          const alreadyAdded = items.some((item) => item._id === product._id);
          if (alreadyAdded) {
            alert("✅ هذا المنتج مضاف بالفعل.");
            return;
          }

          const unit = product.unitOptions?.[0] || product.unit;
          const price = calculateUnitPrice(product, unit);
          const total = price * 1;

          setItems((prev) => [
            ...prev,
            {
              _id: product._id,
              name: product.name,
              price,
              quantity: 1,
              unit,
              unitOptions: product.unitOptions || [product.unit],
              expiryDate: product.expiryDate,
              total,
              fullProduct: product,
                  isShortcoming: product.isShortcoming, // 👈 Add this line

            },
          ]);
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
              <TableCell>المتبقي </TableCell>
              <TableCell>تاريخ الإنتهاء</TableCell>
              <TableCell>المجموع</TableCell>
            </TableRow>
          </TableHead>
 <TableBody>
  {items.map((it, idx) => (
    <TableRow
      key={idx}
      sx={{
        backgroundColor: calculateRemaining(it.fullProduct, it.quantity, it.unit)<5 ? "#fff9c4" : "inherit", // 👈 yellow if shortcoming
      }}
    >

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
                <TableCell>
                  {calculateRemaining(it.fullProduct, it.quantity, it.unit)}
                </TableCell>
                <TableCell>
                  {it.expiryDate
                    ? new Date(it.expiryDate).toLocaleDateString("ar-EG")
                    : "—"}
                </TableCell>
                <TableCell>{it.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={6} align="center" onClick={() => setShowSearch(true)} style={{ cursor: "pointer" }}>
                ➕ إضافة منتج
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>

      <Dialog open={showSearch} onClose={() => { setShowSearch(false) }} fullWidth maxWidth="md">
        <DialogTitle>
          البحث عن صنف
          <IconButton
            onClick={() => setShowSearch(false)}
            sx={{ position: "absolute", left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <TextField
            fullWidth
            placeholder="اكتب اسم الدواء..."
            onChange={(e) =>
              setSearchResults(
                products.filter((p) =>
                  p.name.toLowerCase().includes(e.target.value.toLowerCase())
                )
              )
            }
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
              {searchResults.map((p) => (
                <TableRow
                  key={p._id}
                  hover
                  onClick={() => {
                    setSelectedProduct(p);
                    setTempQuantity(1);
                    setTempUnit(p.unitOptions?.[0] || p.unit);
                  }}
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
                label="المتبقي"
                size="small"
                value={calculateRemaining(selectedProduct, tempQuantity, tempUnit)}
                InputProps={{ readOnly: true }}
                sx={{ width: 100 }}
              />




              <TextField
                label="السعر"
                size="small"
                value={calculateUnitPrice(selectedProduct, tempUnit)}
                InputProps={{ readOnly: true }}
                sx={{ width: 100 }}
              />

              <TextField
                label="الصلاحية"
                size="small"
                value={
                  selectedProduct.expiryDate
                    ? new Date(selectedProduct.expiryDate).toLocaleDateString("EG")
                    : "—"
                }
                InputProps={{}}
                sx={{ width: 130 }}
              />
            </Box>

          )}
        </DialogContent>

        {selectedProduct && (
          <DialogActions>
            <Button onClick={() => setShowSearch(false)} color="error">
              إلغاء
            </Button>
            <Button onClick={() => { handleConfirmAdd(); setShowSearch(false) }} variant="contained">
              إضافة
            </Button>
          </DialogActions>
        )}
      </Dialog>



      <Dialog open={showConfirmPopup} onClose={() => setShowConfirmPopup(false)}>
        <DialogTitle>هل تريد حفظ المرتجع؟</DialogTitle>
        <DialogActions>
          <Button color="error" onClick={doSave}>
            نعم
          </Button>
          <Button onClick={() => setShowConfirmPopup(false)}>إلغاء</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReturnsPage;
