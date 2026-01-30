"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  FormControl,
  InputLabel,
  InputAdornment,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Fade,
  Stack,
  Tooltip,
  TableContainer,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LanguageIcon from "@mui/icons-material/Language";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BarcodeScanner from "./BarcodeScanner";
import { typesWithUnits } from "../lib/unitOptions";
import { useInternetSearch } from "../hooks/useInternetSearch";
import { useToast } from "./ToastContext";

const CreateProductForm = ({ openModal, setOpenModal }) => {
  const [form, setForm] = useState({
    name: "",
    type: "",
    purchasePrice: "",
    salePrice: "",
    quantity: "",
    barcode: "",
    expiryDate: "",
    unitConversion: "",
    unit: "",
    details: "",
  });

  const [automise, setAutomise] = useState(true);
  const [productList, setProductList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const { showToast } = useToast();

  const { results: webResults, loading: webLoading, searchInternet, clearResults } = useInternetSearch();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/companies", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCompanies(res.data);
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  const handleCreateCompany = async (name) => {
    if (!name.trim()) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/companies",
        { name: name.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanies((prev) => [...prev, res.data]);
      setSelectedCompany(res.data.name);
    } catch (err) {
      console.error("فشل إنشاء الشركة:", err);
    }
  };

  const handleBarcodeScan = (scanned) => {
    setForm((prev) => ({ ...prev, barcode: scanned }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddToList = () => {
    if (!selectedCompany) {
      showToast("يرجى اختيار الشركة المصنعة", "warning");
      return;
    }

    if (
      !form.name.trim() ||
      !form.type.trim() ||
      !form.barcode.trim() ||
      form.purchasePrice === "" ||
      form.salePrice === "" ||
      form.quantity === ""
    ) {
      showToast("يرجى تعبئة كل الحقول المطلوبة", "warning");
      return;
    }

    if (
      isNaN(Number(form.purchasePrice)) ||
      isNaN(Number(form.salePrice)) ||
      isNaN(Number(form.quantity))
    ) {
      showToast("الأسعار والكمية يجب أن تكون أرقام صحيحة", "warning");
      return;
    }

    const newProduct = {
      ...form,
      name: form.name.trim(),
      purchasePrice: parseFloat(form.purchasePrice),
      salePrice: parseFloat(form.salePrice),
      quantity: parseFloat(form.quantity),
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      unitConversion: (typesWithUnits[form.type] || []).length > 1 ? parseFloat(form.unitConversion) : null,
      company: selectedCompany,
    };

    setProductList((prev) => [...prev, newProduct]);
    setForm({
      name: "",
      type: "",
      purchasePrice: "",
      salePrice: "",
      quantity: "",
      barcode: "",
      expiryDate: "",
      unitConversion: "",
      unit: "",
      details: "",
    });
    clearResults();
  };

  const handleProductEditChange = (e) => {
    const { name, value } = e.target;
    setEditingProduct((prev) => ({ ...prev, [name]: value }));
  };

  const saveEditedProduct = () => {
    if (editingIndex !== null && editingProduct) {
      if (
        !editingProduct.name.trim() ||
        !editingProduct.type.trim() ||
        !editingProduct.unit.trim() ||
        !editingProduct.barcode.trim() ||
        editingProduct.purchasePrice === "" ||
        editingProduct.salePrice === "" ||
        editingProduct.quantity === ""
      ) {
        showToast("يرجى تعبئة كل الحقول المطلوبة في التعديل", "warning");
        return;
      }

      if (
        isNaN(Number(editingProduct.purchasePrice)) ||
        isNaN(Number(editingProduct.salePrice)) ||
        isNaN(Number(editingProduct.quantity))
      ) {
        showToast("الأسعار والكمية يجب أن تكون أرقام صحيحة في التعديل", "warning");
        return;
      }
      if (
        (typesWithUnits[editingProduct.type] || []).length > 1 &&
        (editingProduct.unitConversion === "" || isNaN(Number(editingProduct.unitConversion)) || Number(editingProduct.unitConversion) <= 0)
      ) {
        showToast("يرجى تعبئة حقل تحويل الوحدة بشكل صحيح في التعديل", "warning");
        return;
      }

      const updatedList = [...productList];
      updatedList[editingIndex] = {
        ...editingProduct,
        purchasePrice: parseFloat(editingProduct.purchasePrice),
        salePrice: parseFloat(editingProduct.salePrice),
        quantity: parseFloat(editingProduct.quantity),
        expiryDate: editingProduct.expiryDate ? new Date(editingProduct.expiryDate).toISOString() : null,
        unitConversion: (typesWithUnits[editingProduct.type] || []).length > 1 ? parseFloat(editingProduct.unitConversion) : null,
      };

      setProductList(updatedList);
      setEditingIndex(null);
      setEditingProduct(null);
    }
  };

  const handleDelete = (index) => {
    const updatedList = [...productList];
    updatedList.splice(index, 1);
    setProductList(updatedList);
  };

  const normalizeName = (name) => {
    if (!name) return "";
    let n = name.toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.,]/g, '')
      .replace(/\b(limited|ltd|inc|corporation|corp|co|company|pharmaceuticals|pharma|pharmaceutical|industries|group)\b/gi, '')
      .trim();

    const aliases = {
      'glaxosmithkline': 'gsk',
      'sanofi aventis': 'sanofi',
      'medical union': 'mup',
      'medical union pharmaceuticals': 'mup',
      'amoun pharmaceutical': 'amoun',
      'biovara': 'biovara',
      'global napi': 'global napi',
      'eva': 'eva',
      'pharaohs': 'pharaohs',
      'european egyptian': 'european egyptian',
      'alexandria pharmaceutical': 'alexandria',
      'alexandria pharmaceuticals': 'alexandria',
      'misr pharmaceutical': 'misr',
      'misr pharmaceuticals': 'misr',
      'cid pharmaceutical': 'cid',
      'cid pharmaceuticals': 'cid',
      'arab drug': 'adco',
      'arab drug company': 'adco',
      'memphis pharmaceutical': 'memphis',
      'memphis pharmaceuticals': 'memphis',
      'nile pharmaceutical': 'nile',
      'nile pharmaceuticals': 'nile',
    };

    if (aliases[n]) return aliases[n];

    for (const [full, short] of Object.entries(aliases)) {
      if (n.startsWith(full) || n.includes(full)) return short;
    }

    return n;
  };

  const selectWebResult = async (item) => {
    setForm((prev) => {
      const isValidType = item.type && Object.keys(typesWithUnits).includes(item.type);

      return {
        ...prev,
        name: item.name,
        type: automise && isValidType ? item.type : prev.type,
        details: automise ? (item.details || "") : prev.details,
        unitConversion: "",
        purchasePrice: item.purchasePrice || prev.purchasePrice,
        salePrice: item.salePrice || prev.salePrice,
      };
    });

    if (item.company && automise) {
      const normalizedTarget = normalizeName(item.company);
      const existing = companies.find(c => normalizeName(c.name) === normalizedTarget);

      if (existing) {
        setSelectedCompany(existing.name);
      } else {
        await handleCreateCompany(item.company);
      }
    } else if (item.company) {
      const normalizedTarget = normalizeName(item.company);
      const existing = companies.find(c => normalizeName(c.name) === normalizedTarget);
      if (existing) setSelectedCompany(existing.name);
    }

    clearResults();
  };

  const handleSubmit = async () => {
    if (productList.length === 0) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/products", productList, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("تمت إضافة المنتجات بنجاح ✅", "success");
      setProductList([]);
      setOpenModal(false);
    } catch (error) {
      console.error("فشل في الإضافة:", error);
    }
  };

  return (
 <Modal open={openModal} onClose={() => setOpenModal(false)} closeAfterTransition>
  <Fade in={openModal}>
    <Box
      className="glass-card"
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "95vw",
        maxWidth: 1200,
        height: "90vh",
        bgcolor: "var(--glass-bg)",
        p: 3,
        borderRadius: 4,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 3,
        overflow: "hidden",
        border: "1px solid var(--glass-border)",
      }}
    >

      {/* Close Button */}
      <IconButton
        onClick={() => setOpenModal(false)}
        sx={{
          position: "absolute",
          right: 16,
          top: 16,
          zIndex: 10,
          bgcolor: "rgba(0,0,0,0.05)",
          "&:hover": { bgcolor: "rgba(0,0,0,0.1)" },
        }}
      >
        <CloseIcon />
      </IconButton>

      {/* Left Column */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
        <Box sx={{ height: 180, borderRadius: 3, overflow: "hidden", border: "2px dashed var(--primary)" }}>
          <BarcodeScanner onScan={handleBarcodeScan} />
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--primary)", mt: 1 }}>
          📋 المنتجات المضافة ({productList.length})
        </Typography>

        <TableContainer
          component={Paper}
          className="glass-card"
          sx={{
            flexGrow: 1,
            overflow: "auto",
            bgcolor: "transparent",
            border: "1px solid var(--glass-border)",
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نوع الوحدة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الكمية</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>السعر</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التحويل</TableCell>
                <TableCell align="center">الإجراء</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {productList.map((p, idx) => (
                <TableRow key={idx} hover sx={{ "& td": { borderBottom: "1px solid var(--glass-border)" } }}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell>{p.salePrice}</TableCell>
                  <TableCell>{p.unitConversion ? `${p.unitConversion} لكل علبة` : "-"}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => setProductList(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {productList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    لا توجد منتجات حالياً. أضف منتجات من النموذج على اليمين.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={productList.length === 0}
          sx={{
            py: 1.5,
            borderRadius: 3,
            bgcolor: "var(--primary)",
            "&:hover": { bgcolor: "var(--primary-hover)" },
            fontWeight: 700,
            fontSize: "1.1rem",
          }}
        >
          حفظ الكل والمتابعة
        </Button>
      </Box>

      {/* Right Column */}
      <Box
        sx={{
          flex: 1.2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
          pr: 1,
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "var(--primary)", borderRadius: 3 },
        }}
      >

        {/* Header: Title + Checkbox */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            mb: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--primary)" }}>
            ✨ تفاصيل الدواء الجديد
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={automise}
                  onChange={(e) => setAutomise(e.target.checked)}
                  sx={{
                    "& .MuiSvgIcon-root": { fontSize: 20 },
                    color: "var(--primary)",
                    "&.Mui-checked": { color: "var(--primary)" },
                  }}
                />
              }
              label={<Typography sx={{ fontWeight: 700, fontSize: 14 }}>إكمال تلقائي</Typography>}
              sx={{ mr: 0 }}
            />
          </Box>
        </Box>

        {/* Name + Internet Search */}
        <Box sx={{ position: "relative" }}>
          <TextField
            fullWidth
            label="اسم الدواء (إنجليزي أو عربي)"
            name="name"
            value={form.name}
            onChange={handleChange}
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="بحث على الإنترنت">
                    <span>
                      <IconButton
                        onClick={() => searchInternet(form.name, form.type)}
                        disabled={webLoading || form.name.length < 2}
                        color="primary"
                      >
                        {webLoading ? <CircularProgress size={20} /> : <LanguageIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />

          {webResults.length > 0 && (
            <Paper
              className="glass-card"
              sx={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 100,
                mt: 1,
                maxHeight: 250,
                overflowY: "auto",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                border: "1px solid var(--primary)",
              }}
            >
              <List size="small">
                <Typography
                  variant="caption"
                  sx={{ px: 2, py: 1, display: "block", color: "var(--primary)", fontWeight: 700 }}
                >
                  نتائج مقترحة {automise ? "(تلقائي)" : ""} 🌐
                </Typography>
                <Divider />
                {webResults.map((item, i) => (
                  <ListItem key={i} button onClick={() => selectWebResult(item)}>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.company || "شركة غير معروفة"} - ${item.type || "أقراص"}`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        {/* Barcode + Type */}
        <Stack direction="row" gap={2}>
          <TextField
            fullWidth
            label="الباركود"
            name="barcode"
            value={form.barcode}
            onChange={handleChange}
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel>النوع</InputLabel>
            <Select name="type" value={form.type} onChange={handleChange} label="النوع">
              {Object.keys(typesWithUnits).map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Details */}
        <TextField
          fullWidth
          multiline
          rows={2}
          label="تفاصيل إضافية"
          name="details"
          value={form.details}
          onChange={handleChange}
          size="small"
          placeholder="مثال: الاستخدام، الجرعة، أو ملاحظات إضافية..."
        />

        {/* Prices */}
        <Stack direction="row" gap={2}>
          <TextField
            fullWidth
            label="سعر الشراء"
            name="purchasePrice"
            type="number"
            value={form.purchasePrice}
            onChange={handleChange}
            size="small"
          />
          <TextField
            fullWidth
            label="سعر البيع"
            name="salePrice"
            type="number"
            value={form.salePrice}
            onChange={handleChange}
            size="small"
          />
        </Stack>

        {/* Quantity + Expiry */}
        <Stack direction="row" gap={2}>
          <TextField
            fullWidth
            label="الكمية"
            name="quantity"
            type="number"
            value={form.quantity}
            onChange={handleChange}
            size="small"
          />
          <TextField
            fullWidth
            label="تاريخ الانتهاء"
            type="date"
            name="expiryDate"
            value={form.expiryDate}
            onChange={handleChange}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        {/* Unit Conversion */}
        {form.type && (typesWithUnits[form.type] || []).length > 1 && (
          <TextField
            fullWidth
            label={`كم ${typesWithUnits[form.type]?.[0]} في الـ ${typesWithUnits[form.type]?.[1]}؟ (يرجى التأكد يدوياً)`}
            name="unitConversion"
            type="number"
            value={form.unitConversion}
            onChange={handleChange}
            size="small"
            placeholder="مثال: 20"
            helperText="تحقق من العلبة يدوياً لضمان الدقة"
            FormHelperTextProps={{ sx: { color: "error.main", fontWeight: "bold" } }}
          />
        )}

        {/* Company */}
        <FormControl fullWidth size="small">
          <InputLabel>الشركة المصنعة</InputLabel>
          <Select
            value={selectedCompany}
            label="الشركة المصنعة"
            onChange={(e) => {
              if (e.target.value === "__add_new__") {
                const name = prompt("أدخل اسم الشركة الجديدة:");
                if (name) handleCreateCompany(name);
              } else {
                setSelectedCompany(e.target.value);
              }
            }}
          >
            {companies.map((c) => (
              <MenuItem key={c._id} value={c.name}>
                {c.name}
              </MenuItem>
            ))}
            <MenuItem value="__add_new__" sx={{ color: "var(--primary)", fontWeight: "bold" }}>
              ➕ إضافة شركة جديدة
            </MenuItem>
          </Select>
        </FormControl>

        {/* Add Button */}
        <Button
          onClick={handleAddToList}
          variant="outlined"
          fullWidth
          startIcon={<AddIcon />}
          sx={{
            mt: 1,
            py: 1.5,
            borderRadius: 3,
            borderWidth: 2,
            fontWeight: 700,
            "&:hover": { borderWidth: 2 },
          }}
        >
          إضافة إلى القائمة المؤقتة
        </Button>
      </Box>
    </Box>
  </Fade>
</Modal>


  );
};

export default CreateProductForm;
