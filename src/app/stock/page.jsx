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
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Tooltip,
  IconButton,
  Zoom,
} from "@mui/material";

import {
  WarningAmber as WarningAmberIcon,
  ViewList as ViewListIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  DeleteForever as DeleteForeverIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

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
  const [deleteId, setDeleteId] = useState(null);
  const [inventoryMode, setInventoryMode] = useState(false);
  const { showToast } = useToast();

  const allTypes = Object.keys(typesWithUnits);

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

      const prods = (response.data.products || []).map((p) => ({
        ...p,
        originalQuantity: p.quantity,
      }));

      setProducts(prods);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleModeChange = (e) => setSearchMode(e.target.value);

  const updateProductState = (id, changes) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === id ? { ...p, ...changes } : p))
    );
  };

  const handleSave = async (product) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.patch(
        "/api/products",
        {
          mode: inventoryMode ? "inventory" : "update",
          product: {
            ...product,
            quantity: Number(product.quantity),
            purchasePrice: Number(product.purchasePrice),
            price: Number(product.price),
            conversion: Number(product.conversion),
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedProduct = response.data.product;

      setProducts((prev) =>
        prev.map((p) => (p._id === updatedProduct._id ? updatedProduct : p))
      );

      showToast("✅ تم التحديث بنجاح", "success");
    } catch (error) {
      console.error("Error saving product:", error);
      showToast("❌ فشل التحديث", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/products?id=${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("✅ تم الحذف بنجاح", "success");
      setProducts((prev) => prev.filter((p) => p._id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error("Error deleting product", err);
      showToast("❌ حدث خطأ أثناء الحذف", "error");
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        // Removed hardcoded background to allow body background to show
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
          p: { xs: 1.5, md: 2 },
          borderRadius: "16px",
          background: "var(--glass-bg)", // Updated
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--glass-border)", // Updated
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 6px 25px rgba(0, 0, 0, 0.08)",
            transform: "translateY(-1px)",
          },
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            background:
              "linear-gradient(90deg, var(--primary) 0%, #0a7d71 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.8px",
            position: "relative",
            display: "inline-block",
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: -4,
              left: 0,
              width: "40%",
              height: 3,
              background: "linear-gradient(90deg, var(--primary), transparent)",
              borderRadius: "2px",
            },
          }}
        >
          📦 إدارة المخزون
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 2 } }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={inventoryMode}
                onChange={(e) => setInventoryMode(e.target.checked)}
                sx={{
                  color: "var(--primary)",
                  "&.Mui-checked": { color: "var(--primary)" },
                  "& .MuiSvgIcon-root": { fontSize: 28 },
                }}
              />
            }
            label={
              <Typography
                sx={{
                  fontWeight: 600,
                  color: inventoryMode ? "var(--primary)" : "text.secondary",
                  fontSize: { xs: "0.85rem", md: "1rem" },
                }}
              >
                جرد
              </Typography>
            }
            sx={{ mx: 0, "& .MuiFormControlLabel-label": { ml: 1 } }}
          />

          <Button
            variant="contained"
            onClick={() => setOpenModal(true)}
            startIcon={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  bgcolor: "rgba(255,255,255,0.3)",
                  borderRadius: "50%",
                }}
              >
                <span style={{ fontSize: "1.1em" }}>+</span>
              </Box>
            }
            sx={{
              px: { xs: 2, md: 4 },
              py: { xs: 1, md: 1.5 },
              borderRadius: "14px",
              fontWeight: 700,
              fontSize: { xs: "0.875rem", md: "1rem" },
              bgcolor: "var(--primary)",
              backgroundImage:
                "linear-gradient(120deg, var(--primary) 0%, #0a7d71 100%)",
              color: "white",
              boxShadow: "0 4px 20px rgba(0, 137, 123, 0.35)",
              "&:hover": {
                bgcolor: "var(--primary-hover)",
                backgroundImage:
                  "linear-gradient(120deg, var(--primary-hover) 0%, #086a60 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 6px 25px rgba(0, 137, 123, 0.45)",
              },
              "&:active": { transform: "translateY(0)" },
              transition:
                "all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              whiteSpace: "nowrap",
            }}
          >
            منتج جديد
          </Button>
        </Box>
      </Box>

      {/* Search */}
      <Box
        sx={{
          p: { xs: 1.5, md: 2 },
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, md: 2 },
          gap: { xs: 1, md: 2 },
          borderRadius: "16px",
          bgcolor: "var(--glass-bg)", // Updated
          backdropFilter: "blur(12px)",
          border: "1px solid var(--glass-border)", // Updated
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 6px 25px rgba(0, 0, 0, 0.08)",
            transform: "translateY(-1px)",
          },
        }}
      >
        <TextField
          fullWidth
          placeholder="🔍 ابحث باسم المنتج، الباركود، أو التصنيف..."
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            sx: {
              borderRadius: "14px",
              py: { xs: 0.75, md: 1 },
              px: { xs: 1.5, md: 2 },
              fontSize: "0.95rem",
              "& fieldset": {
                border: "1px solid var(--glass-border)",
                transition: "border-color 0.3s",
              },
              "&:hover fieldset": {
                borderColor: "var(--primary)",
              },
              "&.Mui-focused fieldset": {
                borderColor: "var(--primary)",
                borderWidth: "1.8px",
              },
            },
          }}
        />

        <Select
          value={searchMode}
          onChange={handleModeChange}
          size="medium"
          sx={{
            minWidth: { xs: 120, md: 150 },
            minWidth: { xs: 120, md: 150 },
            borderRadius: "14px !important",
            bgcolor: "var(--glass-bg)", // Updated
            "& .MuiSelect-select": {
              py: { xs: 1, md: 1.25 },
              px: 2,
              display: "flex",
              alignItems: "center",
            },
            "&.MuiOutlinedInput-root": {
              "& fieldset": {
                border: "1px solid var(--glass-border)",
              },
              "&:hover fieldset": {
                borderColor: "var(--primary)",
              },
              "&.Mui-focused fieldset": {
                borderColor: "var(--primary)",
                borderWidth: "1.8px",
              },
            },
          }}
          IconComponent={(props) => (
            <Box component="span" {...props} sx={{ mr: 1 }}>
              <KeyboardArrowDownIcon fontSize="small" />
            </Box>
          )}
        >
          <MenuItem value="all" sx={{ py: 1.2 }}>
            <ViewListIcon fontSize="small" sx={{ color: "var(--primary)", mr: 1 }} />
            عرض الكل
          </MenuItem>
          <MenuItem value="shortcomings" sx={{ py: 1.2 }}>
            <WarningAmberIcon fontSize="small" sx={{ color: "#ff9800", mr: 1 }} />
            النواقص فقط
          </MenuItem>
        </Select>
      </Box>

      {/* Table */}
      <TableContainer
        sx={{
          width: "100%",
          width: "100%",
          borderRadius: "16px",
          border: "1px solid var(--glass-border)", // Updated
          bgcolor: "var(--glass-bg)", // Updated
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.07)",
          overflow: "hidden",
          transition: "all 0.4s ease",
          "&:hover": {
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.1)",
            transform: "translateY(-2px)",
          },
        }}
      >
        <Table
          stickyHeader
          sx={{
            tableLayout: "fixed",
            width: "100%",
            "& .MuiTableHead-root": {
              bgcolor: "rgba(248, 250, 252, 0.95)",
              backdropFilter: "blur(10px)",
              borderBottom: "2px solid rgba(0, 137, 123, 0.15)",
            },
            "& .MuiTableCell-head": {
              py: { xs: 1.2, md: 1.5 },
              px: { xs: 1, md: 1.5 },
              fontSize: { xs: "0.82rem", md: "0.9rem" },
              color: "var(--primary)", // Updated
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              borderBottom: "none",
            },
            "& .MuiTableCell-body": {
              py: { xs: 1, md: 1.4 },
              px: { xs: 0.8, md: 1.2 },
              fontSize: { xs: 0.85, md: 0.95 },
              color: "var(--foreground)", // Updated
              borderBottom: "1px solid var(--glass-border)", // Updated
            },
            "& .MuiTableRow-hover:hover": {
              bgcolor: "rgba(255, 255, 255, 0.1) !important", // Updated for glass effect
              transition: "background-color 0.2s ease",
            },
            "& .MuiTableRow-root:nth-of-type(odd)": {
              bgcolor: "rgba(255, 255, 255, 0.03)", // Updated subtle stripe
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell align="center">#</TableCell>
              <TableCell align="right">الاسم</TableCell>
              <TableCell align="right">النوع</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>الوحدة</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>التحويل</TableCell>
              <TableCell align="right">الكمية</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>سعر الشراء</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>سعر البيع</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>الباركود</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>التفاصيل</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>تاريخ الانتهاء</TableCell>
              <TableCell align="center">الإجراء</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {products.map((product, index) => (
              <TableRow
                key={product._id}
                hover
                sx={{
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "translateX(4px)",
                    boxShadow: "inset 4px 0 0 var(--primary)",
                  },
                }}
              >
                <TableCell align="center" sx={{ fontWeight: 700, color: "var(--primary)" }}>
                  {index + 1}
                </TableCell>

                {/* NAME */}
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  <TextField
                    value={product.name || ""}
                    onChange={(e) => updateProductState(product._id, { name: e.target.value })}
                    size="small"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        "& input": {
                          py: 0.6,
                          px: 1,
                          borderRadius: "8px",
                          bgcolor: "var(--glass-bg)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--foreground)",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "var(--glass-bg)",
                            borderColor: "var(--primary)",
                          },
                          "&:focus": {
                            bgcolor: "var(--glass-bg)",
                            boxShadow: "0 0 0 2px var(--primary)",
                            borderColor: "var(--primary)",
                          },
                        },
                      },
                    }}
                  />
                </TableCell>

                {/* TYPE */}
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  <Select
                    value={product.type || ""}
                    onChange={(e) => updateProductState(product._id, { type: e.target.value })}
                    size="small"
                    sx={{
                      width: "100%",
                      borderRadius: "8px",
                      "& .MuiSelect-select": {
                        py: 0.6,
                        px: 1,
                      },
                    }}
                  >
                    {allTypes.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>

                {/* UNIT */}
                <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <TextField
                    value={product.unit || ""}
                    onChange={(e) => updateProductState(product._id, { unit: e.target.value })}
                    size="small"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        "& input": {
                          py: 0.6,
                          px: 1,
                          borderRadius: "8px",
                          bgcolor: "var(--glass-bg)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--foreground)",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "var(--glass-bg)",
                            borderColor: "var(--primary)",
                          },
                          "&:focus": {
                            bgcolor: "var(--glass-bg)",
                            boxShadow: "0 0 0 2px var(--primary)",
                            borderColor: "var(--primary)",
                          },
                        },
                      },
                    }}
                  />
                </TableCell>

                {/* CONVERSION */}
                <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <TextField
                    value={product.conversion || 1}
                    onChange={(e) => updateProductState(product._id, { conversion: e.target.value })}
                    size="small"
                    type="number"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        "& input": {
                          py: 0.6,
                          px: 1,
                          borderRadius: "8px",
                          bgcolor: "var(--glass-bg)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--foreground)",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "var(--glass-bg)",
                            borderColor: "var(--primary)",
                          },
                          "&:focus": {
                            bgcolor: "var(--glass-bg)",
                            boxShadow: "0 0 0 2px var(--primary)",
                            borderColor: "var(--primary)",
                          },
                        },
                      },
                    }}
                  />
                </TableCell>

                {/* QUANTITY */}
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  <TextField
                    value={product.quantity || 0}
                    onChange={(e) => updateProductState(product._id, { quantity: e.target.value })}
                    size="small"
                    type="number"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        "& input": {
                          py: 0.6,
                          px: 1,
                          borderRadius: "8px",
                          bgcolor: "var(--glass-bg)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--foreground)",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "var(--glass-bg)",
                            borderColor: "var(--primary)",
                          },
                          "&:focus": {
                            bgcolor: "var(--glass-bg)",
                            boxShadow: "0 0 0 2px var(--primary)",
                            borderColor: "var(--primary)",
                          },
                        },
                      },
                    }}
                  />
                </TableCell>

                {/* PURCHASE PRICE */}
                <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <TextField
                    value={product.purchasePrice || 0}
                    onChange={(e) => updateProductState(product._id, { purchasePrice: e.target.value })}
                    size="small"
                    type="number"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        "& input": {
                          py: 0.6,
                          px: 1,
                          borderRadius: "8px",
                          bgcolor: "var(--glass-bg)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--foreground)",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "var(--glass-bg)",
                            borderColor: "var(--primary)",
                          },
                          "&:focus": {
                            bgcolor: "var(--glass-bg)",
                            boxShadow: "0 0 0 2px var(--primary)",
                            borderColor: "var(--primary)",
                          },
                        },
                      },
                    }}
                  />
                </TableCell>

                {/* SELL PRICE */}
                <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <TextField
                    value={product.price || 0}
                    onChange={(e) => updateProductState(product._id, { price: e.target.value })}
                    size="small"
                    type="number"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        "& input": {
                          py: 0.6,
                          px: 1,
                          borderRadius: "8px",
                          bgcolor: "var(--glass-bg)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--foreground)",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "var(--glass-bg)",
                            borderColor: "var(--primary)",
                          },
                          "&:focus": {
                            bgcolor: "var(--glass-bg)",
                            boxShadow: "0 0 0 2px var(--primary)",
                            borderColor: "var(--primary)",
                          },
                        },
                      },
                    }}
                  />
                </TableCell>

                {/* BARCODE */}
                <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <TextField
                    value={product.barcode || ""}
                    onChange={(e) => updateProductState(product._id, { barcode: e.target.value })}
                    size="small"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        "& input": {
                          py: 0.6,
                          px: 1,
                          borderRadius: "8px",
                          bgcolor: "var(--glass-bg)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--foreground)",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "var(--glass-bg)",
                            borderColor: "var(--primary)",
                          },
                          "&:focus": {
                            bgcolor: "var(--glass-bg)",
                            boxShadow: "0 0 0 2px var(--primary)",
                            borderColor: "var(--primary)",
                          },
                        },
                      },
                    }}
                  />
                </TableCell>

                {/* DETAILS */}
                <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <TextField
                    value={product.details || ""}
                    onChange={(e) => updateProductState(product._id, { details: e.target.value })}
                    size="small"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        "& input": {
                          py: 0.6,
                          px: 1,
                          borderRadius: "8px",
                          bgcolor: "var(--glass-bg)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--foreground)",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "var(--glass-bg)",
                            borderColor: "var(--primary)",
                          },
                          "&:focus": {
                            bgcolor: "var(--glass-bg)",
                            boxShadow: "0 0 0 2px var(--primary)",
                            borderColor: "var(--primary)",
                          },
                        },
                      },
                    }}
                  />
                </TableCell>

                {/* EXPIRY DATE */}
                <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <TextField
                    value={product.expiryDate || ""}
                    onChange={(e) => updateProductState(product._id, { expiryDate: e.target.value })}
                    size="small"
                    type="date"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        "& input": {
                          py: 0.6,
                          px: 1,
                          borderRadius: "8px",
                          bgcolor: "var(--glass-bg)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--foreground)",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "var(--glass-bg)",
                            borderColor: "var(--primary)",
                          },
                          "&:focus": {
                            bgcolor: "var(--glass-bg)",
                            boxShadow: "0 0 0 2px var(--primary)",
                            borderColor: "var(--primary)",
                          },
                        },
                      },
                    }}
                  />
                </TableCell>

                {/* ACTIONS */}
                <TableCell align="center">
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75 }}>
                    <Tooltip title="حفظ التغييرات" arrow>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleSave(product)}
                        sx={{
                          width: 36,
                          height: 28,
                          borderRadius: "10px",
                          p: 0,
                          bgcolor: "success.main",
                          "&:hover": {
                            bgcolor: "success.dark",
                            transform: "scale(1.08)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        <CheckIcon sx={{ fontSize: 18 }} />
                      </Button>
                    </Tooltip>

                    <Tooltip title="حذف المنتج" arrow>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => setDeleteId(product._id)}
                        sx={{
                          width: 36,
                          height: 28,
                          borderRadius: "10px",
                          p: 0,
                          "&:hover": {
                            bgcolor: "error.lighter",
                            borderColor: "error.dark",
                            transform: "scale(1.08)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </Button>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        PaperProps={{
          sx: {
            borderRadius: "20px",
            p: { xs: 2, md: 3 },
            minWidth: { xs: "90%", md: 400 },
            maxWidth: "95%",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            bgcolor: "rgba(255, 255, 255, 0.95)",
          },
        }}
        TransitionComponent={Zoom}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: "#1a3a32",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            p: 0,
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <WarningAmberIcon sx={{ color: "#ff9800", fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.35rem" }}>
              تأكيد الحذف
            </Typography>
          </Box>
          <IconButton
            onClick={() => setDeleteId(null)}
            sx={{
              width: 36,
              height: 36,
              bgcolor: "rgba(0,0,0,0.04)",
              "&:hover": {
                bgcolor: "rgba(0,0,0,0.08)",
                transform: "rotate(90deg)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, mb: 2 }}>
          <Typography variant="body1" color="#4a5568" sx={{ lineHeight: 1.6 }}>
            هل أنت متأكد من حذف هذا المنتج؟<br />
            <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}>
              لا يمكن التراجع عن هذا الإجراء
            </Box>
            {" "}بعد التأكيد.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 0, justifyContent: "center", gap: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            startIcon={<DeleteForeverIcon />}
            sx={{
              borderRadius: "14px",
              fontWeight: 800,
              px: { xs: 2.5, md: 4 },
              py: 1.1,
              fontSize: "1.05rem",
            }}
          >
            حذف نهائي
          </Button>

          <Button
            variant="outlined"
            onClick={() => setDeleteId(null)}
            sx={{
              borderRadius: "14px",
              fontWeight: 700,
              px: { xs: 2.5, md: 4 },
              py: 1.1,
              borderColor: "var(--primary)",
              color: "var(--primary)",
            }}
          >
            إلغاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hidden components */}
      <CreateProductForm openModal={openModal} setOpenModal={setOpenModal} />
      <BarcodeScanner
        onScan={(scannedBarcode) => {
          if (focusedProductId) {
            updateProductState(focusedProductId, { barcode: scannedBarcode });
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
