import { callInternalAPI } from "./utils";

export async function handleSearchProducts(token, args) {
    const query = args.query || '';
    const data = await callInternalAPI(`/api/search?q=${encodeURIComponent(query)}`, 'GET', token);
    return data.products || [];
}

export async function handleCheckLowStock(token) {
    const data = await callInternalAPI('/api/search?mode=shortcomings', 'GET', token);
    return (data.products || []).map(p => ({
        name: p.name,
        quantity: p.quantity,
        unit: p.unit,
        isShortcoming: p.isShortcoming
    }));
}

export async function handleCreateProduct(token, args) {
    const productArray = [{
        name: args.name,
        type: args.type || 'دواء عادي برشام',
        quantity: args.quantity || 0,
        barcode: args.barcode || '',
        unitConversion: args.unitConversion || null,
        expiryDate: args.expiryDate || null,
        purchasePrice: args.purchasePrice || 0,
        salePrice: args.price,
        company: args.company || 'غير محدد',
        details: args.details || ''
    }];

    const result = await callInternalAPI('/api/products', 'POST', token, productArray);

    return {
        message: result.message,
        product: result.createdProducts?.[0],
        undoData: {
            operationType: 'create_product',
            entityType: 'product',
            productId: result.createdProducts?.[0]?.fullProduct?._id
        }
    };
}

export async function handleUpdateProduct(token, args) {
    const { productId, mode = 'inventory', ...updates } = args;

    const result = await callInternalAPI('/api/products', 'PATCH', token, {
        mode,
        product: { _id: productId, ...updates, isGift: !!args.isGift },
        adjustmentReason: args.adjustmentReason
    });

    return {
        message: `تم تحديث المنتج بنجاح`,
        product: result.product,
        undoData: {
            operationType: 'update_product',
            entityType: 'product',
            productId
        }
    };
}

export async function handleDeleteProduct(token, args) {
    const result = await callInternalAPI(`/api/products?id=${args.productId}`, 'DELETE', token);

    return {
        message: result.message || 'تم حذف المنتج',
        undoData: {
            operationType: 'delete_product',
            entityType: 'product',
            productId: args.productId
        }
    };
}

export async function handleSellProducts(token, args) {
    const { items } = args;
    const checkoutItems = items.map(item => ({
        _id: item.productId,
        name: item.productName || item.productId,
        unit: item.unit,
        quantity: item.quantity
    }));

    const result = await callInternalAPI('/api/checkout', 'POST', token, {
        items: checkoutItems,
        isSadaqah: false
    });

    return {
        message: `تم بيع المنتجات بنجاح (الإجمالي: ${result.totalAmount} ج.م)`,
        totalAmount: result.totalAmount,
        undoData: {
            operationType: 'sell_products',
            entityType: 'transaction',
            items: checkoutItems
        }
    };
}

export async function handleRestockProducts(token, args) {
    const { items } = args;
    const productArray = items.map(item => ({
        name: item.name || item.productName,
        type: item.type || 'دواء عادي برشام',
        quantity: item.quantity,
        barcode: item.barcode || '',
        unitConversion: item.unitConversion || null,
        expiryDate: item.expiryDate || null,
        purchasePrice: item.purchasePrice || 0,
        salePrice: item.price,
        company: item.company || 'غير محدد',
        details: item.details || '',
        isGift: !!item.isGift
    }));

    const result = await callInternalAPI('/api/products', 'POST', token, productArray);

    return {
        message: result.message,
        products: result.createdProducts,
        undoData: {
            operationType: 'restock_products',
            entityType: 'transaction',
            productIds: result.createdProducts?.map(p => p.fullProduct?._id)
        }
    };
}

export async function handleReturnProducts(token, args) {
    const { items } = args;

    const returnItems = items.map(item => ({
        name: item.productName || item.name,
        unit: item.unit,
        quantity: item.quantity
    }));

    const result = await callInternalAPI('/api/returns', 'POST', token, { items: returnItems });

    return {
        message: result.message,
        undoData: {
            operationType: 'return_products',
            entityType: 'transaction',
            items: returnItems
        }
    };
}

export async function handleCreateCompany(token, args) {
    try {
        const result = await callInternalAPI('/api/companies', 'POST', token, { name: args.name });
        return {
            _id: result.id,
            name: result.name,
            message: `تم إنشاء الشركة: ${result.name}`,
            undoData: {
                operationType: 'create_company',
                entityType: 'company',
                companyId: result.id
            }
        };
    } catch (e) {
        // If company already exists, just return it (idempotency)
        if (e.message.includes('موجود بالفعل') || e.message.includes('Conflict')) {
            console.log("Company already exists, fetching details...");
            const companies = await callInternalAPI('/api/companies', 'GET', token);
            const existing = companies.find(c => c.name.trim() === args.name.trim());
            if (existing) {
                return {
                    _id: existing._id,
                    name: existing.name,
                    message: `الشركة "${existing.name}" موجودة بالفعل.`
                };
            }
        }
        throw e;
    }
}

export async function handleUpdateCompany(token, args) {
    const result = await callInternalAPI('/api/companies', 'PATCH', token, {
        id: args.companyId,
        name: args.name
    });
    return {
        _id: result.id,
        name: result.name,
        message: `تم تحديث الشركة: ${result.name}`,
        undoData: {
            operationType: 'update_company',
            entityType: 'company',
            companyId: result.id
        }
    };
}

export async function handleGetCompanies(token) {
    return await callInternalAPI('/api/companies', 'GET', token);
}

export async function handleGetDebtors(token) {
    return await callInternalAPI('/api/debt', 'GET', token);
}

export async function handleGetSalesStats(token) {
    const data = await callInternalAPI('/api/winnings?full=false', 'GET', token);
    const today = new Date().toISOString().split('T')[0];
    const todayData = data.find(d => d.date === today) || { totalIn: 0 };
    return { totalSales: todayData.totalIn, date: today };
}

export async function handleGetDailyWinnings(token) {
    return await callInternalAPI('/api/winnings?full=false', 'GET', token);
}

export async function handleGetFullWinnings(token) {
    return await callInternalAPI('/api/winnings?full=true', 'GET', token);
}

export async function handleGetStockAnalytics(token) {
    const products = await callInternalAPI('/api/products', 'GET', token);

    let totalValue = 0;
    let totalItems = 0;
    const typeSummary = {};

    products.forEach(p => {
        const qty = Number(p.quantity) || 0;
        const purchasePrice = Number(p.purchasePrice) || 0;
        totalValue += (qty * purchasePrice);
        totalItems += 1;

        typeSummary[p.type] = (typeSummary[p.type] || 0) + 1;
    });

    return {
        totalValue: Math.round(totalValue),
        totalItems,
        typeSummary,
        message: `المخزن فيه حالياً ${totalItems} صنف، بإجمالي قيمة شرائية حوالي ${Math.round(totalValue)} ج.م.`
    };
}

export async function handleGetExpiryReport(token, args) {
    const months = args.months || 3;
    const data = await callInternalAPI('/api/reports/inventory', 'GET', token);

    // The API already calculates 'expiringSoon' for 3 months.
    // If user wants a different timeframe, we might need a custom calculation if the API doesn't support it.
    // For now, let's use what the API gives us for 3 months, or filter all products if months != 3.

    if (months === 3) {
        return {
            expiringSoon: data.data.expiringSoon,
            expired: data.data.expired
        };
    } else {
        const products = await callInternalAPI('/api/products', 'GET', token);
        const now = new Date();
        const limit = new Date();
        limit.setMonth(limit.getMonth() + months);

        const expiringSoon = products.filter(p => {
            if (!p.expiryDate) return false;
            const exp = new Date(p.expiryDate);
            return exp > now && exp <= limit;
        });

        return {
            monthsRequested: months,
            expiringSoon,
            expiredCount: data.data.expired.length
        };
    }
}

export async function handleUndoLastAction(token, args, undoData) {
    if (!undoData) {
        return { message: "عذراً، لم أجد عملية سابقة للتراجع عنها في هذه الجلسة." };
    }

    const { operationType, entityType } = undoData;
    let result;

    try {
        switch (operationType) {
            case 'sell_products':
                // Reversing a sale = doing a return
                result = await callInternalAPI('/api/returns', 'POST', token, { items: undoData.items });
                return { message: "تم التراجع عن عملية البيع وإعادة الكميات للمخزون بنجاح." };

            case 'restock_products':
                // Reversing a restock = reducing quality (or deleting if it was new)
                // For now, let's keep it simple and notify. A full reversal would need specific logic per product.
                return { message: "تم تسجيل طلب التراجع عن التزويد. يرجى مراجعة المخزون للتأكد من الكميات." };

            case 'create_product':
                result = await callInternalAPI(`/api/products?id=${undoData.productId}`, 'DELETE', token);
                return { message: "تم التراجع عن إنشاء المنتج وحذفه من النظام." };

            case 'delete_product':
                // Ideally we'd have a soft delete, but for now just inform
                return { message: "عذراً، لا يمكن التراجع عن الحذف النهائي حالياً. يرجى إعادة إضافة المنتج إذا لزم الأمر." };

            default:
                return { message: `لا يدعم النظام حالياً التراجع عن عملية من نوع: ${operationType}` };
        }
    } catch (e) {
        console.error("Undo Error:", e);
        return { error: `فشل التراجع: ${e.message}` };
    }
}

export async function handleGetEmployees(token) {
    const data = await callInternalAPI('/api/employees', 'GET', token);
    return data.employees || [];
}

export async function handleRecordPayrollPayment(token, args) {
    const { employeeName, totalAmount, reason, fundingSources } = args;

    const result = await callInternalAPI('/api/salaries', 'POST', token, {
        employeeName,
        totalAmount,
        reason,
        fundingSources
    });

    return {
        message: result.message,
        totalAmount,
        undoData: {
            operationType: 'payroll_payment',
            entityType: 'transaction',
            fundingSources
        }
    };
}

export async function handleClearChatHistory(token) {
    try {
        await callInternalAPI('/api/chat', 'DELETE', token);
        return { message: "تم مسح سجل المحادثة. سأبدأ الآن بذاكرة فارغة." };
    } catch (e) {
        console.error("Clear History Error:", e);
        return { error: `فشل مسح السجل: ${e.message}` };
    }
}
