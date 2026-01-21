import { useState, useCallback } from 'react';

export const useCheckout = () => {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);

    const addItem = useCallback((newItem) => {
        setItems((prev) => {
            const next = [...prev, newItem];
            setTotal(next.reduce((sum, i) => sum + i.total, 0));
            return next;
        });
    }, []);

    const removeItem = useCallback((index) => {
        let removedItem = null;
        setItems((prev) => {
            const next = [...prev];
            removedItem = next.splice(index, 1)[0];
            setTotal(next.reduce((sum, i) => sum + i.total, 0));
            return next;
        });
        return removedItem;
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setTotal(0);
    }, []);

    return {
        items,
        setItems, // Expose strict setter if needed, but prefer addItem/removeItem
        total,
        setTotal,
        addItem,
        removeItem,
        clearCart
    };
};
