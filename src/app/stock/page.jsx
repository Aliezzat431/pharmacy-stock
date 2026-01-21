"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Tooltip,
} from "@mui/material";
import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";
import { typesWithUnits } from "../lib/unitOptions";
import { useToast } from "../components/ToastContext";

const Stock = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("all");
  const [openModal, setOpenModal] = useState(false);
  const [focusedProductId, setFocusedProductId] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchProducts(searchTerm, searchMode);
  }, [searchTerm, searchMode]);

  const fetchProducts = async (query = "", mode = "all") => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/search", {
        params: {
          ...(query && { q: query }),
          mode,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleModeChange = (e) => {
    setSearchMode(e.target.value);
  };

  const handleVariantChange = (name, id) => {
    setSelectedVariants((prev) => ({ ...prev, [name]: id }));
  };

  const handleBarcodeChange = (id, newBarcode) => {
    setProducts((prev) =>
      prev.map((product) =>
        product._id === id ? { ...product, barcode: newBarcode } : product
      )
    );
  };

  const handleQuantityChange = (id, newQuantity) => {
    setProducts((prev) =>
      prev.map((product) =>
        product._id === id ? { ...product, quantity: newQuantity } : product
      )
    );
  };

  const handleUnitChange = (id, newUnit) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product._id !== id) return product;

        const conversion = product.unitConversion || 1;
        let newQuantity = product.quantity;

        if (product.unit !== newUnit) {
          newQuantity =
            newUnit === "شريط"
              ? product.quantity * conversion
              : product.quantity / conversion;
        }

        return { ...product, unit: newUnit, quantity: newQuantity };
      })
    );
  };

  const handleUnitConversionChange = (id, newVal) => {
    setProducts((prev) =>
      prev.map((product) =>
        product._id === id ? { ...product, unitConversion: newVal } : product
      )
    );
  };

  const handleSave = async (product) => {
    try {
      const token = localStorage.getItem("token");
      const conversion = product.unitConversion || 1;

      const quantityToSend =
        product.unit === "شريط"
          ? parseFloat(product.quantity) / conversion
          : parseFloat(product.quantity);

      // Update barcode if it exists
      if (product.barcode) {
        await axios.patch(
          "/api/products",
          {
            id: product._id,
            mode: "barcode",
            barcode: product.barcode,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // Update quantity
      await axios.patch(
        "/api/products",
        {
          id: product._id,
          mode: "quantity",
          quantity: quantityToSend,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update expiry date
      if (product.expiryDate) {
        await axios.patch(
          "/api/products",
          {
            id: product._id,
            mode: "expiryDate",
            expiryDate: product.expiryDate,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }



      // Update unit conversion
      if (product.unitConversion) {
        await axios.patch(
          "/api/products",
          {
            id: product._id,
            mode: "unitConversion",
            unitConversion: product.unitConversion,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      if (product.unitConversion) {
        await axios.patch(
          "/api/products",
          {
            id: product._id,
            mode: "unitConversion",
            unitConversion: product.unitConversion,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      showToast("✅ تم الحفظ بنجاح", "success");
      fetchProducts(searchTerm, searchMode);
    } catch (error) {
      console.error("Error saving product:", error);
      showToast("❌ فشل الحفظ", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/products?id=${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("✅ تم الحذف بنجاح", "success");
      setProducts(prev => prev.filter(p => p._id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error("Error deleting product", err);
      showToast("❌ حدث خطأ أثناء الحذف", "error");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, width: "100%", minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>
          📦 إدارة المخزون
        </Typography>
        <Button
          variant="contained"
          onClick={() => setOpenModal(true)}
          startIcon={<span>➕</span>}
          sx={{
            px: 4, py: 1.5, borderRadius: '12px', fontWeight: 700,
            bgcolor: 'var(--primary)',
            boxShadow: '0 4px 14px 0 rgba(0,137,123,0.39)',
            "&:hover": { bgcolor: "var(--primary-hover)", transform: "translateY(-2px)" },
            transition: '0.3s'
          }}
        >
          منتج جديد
        </Button>
      </Box>

      {/* Search & Filter */}
      <Box className="glass-card" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'var(--glass-bg)' }}>
        <TextField
          fullWidth
          placeholder="🔍 بحث باسم المنتج أو الباركود..."
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
        <Select
          value={searchMode}
          onChange={handleModeChange}
          size="small"
          sx={{ minWidth: 150, borderRadius: '12px' }}
        >
          <MenuItem value="all">عرض الكل</MenuItem>
          <MenuItem value="shortcomings">النواقص فقط</MenuItem>
        </Select>
      </Box>

      {/* Products Table */}
      <TableContainer className="glass-card" sx={{ flexGrow: 1, overflow: 'auto', border: '1px solid var(--glass-border)', bgcolor: 'var(--glass-bg)' }}>
        <Table stickyHeader className="modern-table">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 800 }}>#</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>الاسم</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>النوع</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>الوحدة</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>التحويل</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>الكمية</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>الباركود</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>التفاصيل</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>تاريخ الانتهاء</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>الإجراء</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {products.map((product, index) => (
              <TableRow key={product._id} hover>
                <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {index + 1}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                <TableCell align="right">{product.type}</TableCell>
                <TableCell align="right">
                  <Select
                    value={product.unit}
                    onChange={(e) => handleUnitChange(product._id, e.target.value)}
                    size="small"
                    sx={{ minWidth: 100, borderRadius: '8px' }}
                  >
                    {(product.unitOptions && product.unitOptions.length > 0
                      ? product.unitOptions
                      : (typesWithUnits[product.type] || [])
                    ).map((u) => (
                      <MenuItem key={u} value={u}>{u}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell align="right">
                  <TextField
                    value={product.unitConversion || ""}
                    onChange={(e) => handleUnitConversionChange(product._id, e.target.value)}
                    type="number"
                    size="small"
                    variant="standard"
                    sx={{ width: 60, '& input': { textAlign: 'center' } }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    value={String(Number(product.quantity))}
                    onChange={(e) => handleQuantityChange(product._id, e.target.value)}
                    type="number"
                    size="small"
                    variant="standard"
                    sx={{ width: 80, '& input': { textAlign: 'right', fontWeight: 700, color: 'var(--secondary)' } }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    value={product.barcode || ""}
                    onFocus={() => setFocusedProductId(product._id)}
                    onBlur={() => setFocusedProductId(null)}
                    onChange={(e) => handleBarcodeChange(product._id, e.target.value)}
                    size="small"
                    variant="standard"
                    sx={{ width: 120 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={product.details || "لا توجد تفاصيل"}>
                    <Typography variant="body2" sx={{ width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help' }}>
                      {product.details || "-"}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="date"
                    value={product.expiryDate ? new Date(product.expiryDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => {
                      const updated = products.map((p) =>
                        p._id === product._id ? { ...p, expiryDate: e.target.value } : p
                      );
                      setProducts(updated);
                    }}
                    size="small"
                    variant="standard"
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleSave(product)}
                    sx={{
                      borderRadius: '8px',
                      bgcolor: 'var(--primary)',
                      mr: 1,
                      '&:hover': { bgcolor: 'var(--primary-hover)' }
                    }}
                  >
                    حفظ
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => setDeleteId(product._id)}
                    sx={{ borderRadius: '8px' }}
                  >
                    حذف
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                  <Typography variant="h6" color="text.secondary">
                    لا توجد منتجات مطابقة للبحث أو المخزون فارغ.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modals and Barcode Scanner */}
      <CreateProductForm openModal={openModal} setOpenModal={setOpenModal} />

      <BarcodeScanner
        onScan={(scannedBarcode) => {
          if (focusedProductId) {
            setProducts((prev) =>
              prev.map((product) =>
                product._id === focusedProductId
                  ? { ...product, barcode: scannedBarcode }
                  : product
              )
            );
          } else {
            setSearchTerm(scannedBarcode);
            fetchProducts(scannedBarcode, searchMode);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <Box sx={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          bgcolor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Paper className="glass-card" sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom>هل أنت متأكد من حذف هذا المنتج؟</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>لا يمكن التراجع عن هذا الإجراء.</Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" color="error" onClick={handleDelete}>حذف نهائي</Button>
              <Button variant="outlined" onClick={() => setDeleteId(null)}>إلغاء</Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default Stock;
