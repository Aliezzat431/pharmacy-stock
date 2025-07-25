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
  Modal,
  Container,
} from "@mui/material";
import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";



const Stock = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openModal, setOpenModal] = useState(false);

  const fetchProducts = async (query = "") => {
    try {
      const token = localStorage.getItem("token"); // أو أي طريقة أخرى لتخزين واسترجاع التوكن

   const res = await axios.get("/api/search", {
  params: query ? { q: query } : {},
  headers: {
    Authorization: `Bearer ${token}`, // استبدل `token` بالتوكن الفعلي
  },
});
console.log(res.data.products);

      setProducts(res.data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchProducts(); // load all products initially
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchProducts(value);
  };

  const handleBarcodeChange = (id, newBarcode) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === id ? { ...p, barcode: newBarcode } : p))
    );
  };

  const handleQuantityChange = (id, newQuantity) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === id ? { ...p, quantity: newQuantity } : p))
    );
  };

const handleUnitChange = (id, newUnit) => {
  setProducts((prev) =>
    prev.map((p) => {
      if (p._id !== id) return p;

      const conversion = p.unitConversion || 1;
      let newQuantity = p.quantity;

      if (p.unit !== newUnit) {
        if (newUnit === "شريط") {
          // تحويل من علبة إلى شريط
          newQuantity = p.quantity * conversion;
        } else {
          // تحويل من شريط إلى علبة
          newQuantity = p.quantity / conversion;
        }
      }

      return { ...p, unit: newUnit, quantity: newQuantity };
    })
  );
};





const handleSave = async (product) => {
  try {
    const token = localStorage.getItem("token");

    const convert = product.unitConversion || 1;
    let quantityToSend =
      product.unit === "شريط"
        ? parseFloat(product.quantity) / convert
        : parseFloat(product.quantity);

    if (product.barcode) {
      await axios.patch(
        "/api/products",
        {
          id: product._id,
          mode: "barcode",
          barcode: product.barcode,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }

    await axios.patch(
      "/api/products",
      {
        id: product._id,
        mode: "quantity",
        quantity: quantityToSend,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    alert("✅ تم الحفظ");
    fetchProducts(searchTerm);
  } catch (error) {
    console.error("Error saving product:", error);
    alert("❌ فشل الحفظ");
  }
};



  return (
<Box p={4} width="100%" flexGrow={1}>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h5">📦 إدارة المخزون</Typography>
        <Button variant="contained" onClick={() => setOpenModal(true)}>
          ➕ منتج جديد
        </Button>
      </Box>

      <TextField
        fullWidth
        label="🔍 بحث باسم المنتج أو الباركود"
        value={searchTerm}
        onChange={handleSearchChange}
        sx={{ mb: 3 }}
      />

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
              <TableCell align="right">تحديث</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  لا توجد نتائج
                </TableCell>
              </TableRow>
            ) : (
              products.map((product, index) => (
                <TableRow key={product._id}>
                  <TableCell align="center">{index + 1}</TableCell>
                  <TableCell align="right">{product.name}</TableCell>
                  <TableCell align="right">{product.type}</TableCell>
                  <TableCell align="right">
                    <Select
                      value={product.unit}
                      onChange={(e) =>
                        handleUnitChange(product._id, e.target.value)
                      }
                      size="small"
                    >
                      {(product.unitOptions || []).map((u) => (
                        <MenuItem key={u} value={u}>
                          {u}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      value={product.quantity}
                      onChange={(e) =>
                        handleQuantityChange(product._id, e.target.value)
                      }
                      type="number"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      value={product.barcode || ""}
                      onChange={(e) =>
                        handleBarcodeChange(product._id, e.target.value)
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => handleSave(product)}
                    >
                      حفظ
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

   
          {/* يمكنك تضمين نموذج إضافة منتج جديد هنا */}
          <CreateProductForm openModal={openModal} setOpenModal={setOpenModal} />
      
    </Box>
  );
};

export default Stock;
