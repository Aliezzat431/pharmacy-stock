"use client"
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
  Tooltip,
  TableFooter,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";
import dayjs from "dayjs";
import BarcodeScanner from "./components/BarcodeScanner";


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
  "فوار":["كيس","علبة"],
  "agel": ["وحدة"], 


};


const CheckoutPage = () => {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtors, setDebtors] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
const [savedRows, setSavedRows] = useState([]); // indices of saved rows
const [editingExpiryId, setEditingExpiryId] = useState(null);
const [isExpiringSoon,setIsExpiringSoon]=useState(false)


const fetchProducts = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get("/api/checkout", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const rawProducts = res.data.treatments || [];

    const updated = rawProducts.map((product) => {
      let options;

      if (product.type === "agel") {
        options = ["جنيه"]; // optional: represent it with "جنيه" (money unit)
      } else {
        options = typesWithUnits[product.type] || [product.unit];
      }

      return {
        ...product,
        unitOptions: options,
      };
    });

    setProducts(updated);
  } catch (error) {
    console.error(error);
  }
};



  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (showSearch) fetchProducts();
  }, [showSearch]);

  useEffect(() => {
    if (showSearch) setSearchResults(products);
  }, [products]);

  useEffect(() => {
    const fetchDebtors = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/debt", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setDebtors(res.data || []);
      } catch (error) {
        console.error(error);
      }
    };

    if (showDebtModal) {
      fetchDebtors();
    }
  }, [showDebtModal]);

  const calculateUnitPrice = (product, unit) =>
    unit !== product.unit && product.unitConversion > 0
      ? product.price / product.unitConversion
      : product.price;
      const handleAddProduct = (product) => {
  const isAgel = product.name === "عاجل" || product._id === "agel";

  if (isAgel) {
const agelProduct = {
  name: "💰 عاجل",
  _id: "agel",
  price: 1,
  quantity: 1,
  unit: "جنيه",
  total: 1, // 1 * 10000000
  expiryDate: "",
  remaining: "",
  unitOptions: ["جنيه"],
  fullProduct: {
    _id: "agel",
    name: "إيداع مال من منتج غير محدد",
    price: 1,
    unit: "جنيه",
    quantity: 100000,
    type: "agel",
    isShortcoming: false,
    unitConversion: null,
    isBaseUnit: true,
    barcode: "",
    expiryDate: null,
    unitOptions: ["جنيه"]
  }
};


console.log(agelProduct);

setItems((prev) => [...prev, agelProduct]);


    setShowSearch(false);
    return;
  }

  // باقي الكود للمنتجات العادية
  const unit = product.unitOptions?.[0] || product.unit;
  const price = calculateUnitPrice(product, unit);
  const conversion = product.unitConversion || 1;
  const remaining = unit !== product.unit
    ? product.quantity * conversion - 1
    : product.quantity - 1;

  const newItem = {
    name: product.name,
    _id: product._id,
    price,
    quantity: 1,
    unit,
    total: price,
    unitOptions: product.unitOptions || [product.unit],
    fullProduct: product,
    originalQuantity: product.quantity,
    expiryDate: product.expiryDate,
    remaining,
  };

  setItems((prev) => {
    const next = [...prev, newItem];
    setTotal(next.reduce((sum, i) => sum + i.total, 0));
    return next;
  });

  setShowSearch(false);
};


// const handleAddProduct = (product) => {
//   const unit = product.unitOptions?.[0] || product.unit;
//   const price = calculateUnitPrice(product, unit);
//   const conversion = product.unitConversion || 1;
//   const remaining =
//     unit !== product.unit
//       ? product.quantity * conversion - 1
//       : product.quantity - 1;

//   const newItem = {
//     name: product.name,
//     _id: product._id,
//     price,
//     quantity: 1,
//     unit,
//     total: price,
//     unitOptions: product.unitOptions || [product.unit],
//     fullProduct: product,
//     originalQuantity: product.quantity,
//     expiryDate: product.expiryDate,
//     remaining: Math.max(0, remaining),
//     agel: product.agel || false, // ⬅️ Add agel flag
//   };

//   setItems((prev) => {
//     const next = [...prev, newItem];
//     setTotal(next.reduce((sum, i) => sum + i.total, 0));
//     return next;
//   });

//   setShowSearch(false);
// };


const handleFieldChange = (idx, field, value) => {
  setItems((prev) => {
    const next = [...prev];
    const it = next[idx];

    if (field === "quantity") {
      it.quantity = Number(value);
    }

    if (field === "unit") {
      it.unit = value;
      it.price = calculateUnitPrice(it.fullProduct, value);
    }

    it.total = it.quantity * it.price;

    const originalQty = it.fullProduct.quantity || 0;
    const conversion = it.fullProduct.unitConversion || 1;

    const remaining =
      it.unit !== it.fullProduct.unit
        ? originalQty * conversion - it.quantity
        : originalQty - it.quantity;

    it.remaining = Math.max(0, remaining);

    setTotal(next.reduce((sum, i) => sum + i.total, 0));
    return next;
  });
};


  const onSearchChange = (e) => {
    const val = e.target.value.toLowerCase();
    if (val.trim() === "") {
      setSearchResults(products);
    } else {
      setSearchResults(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(val) ||
            (p.barcode && p.barcode.toString().toLowerCase().includes(val))
        )
      );
    }
  };

  const openConfirm = () => setShowConfirmPopup(true);

const doSave = () => {

  const expiredItems = items.filter((item) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(item.expiryDate);
    expiry.setHours(0, 0, 0, 0);

    return expiry <= today;
  });

  if (expiredItems.length > 0) {
    alert("⚠️ يوجد منتجات منتهية الصلاحية، لا يمكن الحفظ.");
    return;
  }

  const token = localStorage.getItem("token");

  axios
    .post(
      "/api/checkout",
      { items },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    )
    .then(() => {
      setItems([]);
      setTotal(0);
      setSuccessMessage("تم حفظ الطلب بنجاح");
      fetchProducts();
      setSavedRows(items.map((_, idx) => idx)); // حدد كل العناصر كمحفوظة

      // إزالة التمييز بعد 3 ثوانٍ
      setTimeout(() => setSavedRows([]), 3000);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => setShowConfirmPopup(false));
};


  const openDebt = () => setShowDebtModal(true);

  const doAddDebt = async () => {
  const expiredItems = items.filter((item) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(item.expiryDate);
    expiry.setHours(0, 0, 0, 0);

    return expiry <= today;
  });

  if (expiredItems.length > 0) {
    alert("⚠️ يوجد منتجات منتهية الصلاحية، لا يمكن إضافة الدين.");
    setShowDebtModal(false)
    return;
  }
    const token = localStorage.getItem("token");

    if (!selectedDebtor || items.length === 0) return;
    const name = selectedDebtor.name || selectedDebtor;

    try {
   const groupedItems = {};

items.forEach((item) => {
  const key = `${item.name}-${item.unit}`;
  if (!groupedItems[key]) {
    groupedItems[key] = { name: item.name, unit: item.unit, quantity: 1 };
  } else {
    groupedItems[key].quantity += 1;
  }
});

const orders = Object.values(groupedItems);

const res = await axios.post(
  "/api/debt",
  { name, orders },
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

      console.log(res.data);
      setItems([]);
      setTotal(0);
      setSuccessMessage("تمت إضافة الدين بنجاح");
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("فشل الإضافة");
    } finally {
      setShowDebtModal(false);
    }
  };

  return (
<Container maxWidth="lg" sx={{ mt: 4 }}>
  <BarcodeScanner
  onScan={(scannedBarcode) => {
    const product = products.find((p) => p.barcode?.toString() === scannedBarcode);
    if (product) {
      const expiry = new Date(product.expiryDate).setHours(0, 0, 0, 0);
      const today = new Date().setHours(0, 0, 0, 0);

 if (product.type !== "agel" && expiry <= today) {
  const proceed = window.confirm("⚠️ هذا المنتج منتهي الصلاحية، هل تريد إضافته على أي حال؟");
  if (!proceed) return;
}


      handleAddProduct(product);
    } else {
      alert("🚫 لم يتم العثور على منتج بهذا الباركود");
    }
  }}
/>
  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
    <Typography variant="h5">الإجمالي: {total} جنيه</Typography>
    <Box>
      <Button variant="contained" color="warning" onClick={openDebt} sx={{ mr: 1 }}>
        مديونية
      </Button>
      <Button variant="contained" color="success" onClick={openConfirm}>
        حفظ
      </Button>
    </Box>
  </Box>

  {/* ✅ رسالة النجاح */}
  <Snackbar open={!!successMessage} autoHideDuration={4000} onClose={() => setSuccessMessage("")}>
    <Alert onClose={() => setSuccessMessage("")} severity="success">
      {successMessage}
    </Alert>
  </Snackbar>

  {/* ✅ جدول العناصر */}
  <TableContainer component={Paper} sx={{ mb: 2 }}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>الاسم</TableCell>
          <TableCell>السعر</TableCell>
          <TableCell>الكمية</TableCell>
          <TableCell>المتبقي</TableCell>
          <TableCell>الوحدة</TableCell>
          <TableCell>تاريخ الإنتهاء</TableCell>
          <TableCell>المجموع</TableCell>
        </TableRow>
      </TableHead>
<TableBody>
  {items.map((it, idx) => {
    const expiry = new Date(it.expiryDate).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    const isExpired = expiry <= today;
    const isShort = it.fullProduct?.isShortcoming;
    const isSaved = savedRows.includes(idx);

    const remaining = (() => {
      const qty = Number(it.quantity || 0);
      const originalQty = Number(it.fullProduct?.quantity || 0);
      const conversion = Number(it.fullProduct?.unitConversion || 1);
      const taken = it.unit === it.fullProduct?.unit ? qty : qty / conversion;
      return Math.max(0, Number((originalQty - taken).toFixed(2)));
    })();

    return (
      <TableRow
        key={idx}
        sx={{
          backgroundColor: isExpired
            ? "#fff3cd"
            : isShort
            ? "#f8d7da"
            : "white",
          animation: isSaved ? "pulse 1s ease-in-out infinite" : "none",
        }}
      >
        <TableCell dir="rtl" sx={{ fontWeight: "bold" }}>

          {it.name}
          {it.agel && (
            <span
              style={{
                backgroundColor: "#ffc107",
                color: "#000",
                padding: "2px 6px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                marginRight: "8px",
              }}
            >
              آجل 💰
            </span>
          )}
        </TableCell>

        <TableCell dir="rtl">{Number(it.price).toLocaleString()} جنيه</TableCell>

        <TableCell>
          <TextField
            type="number"
            size="small"
            inputProps={{ min: 1 }}
            value={it.quantity}
            onChange={(e) => handleFieldChange(idx, "quantity", e.target.value)}
          />
        </TableCell>

        <TableCell>{remaining.toLocaleString()}</TableCell>

        <TableCell>
          <Select
            size="small"
            fullWidth
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

        <TableCell
          style={{
            color: isExpired ? "red" : "inherit",
            fontWeight: isExpired ? "bold" : "normal",
            cursor: "pointer",
            textAlign: "center",
          }}
          onClick={() => setEditingExpiryId(it._id)}
        >
          {editingExpiryId === it._id ? (
            <input
              type="date"
              defaultValue={
                it.expiryDate
                  ? new Date(it.expiryDate).toISOString().split("T")[0]
                  : ""
              }
              onBlur={async (e) => {
                const newDate = e.target.value;
                setEditingExpiryId(null);

                if (!newDate || newDate === it.expiryDate?.split("T")[0]) return;

                try {
                  await axios.patch(
                    "/api/products",
                    {
                      id: it._id,
                      mode: "expiryDate",
                      expiryDate: newDate,
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    }
                  );

                  const updatedProducts = [...products];
                  const prodIdx = updatedProducts.findIndex((p) => p._id === it._id);
                  if (prodIdx !== -1) {
                    updatedProducts[prodIdx].expiryDate = newDate;
                  }
                  setProducts(updatedProducts);

                  const updatedItems = [...items];
                  const itemIdx = updatedItems.findIndex((p) => p._id === it._id);
                  if (itemIdx !== -1) {
                    updatedItems[itemIdx].expiryDate = newDate;
                  }
                  setItems(updatedItems);
                } catch (err) {
                  console.error("فشل تحديث تاريخ الانتهاء", err);
                }
              }}
              autoFocus
            />
          ) : it.expiryDate ? (
            (() => {
              const d = new Date(it.expiryDate);
              return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
            })()
          ) : (
            "_"
          )}
        </TableCell>

        <TableCell dir="rtl">
          {Number(it.total).toLocaleString()} جنيه
        </TableCell>
      </TableRow>
    );
  })}
</TableBody>


      <TableFooter>
  <TableRow>
   <TableCell
  colSpan={7}
  align="center"
  onClick={() => setShowSearch(true)}
  style={{
    cursor: "pointer",
    backgroundColor: "#f5f5f5",
    transition: "background-color 0.3s",
  }}
  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e0e0e0")}
  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
>
  ➕ إضافة منتج
</TableCell>

  </TableRow>
</TableFooter>

    </Table>
  </TableContainer>

  {/* ✅ نافذة البحث عن دواء */}
  <Dialog open={showSearch} onClose={() => setShowSearch(false)} fullWidth maxWidth="md">
    <DialogTitle>
      البحث عن دواء
      <IconButton onClick={() => setShowSearch(false)} sx={{ position: "absolute", left: 8, top: 8 }}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent>
      <TextField fullWidth placeholder="اكتب اسم الدواء..." sx={{ mb: 2 }} onChange={onSearchChange} />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الوحدة</TableCell>
              <TableCell>الكمية</TableCell>
              <TableCell>الباركود</TableCell>
              <TableCell>تاريخ الإنتهاء</TableCell>
              <TableCell>إضافة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {searchResults.map((p) => {
              const expiry = new Date(p.expiryDate).setHours(0, 0, 0, 0);
              const today = new Date().setHours(0, 0, 0, 0);
              const isExpired = expiry <= today;

              return (
                <TableRow key={p._id} hover onClick={() => {
                        if (
  p.type !== "agel" &&
  isExpired &&
  !window.confirm("⚠️ هذا المنتج منتهي الصلاحية، هل تريد إضافته على أي حال؟")
) return;

                           

                          handleAddProduct(p);
                        }}
                         variant={isExpired ? "outlined" : "contained"}
                        color={isExpired ? "error" : "primary"}
                        style={{cursor:"pointer"}}
                        >
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell>{p.barcode || "—"}</TableCell>
                  <TableCell
                    style={{
                      color: isExpired ? "red" : "inherit",
                      fontWeight: isExpired ? "bold" : "normal",
                    }}
                  >
                    {p.expiryDate
                      ? new Date(p.expiryDate).toLocaleDateString("en-GB") // 22/7/2025
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={isExpired ? "هذا المنتج منتهي الصلاحية!" : "إضافة المنتج"} arrow>
                  
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </DialogContent>
  </Dialog>

  {/* ✅ نافذة تأكيد الحفظ */}
  <Dialog open={showConfirmPopup} onClose={() => setShowConfirmPopup(false)}>
    <DialogTitle>هل تريد حفظ الطلب؟</DialogTitle>
    <DialogActions>
      <Button color="success" onClick={doSave}>
        نعم
      </Button>
      <Button onClick={() => setShowConfirmPopup(false)}>لا</Button>
    </DialogActions>
  </Dialog>

  {/* ✅ نافذة المديونية */}
  <Dialog open={showDebtModal} onClose={() => setShowDebtModal(false)}>
    <DialogTitle>إضافة إلى مديونية</DialogTitle>
    <DialogContent>
      <Autocomplete
        fullWidth
        freeSolo
        options={debtors}
        getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
        filterOptions={(options, state) => {
          const filtered = options.filter((opt) =>
            opt.name.toLowerCase().includes(state.inputValue.toLowerCase())
          );

          if (
            state.inputValue &&
            !options.some((opt) => opt.name === state.inputValue)
          ) {
            filtered.unshift({
              name: `➕ إضافة "${state.inputValue}" كمدين جديد`,
              isNew: true,
              rawName: state.inputValue,
            });
          }

          return filtered;
        }}
        onChange={(e, newValue) => {
          if (typeof newValue === "string") setSelectedDebtor(newValue);
          else if (newValue?.isNew) setSelectedDebtor(newValue.rawName);
          else setSelectedDebtor(newValue);
        }}
        renderInput={(params) => <TextField {...params} label="اختر أو أدخل اسم المدين" />}
      />
    </DialogContent>
    <DialogActions>
      <Button variant="contained" disabled={!selectedDebtor} onClick={doAddDebt}>
        إضافة
      </Button>
      <Button onClick={() => setShowDebtModal(false)}>إلغاء</Button>
    </DialogActions>
  </Dialog>
</Container>

  );
};

export default CheckoutPage;