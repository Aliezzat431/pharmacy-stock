"use client";
import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Dialog,
  Paper,
} from "@mui/material";
import axios from "axios";
import DebtModal from "./components/debtModal";
import ProductsTable from "./components/productsTable";
import BarcodeScanner from "./components/BarcodeScanner";
import ProductSelectDialog from "./components/productSelectDialog";
import { typesWithUnits } from "./lib/unitOptions";



const CheckoutPage = () => {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempUnit, setTempUnit] = useState("علبة");
  const [tempExpiry, setTempExpiry] = useState("");
  const [variants, setVariants] = useState([]);
  const [tempSelections, setTempSelections] = useState({});
  const [showDebt, setShowDebt] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(false);
  const [barcodeNotFound, setBarcodeNotFound] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);


  const handleReset = () => {
    setResetTrigger(true);
    setTimeout(() => setResetTrigger(false), 100);
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/checkout", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawProducts = res.data.treatments || [];

      const expanded = rawProducts.flatMap((product) => {
        if (product._id === "agel") {
          return [
            {
              ...product,
              expiryDate: null,
              expiryOptions: [],
              unitOptions: product.unitOptions || [
                { value: "جنيه", label: "جنيه" },
              ],
              _id: "agel",
            },
          ];
        }

        const expiryList = (product.expiryOptions || [product.expiryDate])
          .filter(Boolean)
          .sort((a, b) => new Date(a) - new Date(b));

        return expiryList.map((expiry) => ({
          ...product,
          expiryDate: expiry,
          expiryOptions: expiryList,
          unitOptions: typesWithUnits[product.type] || [product.unit],
          _id: `${product._id}`,
        }));
      });

      setProducts(expanded);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const calculateUnitPrice = (product, unit) =>
    unit !== product.unit && product.unitConversion > 0
      ? product.price / product.unitConversion
      : product.price;

  const handleAddProduct = async () => {
    if (!selectedProduct) return;

    const price = calculateUnitPrice(selectedProduct, tempUnit);
    const qty = Number(tempQuantity);
    const originalQty = Number(selectedProduct.quantity || 0);
    const conversion = Number(selectedProduct.unitConversion || 1);
    const soldInBoxes = tempUnit === "شريط" ? qty / conversion : qty;
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

    setItems((prev) => {
      const next = [...prev, newItem];
      setTotal(next.reduce((sum, i) => sum + i.total, 0));
      return next;
    });

    setProducts((prev) =>
      prev.map((p) => {
        if (
          p._id === selectedProduct._id &&
          p.expiryDate === selectedProduct.expiryDate &&
          p.unit === selectedProduct.unit
        ) {
          const conversion = Number(p.unitConversion || 1);
          const soldInBoxes = tempUnit === "شريط" ? qty / conversion : qty;
          const newQty = Math.max(0, p.quantity - soldInBoxes);
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );

    setSelectedProduct(null);
    setTempQuantity(1);
    setTempUnit("علبة");
    setTempExpiry("");
    setShowSearch(false);
    setVariants([]);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, flexGrow: 1, overflow: "unset" }}>
      <BarcodeScanner
        onScan={(scanned) => {
          console.log(`scanned is ${scanned}`);
          const matchingVariants = products.filter(
            (p) => p.barcode?.toString() === scanned
          );
          if (matchingVariants.length === 0) {
            setBarcodeNotFound(scanned);
            return;
          }

          const earliest = [...matchingVariants].sort((a, b) => {
            const dateA = a.expiryDate
              ? new Date(a.expiryDate)
              : new Date(8640000000000000);
            const dateB = b.expiryDate
              ? new Date(b.expiryDate)
              : new Date(8640000000000000);
            return dateA - dateB;
          })[0];

          const tempUnit = earliest.unitOptions?.[0] || earliest.unit || "علبة";
          const tempQuantity = 1;
          const price =
            tempUnit !== earliest.unit && earliest.unitConversion > 0
              ? earliest.price / earliest.unitConversion
              : earliest.price;

          const qty = Number(tempQuantity);
          const originalQty = Number(earliest.quantity || 0);
          const conversion = Number(earliest.unitConversion || 1);
          const soldInBoxes = tempUnit === "شريط" ? qty / conversion : qty;
          const remaining = Math.max(0, originalQty - soldInBoxes);

          const newItem = {
            name: earliest.name,
            _id: earliest._id,
            price,
            quantity: qty,
            unit: tempUnit,
            total: price * qty,
            expiry: earliest.expiryDate
              ? new Date(earliest.expiryDate).toISOString()
              : null,
            unitOptions: earliest.unitOptions || [earliest.unit],
            fullProduct: earliest,
            remaining,
          };

          setItems((prev) => {
            const next = [...prev, newItem];
            setTotal(next.reduce((sum, i) => sum + i.total, 0));
            return next;
          });
        }}
      />

      <Box display="flex" justifyContent="center" gap={4} mt={4} flexWrap="wrap">
        <Button
          variant="contained"
          color="success"
          disabled={items.length === 0}
          sx={{
            px: 6,
            py: 1.8,
            fontSize: "1.2rem",
            borderRadius: "16px",
            boxShadow: 3,
            transition: "0.3s",
            "&:hover": { bgcolor: "green", transform: "scale(1.05)" },
          }}
         onClick={async () => {
  try {
    const response = await axios.post(
      "/api/checkout",
      { items },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        validateStatus: () => true, // ✅ prevent axios from throwing on non-2xx
      }
    );

    if (response.status !== 201) {
      setCheckoutError(
        response.data?.error ||
        response.data?.message ||
        `فشل الدفع (رمز الحالة: ${response.status}) ❌`
      );
      return;
    }

    handleReset();
  } catch (error) {
    console.error("Checkout error:", error);

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "حدث خطأ أثناء الدفع ❌";

    setCheckoutError(message);
  }
}}

        >
          💵 دفع
        </Button>

        <Button
          variant="outlined"
          color="warning"
          disabled={items.length === 0}
          sx={{
            px: 6,
            py: 1.8,
            fontSize: "1.2rem",
            borderRadius: "16px",
            boxShadow: 3,
            transition: "0.3s",
            "&:hover": { bgcolor: "#f9d976", transform: "scale(1.05)" },
          }}
          onClick={() => setShowDebt(true)}
        >
          ➕ إضافة دين
        </Button>
      </Box>

      <DebtModal
        items={items}
        total={total}
        showDebt={showDebt}
        setShowDebt={setShowDebt}
        handleReset={handleReset}
      />

      <Typography variant="h6" sx={{ mb: 2 }}>
        الإجمالي: {total.toFixed(2)} جنيه
      </Typography>

      <ProductsTable
        items={items}
        setItems={setItems}
        setShowSearch={setShowSearch}
        setTotal={setTotal}
        resetTrigger={resetTrigger}
        onDelete={(index) => {
          setItems((prevItems) => {
            const newItems = [...prevItems];
            const removedItem = newItems.splice(index, 1)[0];
            setTotal(newItems.reduce((sum, i) => sum + i.total, 0));

            if (removedItem) {
              const { _id, expiry, unit, fullProduct, quantity } = removedItem;
              const unitConversion = Number(fullProduct.unitConversion || 1);
              const productBaseUnit = fullProduct.unit;

              setProducts((prevProducts) =>
                prevProducts.map((p) => {
                  const isSameProduct =
                    p._id === _id &&
                    p.expiryDate === expiry &&
                    p.unit === productBaseUnit;

                  if (!isSameProduct) return p;

                  // Convert removed quantity to base unit if needed
                  let restoredQty = unit === "شريط" && unit !== productBaseUnit
                    ? quantity / unitConversion
                    : quantity;

                  const originalQty = Number(fullProduct.quantity || 0);
                  const newQty = originalQty; // Restore to original value

                  console.log(
                    `🔁 Restoring quantity | Product: ${p.name} | Previous (current): ${p.quantity} | Returning: ${restoredQty} | Original: ${originalQty}`
                  );

                  return {
                    ...p,
                    quantity: newQty,
                  };
                })
              );
            }

            return newItems;
          });
        }}

      />

      <Dialog open={Boolean(barcodeNotFound)} onClose={() => setBarcodeNotFound(null)}>
        <Paper
          elevation={4}
          sx={{
            padding: 4,
            borderRadius: 3,
            textAlign: "center",
            backgroundColor: "#fff0f0",
            maxWidth: 400,
            margin: "0 auto",
          }}
        >
          <Typography variant="h5" fontWeight="bold" color="error">
            الباركود غير موجود
          </Typography>
          <Typography sx={{ mt: 2 }} color="error" fontSize="1rem">
            الباركود "<strong>{barcodeNotFound}</strong>" غير موجود في قاعدة البيانات ❌
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Button variant="contained" color="error" onClick={() => setBarcodeNotFound(null)}>
              حسناً
            </Button>
          </Box>
        </Paper>
      </Dialog>


      <Dialog open={Boolean(checkoutError)} onClose={() => setCheckoutError(null)}>
        <Paper
          elevation={4}
          sx={{
            padding: 4,
            borderRadius: 3,
            textAlign: "center",
            backgroundColor: "#fff0f0",
            maxWidth: 400,
            margin: "0 auto",
          }}
        >
          <Typography variant="h5" fontWeight="bold" color="error">
            خطأ في الدفع
          </Typography>
          <Typography sx={{ mt: 2 }} color="error" fontSize="1rem">
            {checkoutError}
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              color="error"
              onClick={() => setCheckoutError(null)}
            >
              حسناً
            </Button>
          </Box>
        </Paper>
      </Dialog>


   <ProductSelectDialog
  open={showSearch}
  onClose={() => setShowSearch(false)}
  products={products}
  setProducts={setProducts}
  searchResults={searchResults}
  setSearchResults={setSearchResults}
  selectedProduct={selectedProduct}
  setSelectedProduct={setSelectedProduct}
  tempSelections={tempSelections}
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

    </Container>
  );
};

export default CheckoutPage;
