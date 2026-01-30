"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Snackbar,
  Alert,
} from "@mui/material";
import axios from "axios";
import DebtModal from "./components/debtModal";
import ProductsTable from "./components/productsTable";
import BarcodeScanner from "./components/BarcodeScanner";
import ProductSelectDialog from "./components/productSelectDialog";
import { useProducts } from "./hooks/useProducts";
import { useCheckout } from "./hooks/useCheckout";
import CustomDialog from "./components/common/CustomDialog";

const CheckoutPage = () => {
  const { products, setProducts, decreaseStock, restoreStock } = useProducts();
  const { items, setItems, addItem, removeItem, clearCart } = useCheckout();

  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.total ?? item.price * item.quantity), 0);
  }, [items]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [pharmacyInfo, setPharmacyInfo] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempUnit, setTempUnit] = useState("علبة");
  const [tempExpiry, setTempExpiry] = useState("");
  const [variants, setVariants] = useState([]);
  const [tempSelections, setTempSelections] = useState({});

  const [showDebt, setShowDebt] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [barcodeNotFound, setBarcodeNotFound] = useState(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("تمت عملية البيع بنجاح ✅");

  const [showConfirm, setShowConfirm] = useState(false);
  const [isPendingSadaqah, setIsPendingSadaqah] = useState(false);
  const [settingsOptions, setSettingsOptions] = useState({ showCheckoutConfirm: true });

  useEffect(() => {
    const info = localStorage.getItem("pharmacy-info");
    if (info) setPharmacyInfo(JSON.parse(info));

    const options = localStorage.getItem("settings-options");
    if (options) setSettingsOptions(JSON.parse(options));
  }, []);

  const resetSelection = () => {
    setSelectedProduct(null);
    setTempQuantity(1);
    setTempUnit("علبة");
    setTempExpiry("");
    setVariants([]);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;

    const price =
      tempUnit !== selectedProduct.unit && selectedProduct.unitConversion > 0
        ? selectedProduct.price / selectedProduct.unitConversion
        : selectedProduct.price;

    const qty = Number(tempQuantity);
    const conversion = Number(selectedProduct.unitConversion || 1);
    const soldInBoxes = tempUnit === "شريط" ? qty / conversion : qty;

    const originalQty = Number(selectedProduct.quantity || 0);
    const remaining = Math.max(0, originalQty - soldInBoxes);

    const newItem = {
      name: selectedProduct.name,
      _id: selectedProduct._id,
      price,
      quantity: qty,
      unit: tempUnit,
      total: price * qty,
      expiry: tempExpiry ? new Date(tempExpiry).toISOString() : null,
      unitOptions: selectedProduct.unitOptions || [selectedProduct.unit],
      fullProduct: selectedProduct,
      remaining,
    };

    addItem(newItem);
    decreaseStock(selectedProduct, soldInBoxes);

    resetSelection();
    setShowSearch(false);
  };

  const handleScan = useCallback((scanned) => {
    const matchingVariants = products.filter(
      (p) => p.barcode?.toString() === scanned
    );

    if (matchingVariants.length === 0) {
      setBarcodeNotFound(scanned);
      return;
    }

    const earliest = [...matchingVariants].sort((a, b) => {
      const dateA = a.expiryDate ? new Date(a.expiryDate) : new Date(8640000000000000);
      const dateB = b.expiryDate ? new Date(b.expiryDate) : new Date(8640000000000000);
      return dateA - dateB;
    })[0];

    const tempUnit = earliest.unitOptions?.[0] || earliest.unit || "علبة";
    const tempQuantity = 1;
    const price =
      tempUnit !== earliest.unit && earliest.unitConversion > 0
        ? earliest.price / earliest.unitConversion
        : earliest.price;

    const qty = Number(tempQuantity);
    const conversion = Number(earliest.unitConversion || 1);
    const soldInBoxes = tempUnit === "شريط" ? qty / conversion : qty;
    const originalQty = Number(earliest.quantity || 0);
    const remaining = Math.max(0, originalQty - soldInBoxes);

    const newItem = {
      name: earliest.name,
      _id: earliest._id,
      price,
      quantity: qty,
      unit: tempUnit,
      total: price * qty,
      expiry: earliest.expiryDate ? new Date(earliest.expiryDate).toISOString() : null,
      unitOptions: earliest.unitOptions || [earliest.unit],
      fullProduct: earliest,
      remaining,
    };

    addItem(newItem);
    decreaseStock(earliest, soldInBoxes);

  }, [products, addItem, decreaseStock]);

  const handleDeleteItem = (index) => {
    const removedItem = removeItem(index);
    if (removedItem) {
      const { _id, expiry, unit, fullProduct, quantity } = removedItem;
      const unitConversion = Number(fullProduct.unitConversion || 1);
      const productBaseUnit = fullProduct.unit;

      let restoreQty = unit === "شريط" && productBaseUnit !== "شريط"
        ? quantity / unitConversion
        : quantity;

      restoreStock(_id, expiry, unit, restoreQty);
    }
  };

  const handleCheckoutClick = (isSadaqah) => {
    if (settingsOptions.showCheckoutConfirm) {
      setIsPendingSadaqah(isSadaqah);
      setShowConfirm(true);
    } else {
      handleCheckout(isSadaqah);
    }
  };

  const handleCheckout = async (isSadaqah = false) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "/api/checkout",
        { items, isSadaqah },
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true,
        }
      );

      if (response.status !== 201) {
        setErrorMessage(
          response.data?.error ||
          response.data?.message ||
          `فشل الدفع (رمز الحالة: ${response.status}) ❌`
        );
        setShowError(true);
        return;
      }

      setSuccessMessage("تمت عملية البيع بنجاح ✅");
      setShowSuccess(true);
      clearCart();

    } catch (error) {
      console.error("Checkout error:", error);
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "حدث خطأ أثناء الدفع ❌";
      setErrorMessage(message);
      setShowError(true);
    }
  };

  useEffect(() => {
    if (showSearch) {
      setSearchResults(products);

      const grouped = products.reduce((acc, product) => {
        if (!acc[product.name]) acc[product.name] = [];
        acc[product.name].push(product);
        return acc;
      }, {});

      const defaultSelections = {};
      for (const [name, variants] of Object.entries(grouped)) {
        const earliest = [...variants].sort(
          (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
        )[0];
        defaultSelections[name] = {
          unit: earliest.unitOptions?.[0] || earliest.unit || "علبة",
          expiry: earliest.expiryDate || "",
          product: earliest,
        };
      }
      setTempSelections(defaultSelections);
    }
  }, [showSearch, products]);

  useEffect(() => {
    if (variants.length > 0) {
      const earliest = [...variants].sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
      )[0];
      setSelectedProduct(earliest);
      setTempExpiry(earliest.expiryDate);
      setTempUnit(earliest.unitOptions?.[0] || earliest.unit || "علبة");
      setTempQuantity(1);
    }
  }, [variants]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8, flexGrow: 1, overflow: "unset" }}>
      <BarcodeScanner onScan={handleScan} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4, mt: 4 }}>
        <Box>
          <ProductsTable
            items={items}
            setItems={setItems}
            setShowSearch={setShowSearch}
            onDelete={handleDeleteItem}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box className="glass-card" sx={{ p: 4, textAlign: 'center', bgcolor: 'var(--glass-bg)' }}>
            <Typography variant="h6" sx={{ color: 'var(--primary)', mb: 1, fontWeight: 600 }}>
              💰 الإجمالي النهائي
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'var(--secondary)', mb: 3 }}>
              {total.toFixed(2)} <small style={{ fontSize: '1.2rem' }}>جنيه</small>
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                disabled={items.length === 0}
                fullWidth
                sx={{
                  py: 2,
                  fontSize: "1.2rem",
                  borderRadius: "12px",
                  fontWeight: 700,
                  bgcolor: 'var(--primary)',
                  boxShadow: '0 4px 14px 0 rgba(0,137,123,0.39)',
                  transition: "0.3s",
                  "&:hover": { bgcolor: "var(--primary-hover)", transform: "translateY(-2px)" },
                }}
                onClick={() => handleCheckoutClick(false)}
              >
                💵 دفع كاش
              </Button>

              <Button
                variant="contained"
                disabled={items.length === 0}
                fullWidth
                sx={{
                  py: 2,
                  fontSize: "1.2rem",
                  borderRadius: "12px",
                  fontWeight: 700,
                  bgcolor: '#673ab7',
                  boxShadow: '0 4px 14px 0 rgba(103,58,183,0.39)',
                  transition: "0.3s",
                  "&:hover": { bgcolor: "#5e35b1", transform: "translateY(-2px)" },
                }}
                onClick={() => handleCheckoutClick(true)}
              >
                💜 تبرع / صدقة
              </Button>

              <Button
                variant="outlined"
                color="warning"
                disabled={items.length === 0}
                fullWidth
                sx={{
                  py: 2,
                  fontSize: "1.1rem",
                  borderRadius: "12px",
                  fontWeight: 600,
                  borderWidth: '2px',
                  "&:hover": { borderWidth: '2px', transform: "translateY(-2px)" },
                }}
                onClick={() => setShowDebt(true)}
              >
                ➕ إضافة دين
              </Button>

              <Button
                variant="text"
                color="error"
                disabled={items.length === 0}
                onClick={clearCart}
                sx={{ mt: 1, fontWeight: 600 }}
              >
                🗑️ مسح السلة
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <DebtModal
        items={items}
        total={total}
        showDebt={showDebt}
        setShowDebt={setShowDebt}
        onClose={() => setShowDebt(false)}
        onSuccess={(order) => {
          setSuccessMessage("تم الحفظ في الديون بنجاح ✅");
          setShowSuccess(true);
          clearCart();
        }}
        handleReset={clearCart}
      />

      <CustomDialog
        open={Boolean(barcodeNotFound)}
        onClose={() => setBarcodeNotFound(null)}
        title="الباركود غير موجود"
        message={<span>الباركود "<strong>{barcodeNotFound}</strong>" غير موجود في قاعدة البيانات ❌</span>}
        type="error"
      />

      <CustomDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="تأكيد عملية البيع"
        message={`هل أنت متأكد من إتمام عملية البيع بقيمة ${total.toFixed(2)} ج.م؟`}
        type="info"
        onConfirm={() => {
          setShowConfirm(false);
          handleCheckout(isPendingSadaqah);
        }}
      />

      <CustomDialog
        open={showError}
        onClose={() => setShowError(false)}
        title="خطأ"
        message={errorMessage}
        type="error"
      />

      <ProductSelectDialog
        open={showSearch}
        onClose={() => setShowSearch(false)}
        products={products}
        searchResults={searchResults}
        setSearchResults={setSearchResults}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
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
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%', fontWeight: 700, borderRadius: '12px' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CheckoutPage;
