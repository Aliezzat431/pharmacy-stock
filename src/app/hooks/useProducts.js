import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { typesWithUnits } from '../lib/unitOptions';

export const useProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
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
                    // Ensure quantity is handled per variant effectively in UI if needed, 
                    // though typically quantity is shared. 
                    // usage in original code suggests they treat variants as separate entries in 'products' array
                }));
            });

            setProducts(expanded);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const updateProductStock = useCallback((productId, expiryDate, unit, quantityChange, unitConversion) => {
        setProducts((prev) =>
            prev.map((p) => {
                if (
                    p._id === productId &&
                    p.expiryDate === expiryDate &&
                    p.unit === unit // This check might be too strict if unit changes.
                    // In original code:
                    // p._id === selectedProduct._id && p.expiryDate === selectedProduct.expiryDate && p.unit === selectedProduct.unit 
                    // Wait, 'p' is one of the expanded products.
                ) {
                    // This logic below mimics original handleAddProduct stock update
                    // But wait, the original logic had 'soldInBoxes' calculation inside.
                    // Let's make this more generic: pass the exact amount to subtract in BASE units if possible?
                    // Original code:
                    // const soldInBoxes = tempUnit === "شريط" ? qty / conversion : qty;
                    // const newQty = Math.max(0, p.quantity - soldInBoxes);

                    // We will trust the caller to pass the 'quantity to subtract'
                    return { ...p, quantity: Math.max(0, p.quantity - quantityChange) };
                }
                return p;
            })
        );
    }, []);

    // Specific handler to match original strict logic exactly for now to avoid bugs
    const decreaseStock = useCallback((productToMatch, deductQuantity) => {
        setProducts(prev => prev.map(p => {
            if (p._id === productToMatch._id && p.expiryDate === productToMatch.expiryDate && p.unit === productToMatch.unit) {
                return { ...p, quantity: Math.max(0, p.quantity - deductQuantity) };
            }
            return p;
        }));
    }, []);

    const restoreStock = useCallback((productId, expiry, unit, amountToAdd) => {
        setProducts(prev => prev.map(p => {
            // Logic from original onDelete
            // const isSameProduct = p._id === _id && p.expiryDate === expiry && p.unit === productBaseUnit;
            // Note: The original code restored to originalQty which seemed to just be 'p.quantity' from closure? 
            // Actually line 362: const newQty = originalQty; where originalQty = Number(fullProduct.quantity || 0);
            // Wait, fullProduct was stored in the item.
            // This implies the original code might have been resetting stock to the INITIAL value instead of properly adding back?
            // Line 362: `const newQty = originalQty;`
            // If `fullProduct` is the snapshot at time of adding, then `fullProduct.quantity` is the quantity BEFORE adding.
            // So setting it to `originalQty` effectively cancels the subtraction. 
            // BUT, what if I added 2 items from the same product?
            // If I delete one, I should only add back that one's qty.
            // The original code seems to have a bug or I'm misreading: 
            // `newQty = originalQty` sets it to the snapshot. If multiple items used same product, deleting one resets ALL usage?
            // That sounds like a bug in the original code. 
            // "Restoring quantity | Product: ... | Previous: ... | Returning: ... | Original: ..."

            // I should probably IMPROVE this logic.
            // Just add the returned quantity back to current quantity.

            // However, matching p._id and expiry is safer.
            // Also need to handle base unit matching.

            if (p._id === productId && p.expiryDate === expiry) { // Looser matching to find the product variant
                return { ...p, quantity: p.quantity + amountToAdd };
            }
            return p;
        }));
    }, []);

    return { products, setProducts, loading, error, fetchProducts, decreaseStock, restoreStock };
};
