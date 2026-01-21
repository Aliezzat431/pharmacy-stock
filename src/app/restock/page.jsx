"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Box,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    Paper,
    InputAdornment,
    CircularProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SaveIcon from "@mui/icons-material/Save";
import { typesWithUnits } from "../lib/unitOptions";
import { useToast } from "../components/ToastContext";

const RestockPage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [restockData, setRestockData] = useState({});
    const { showToast } = useToast();

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts(searchTerm);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const fetchProducts = async (query) => {
        if (!query) {
            setProducts([]);
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/search", {
                params: { q: query },
                headers: { Authorization: `Bearer ${token}` },
            });
            setProducts(res.data.products || []);
        } catch (err) {
            console.error("Error fetching products", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestockChange = (id, field, value) => {
        setRestockData((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    const handleUpdateStock = async (product) => {
        const updates = restockData[product._id];
        if (!updates || !updates.quantity || parseFloat(updates.quantity) <= 0) {
            showToast("يرجى إدخال كمية صحيحة", "warning");
            return;
        }

        const qtyToAdd = parseFloat(updates.quantity);
        const selectedUnit = updates.unit || product.unit;

        // Calculate conversion
        const conversion = product.unitConversion || 1;
        let finalQtyToAdd = qtyToAdd;

        if (selectedUnit !== product.unit) {
            if (selectedUnit === "شريط") {
                // Adding strips to a box-based product
                finalQtyToAdd = qtyToAdd / conversion;
            } else if (selectedUnit === "علبة") {
                // Adding boxes to a strip-based product
                finalQtyToAdd = qtyToAdd * conversion;
            }
        }

        try {
            const token = localStorage.getItem("token");

            // We use PATCH mode=quantity. But PATCH sets absolute.
            // So we calculate new total here.
            const newTotal = parseFloat(product.quantity) + finalQtyToAdd;

            await axios.patch("/api/products", {
                id: product._id,
                mode: "quantity",
                quantity: newTotal
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showToast(`✅ تم إضافة الكمية بنجاح: ${qtyToAdd} ${selectedUnit}`, "success");
            setRestockData(prev => {
                const newState = { ...prev };
                delete newState[product._id];
                return newState;
            });
            fetchProducts(searchTerm); // Refresh
        } catch (err) {
            console.error("Failed to update stock", err);
            showToast("❌ حدث خطأ أثناء التحديث", "error");
        }
    };

    return (
        <Box sx={{ p: 4, minHeight: "100vh" }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: "var(--primary)" }}>
                ➕ إضافة رصيد للمنتجات (النواقص)
            </Typography>

            <Paper className="glass-card" sx={{ p: 2, mb: 4, bgcolor: "var(--glass-bg)" }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="ابحث عن اسم المنتج (يمكنك كتابة جزء من الاسم)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="primary" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}

            {!loading && products.length > 0 && (
                <TableContainer component={Paper} className="glass-card" sx={{ overflowY: 'auto', maxHeight: '70vh' }}>
                    <Table stickyHeader className="modern-table">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800 }}>المنتج</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>الكمية الحالية</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>الوحدة الحالية</TableCell>
                                <TableCell sx={{ fontWeight: 800, width: 150 }}>الكمية المضافة</TableCell>
                                <TableCell sx={{ fontWeight: 800, width: 150 }}>الوحدة المختارة</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>إجراء</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((product) => {
                                const draft = restockData[product._id] || {};
                                const options = product.unitOptions && product.unitOptions.length > 0
                                    ? product.unitOptions
                                    : typesWithUnits[product.type] || [product.unit];

                                return (
                                    <TableRow key={product._id} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                                        <TableCell>
                                            <Box sx={{
                                                p: 1,
                                                borderRadius: 2,
                                                bgcolor: product.quantity < 5 ? 'rgba(255,0,0,0.1)' : 'transparent',
                                                color: product.quantity < 5 ? 'error.main' : 'inherit',
                                                fontWeight: 'bold',
                                                display: 'inline-block'
                                            }}>
                                                {Number(product.quantity).toLocaleString()}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{product.unit}</TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                type="number"
                                                placeholder="0"
                                                value={draft.quantity || ""}
                                                onChange={(e) => handleRestockChange(product._id, "quantity", e.target.value)}
                                                sx={{ borderRadius: 1 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                size="small"
                                                value={draft.unit || product.unit}
                                                onChange={(e) => handleRestockChange(product._id, "unit", e.target.value)}
                                                fullWidth
                                                sx={{ borderRadius: 1 }}
                                            >
                                                {options.map(u => (
                                                    <MenuItem key={u} value={u}>{u}</MenuItem>
                                                ))}
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="contained"
                                                startIcon={<AddCircleOutlineIcon />}
                                                onClick={() => handleUpdateStock(product)}
                                                disabled={!draft.quantity}
                                                sx={{
                                                    fontWeight: 700,
                                                    bgcolor: 'var(--primary)',
                                                    '&:hover': { bgcolor: 'var(--primary-hover)' }
                                                }}
                                            >
                                                إضافة
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {!loading && products.length === 0 && searchTerm && (
                <Typography variant="h6" align="center" color="textSecondary" sx={{ mt: 4 }}>
                    لا توجد نتائج مطابقة لـ "{searchTerm}"
                </Typography>
            )}
        </Box>
    );
};

export default RestockPage;
