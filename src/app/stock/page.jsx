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
} from "@mui/material";
import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";

const Stock = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("all");
  const [openModal, setOpenModal] = useState(false);
  const [focusedProductId, setFocusedProductId] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState({});

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

    alert("✅ تم الحفظ");
    fetchProducts(searchTerm, searchMode);
  } catch (error) {
    console.error("Error saving product:", error);
    alert("❌ فشل الحفظ");
  }
};


  return (
    <Box p={4} width="100%" flexGrow={1}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">📦 إدارة المخزون</Typography>
        <Button variant="contained" onClick={() => setOpenModal(true)}>
          ➕ منتج جديد
        </Button>
      </Box>

      {/* Search & Filter */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <TextField
          fullWidth
          label="🔍 بحث باسم المنتج أو الباركود"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <Select value={searchMode} onChange={handleModeChange} size="small">
          <MenuItem value="all">عرض الكل</MenuItem>
          <MenuItem value="shortcomings">النواقص فقط</MenuItem>
        </Select>
      </Box>

      {/* Products Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
            <TableRow>
              <TableCell align="center">#</TableCell>
              <TableCell align="right">الاسم</TableCell>
              <TableCell align="right">النوع</TableCell>
              <TableCell align="right">الوحدة</TableCell>
              <TableCell align="right">الكمية</TableCell>
              <TableCell align="right">الباركود</TableCell>
              <TableCell align="right">التاريخ</TableCell>
              <TableCell align="right">تحديث</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  لا توجد نتائج
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(
                products.reduce((acc, product) => {
                  acc[product.name] = acc[product.name] || [];
                  acc[product.name].push(product);
                  return acc;
                }, {})
              ).map(([name, variants], index) => {
                const selectedId = selectedVariants[name] || variants[0]._id;
                const selectedProduct = variants.find((v) => v._id === selectedId);

                return (
                  <TableRow key={selectedId}>
                    <TableCell align="center">{index + 1}</TableCell>
                    <TableCell align="right">{name}</TableCell>
                    <TableCell align="right">{selectedProduct.type}</TableCell>
                    <TableCell align="right">
                      <Select
                        value={selectedProduct.unit}
                        onChange={(e) =>
                          handleUnitChange(selectedProduct._id, e.target.value)
                        }
                        size="small"
                      >
                        {(selectedProduct.unitOptions || []).map((u) => (
                          <MenuItem key={u} value={u}>
                            {u}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        value={String(Number(selectedProduct.quantity))}
                        onChange={(e) =>
                          handleQuantityChange(selectedProduct._id, e.target.value)
                        }
                        type="number"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        value={selectedProduct.barcode || ""}
                        onFocus={() => setFocusedProductId(selectedProduct._id)}
                        onBlur={() => setFocusedProductId(null)}
                        onChange={(e) =>
                          handleBarcodeChange(selectedProduct._id, e.target.value)
                        }
                        size="small"
                      />
                    </TableCell>
<TableCell align="right">
  {(() => {
    const selectedVariant = variants.find((v) => v._id === selectedId);

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toISOString().split("T")[0]; // YYYY-MM-DD
    };

    const handleExpiryDateChange = (e) => {
      const inputDate = new Date(e.target.value).setHours(0, 0, 0, 0);
      const matchedVariant = variants.find((v) => {
        const variantDate = new Date(v.expiryDate).setHours(0, 0, 0, 0);
        return variantDate === inputDate;
      });

      if (matchedVariant) {
        handleVariantChange(name, matchedVariant._id);
      } else {
        // Update selected product expiry if no variant matched
        const updated = products.map((p) =>
          p._id === selectedProduct._id
            ? { ...p, expiryDate: e.target.value }
            : p
        );
        setProducts(updated);
      }
    };

    return (
      <TextField
        type="date"
        value={selectedVariant ? formatDate(selectedVariant.expiryDate) : ""}
        onChange={handleExpiryDateChange}
        size="small"
        fullWidth
      />
    );
  })()}
</TableCell>




                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleSave(selectedProduct)}
                      >
                        حفظ
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
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
    </Box>
  );
};

export default Stock;
