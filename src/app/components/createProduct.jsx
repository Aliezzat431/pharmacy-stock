import React, { useState,useEffect } from "react";
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
} from "@mui/material";
import BarcodeScanner from "./BarcodeScanner";
import { typesWithUnits } from "../lib/unitOptions";

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
  });

  const [productList, setProductList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
const [newCompanyName, setNewCompanyName] = useState("");
const [showNewCompanyInput, setShowNewCompanyInput] = useState(false);
const [addedCompanies, setAddedCompanies] = useState([]);

const handleAddCompany = (companyName) => {
  if (!addedCompanies.includes(companyName)) {
    setAddedCompanies((prev) => [...prev, companyName]);
  }
};


  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("/api/companies"); // adjust path if needed
        setCompanies(res.data);
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      }
    };

    fetchCompanies();
  }, []);

 const handleCreateCompany = async (name) => {
    if (!name.trim()) return alert("يرجى إدخال اسم الشركة");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/companies",
        { name: name.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanies((prev) => [...prev, res.data]);
      handleAddCompany(res.data.name);
    } catch (err) {
      console.error("فشل إنشاء الشركة:", err);
      alert("فشل إنشاء الشركة");
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
      alert("يرجى اختيار الشركة المصنعة");
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
      alert("يرجى تعبئة كل الحقول المطلوبة");
      return;
    }



    if (
      isNaN(Number(form.purchasePrice)) ||
      isNaN(Number(form.salePrice)) ||
      isNaN(Number(form.quantity))
    ) {
      alert("الأسعار والكمية يجب أن تكون أرقام صحيحة");
      return;
    }

    const newProduct = {
      name: form.name.trim(),
      type: form.type.trim(),
      purchasePrice: parseFloat(form.purchasePrice),
      salePrice: parseFloat(form.salePrice),
      quantity: parseFloat(form.quantity),
      barcode: form.barcode.trim(),
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      unitConversion: (typesWithUnits[form.type] || []).length > 1 ? parseFloat(form.unitConversion) : null,
     company: selectedCompany, // ✅ added here

    };

console.log(newProduct);

    setProductList((prev) => [...prev, newProduct]);
    setForm({
      name: "",
      type: "",
      purchasePrice: "",
      salePrice: "",
      quantity: "",
      barcode: "",
      expiryDate: "",
      unitConversion: "", // add this line
    });

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
        alert("يرجى تعبئة كل الحقول المطلوبة في التعديل");
        return;
      }

      if (
        isNaN(Number(editingProduct.purchasePrice)) ||
        isNaN(Number(editingProduct.salePrice)) ||
        isNaN(Number(editingProduct.quantity))
      ) {
        alert("الأسعار والكمية يجب أن تكون أرقام صحيحة في التعديل");
        return;
      }
      if (
        (typesWithUnits[editingProduct.type] || []).length > 1 &&
        (editingProduct.unitConversion === "" || isNaN(Number(editingProduct.unitConversion)) || Number(editingProduct.unitConversion) <= 0)
      ) {
        alert("يرجى تعبئة حقل تحويل الوحدة بشكل صحيح في التعديل");
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

const handleSubmit = async () => {
  if (productList.length === 0) {
    alert("لا يوجد منتجات للإرسال");
    return;
  }

  try {
    const token = localStorage.getItem("token");

    const payload = productList.map((product) => {
      const {
        name,
        type,
        unit,
        quantity,
        barcode,
        unitConversion,
        expiryDate,
        purchasePrice,
        salePrice,
        company, // ✅ Include company from the product
      } = product;

      return {
        name,
        type,
        unit,
        quantity,
        barcode,
        unitConversion,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        purchasePrice,
        salePrice,
        company, // ✅ Ensure it's sent to backend
      };
    });

    await axios.post("/api/products", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    alert("تمت إضافة جميع المنتجات بنجاح");
    setProductList([]);
    setOpenModal(false);
  } catch (error) {
    console.error("فشل في الإضافة:", error);
    alert("حدث خطأ أثناء الإضافة");
  }
};



  return (
<Modal open={openModal} onClose={() => setOpenModal(false)}>
  <Box
    sx={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "90vw",
      height: "90vh",
      bgcolor: "background.paper",
      p: 2,
      borderRadius: 2,
      boxShadow: 24,
      display: "flex",
      flexDirection: "row",
      gap: 2,
    }}
  >
    {/* Barcode Scanner */}
    <BarcodeScanner onScan={handleBarcodeScan} />

    {/* Product List */}
    <Box sx={{ width: "50%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Typography variant="h6" mb={2}>قائمة المنتجات</Typography>

      <Paper sx={{ flexGrow: 1, overflowY: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الوحدة</TableCell>
              <TableCell>الكمية</TableCell>
              <TableCell>السعر</TableCell>
              <TableCell align="center">حذف</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productList.map((p, idx) => (
              <TableRow
                key={idx}
                hover
                onClick={() => {
                  setEditingIndex(idx);
                  setEditingProduct({ ...p });
                }}
              >
                {["name", "type", "unit", "quantity", "salePrice"].map((field) => (
                  <TableCell key={field}>
                    {editingIndex === idx ? (
                      field === "type" || field === "unit" ? (
                        <Select
                          name={field}
                          value={editingProduct[field]}
                          onChange={handleProductEditChange}
                          onBlur={saveEditedProduct}
                          fullWidth
                          variant="standard"
                        >
                          {(field === "type"
                            ? Object.keys(typesWithUnits)
                            : typesWithUnits[editingProduct.type] || []
                          ).map((val) => (
                            <MenuItem key={val} value={val}>{val}</MenuItem>
                          ))}
                        </Select>
                      ) : (
                        <TextField
                          name={field}
                          type={["quantity", "salePrice"].includes(field) ? "number" : "text"}
                          value={editingProduct[field]}
                          onChange={handleProductEditChange}
                          onBlur={saveEditedProduct}
                          fullWidth
                          variant="standard"
                        />
                      )
                    ) : (
                      p[field]
                    )}
                  </TableCell>
                ))}
                <TableCell align="center">
                  <Button
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(idx);
                    }}
                  >
                    حذف
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Button
        onClick={handleSubmit}
        fullWidth
        variant="contained"
        color="success"
        sx={{ mt: 2 }}
      >
        حفظ كل المنتجات
      </Button>
    </Box>

    {/* Product Form */}
    <Box
      component="form"
      onSubmit={(e) => e.preventDefault()}
      sx={{ width: "50%", overflowY: "auto", px: 1 }}
    >
      <Typography variant="h6" mb={2}>إضافة منتج جديد</Typography>

      <TextField
        label="اسم الدواء"
        name="name"
        value={form.name}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
      />

      <TextField
        label="الباركود"
        name="barcode"
        value={form.barcode}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>النوع</InputLabel>
        <Select
          name="type"
          value={form.type}
          onChange={handleChange}
          required
          label="النوع"
        >
          <MenuItem value=""><em>اختر النوع</em></MenuItem>
          {Object.keys(typesWithUnits).map((type) => (
            <MenuItem key={type} value={type}>{type}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>الوحدة</InputLabel>
        <Select
          name="unit"
          value={form.unit}
          disabled
          label="الوحدة"
        >
          <MenuItem value=""><em>اختر الوحدة</em></MenuItem>
          {(typesWithUnits[form.type] || []).map((unit) => (
            <MenuItem key={unit} value={unit}>{unit}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="سعر الشراء"
        name="purchasePrice"
        type="number"
        value={form.purchasePrice}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
      />

      <TextField
        label="سعر البيع"
        name="salePrice"
        type="number"
        value={form.salePrice}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
      />

      <TextField
        label="الكمية"
        name="quantity"
        type="number"
        value={form.quantity}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
      />

      {form.type && (typesWithUnits[form.type] || []).length > 1 && (
        <TextField
          label="عدد الوحدات الصغيرة في الكبيرة"
          name="unitConversion"
          type="number"
          value={form.unitConversion}
          onChange={handleChange}
          fullWidth
          required
          inputProps={{ min: 0.000001 }}
          sx={{ mb: 2 }}
        />
      )}

 <FormControl fullWidth required sx={{ mb: 2 }}>
  <InputLabel>الشركة المصنعة</InputLabel>
  <Select
    value={selectedCompany}
    onChange={(e) => {
      const val = e.target.value;
      if (val === "__add_new__") {
        const newCompany = prompt("أدخل اسم الشركة الجديدة:");
        if (newCompany) handleCreateCompany(newCompany);
      } else {
        setSelectedCompany(val);
        handleAddCompany(val);
      }
    }}
    label="الشركة المصنعة"
  >
    {companies.map((c) => (
      <MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>
    ))}
    <MenuItem value="__add_new__">➕ إضافة شركة جديدة</MenuItem>
  </Select>
</FormControl>


      <TextField
        label="تاريخ الانتهاء"
        type="date"
        name="expiryDate"
        value={form.expiryDate}
        onChange={handleChange}
        fullWidth
        sx={{ mb: 2 }}
        InputLabelProps={{ shrink: true }}
      />

      <Button
        onClick={handleAddToList}
        variant="contained"
        fullWidth
        color="primary"
      >
        إضافة للقائمة
      </Button>
    </Box>
  </Box>
</Modal>

  );
};

export default CreateProductForm;
