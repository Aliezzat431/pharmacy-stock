"use client";
import React, { useState } from "react";
import axios from "axios";
import { Modal,Box } from "@mui/material";
import BarcodeScanner from "./BarcodeScanner";

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
  "فوار":["كيس","علبة"]
};

const CreateProductForm = ({openModal,setOpenModal}) => {
  const [form, setForm] = useState({
    name: "",
    type: "",
    unit: "",
    purchasePrice: "",
    salePrice: "",
    quantity: "",
    unitsPerLargeUnit: "",
    barcode: "",
    expiryDate: "",
  });

  const [productList, setProductList] = useState([]);
const [editingIndex, setEditingIndex] = useState(null);
const [editingProduct, setEditingProduct] = useState(null);

const handleBarcodeScan = (scanned) => {
  setForm((prev) => ({ ...prev, barcode: scanned }));
};


  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "type") {
      const units = typesWithUnits[value] || [];
      setForm((prev) => ({
        ...prev,
        type: value,
        unit: units[units.length - 1] || "",
        unitsPerLargeUnit: "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const hasSmallAndBigUnit =
    form.type && typesWithUnits[form.type]?.length === 2;

  const handleAddToList = () => {
    const validUnits = typesWithUnits[form.type] || [];
    const hasTwoUnits = validUnits.length === 2;

    if (
      !form.name ||
      !form.type ||
      !form.unit ||
      !form.barcode ||
      !form.purchasePrice ||
      !form.salePrice ||
      !form.quantity
    ) {
      alert("يرجى تعبئة كل الحقول المطلوبة");
      return;
    }

    const newProduct = {
      name: form.name,
      type: form.type,
      unit: form.unit,
      purchasePrice: parseFloat(form.purchasePrice),
      salePrice: parseFloat(form.salePrice),
      quantity: parseFloat(form.quantity),
      barcode: form.barcode,
      expiryDate: form.expiryDate || null,
      unitConversion: hasTwoUnits
        ? parseInt(form.unitsPerLargeUnit)
        : null,
      isBaseUnit: !hasTwoUnits || form.unit === validUnits[0],
    };

    setProductList([...productList, newProduct]);

    setForm({
      name: "",
      type: "",
      unit: "",
      purchasePrice: "",
      salePrice: "",
      quantity: "",
      unitsPerLargeUnit: "",
      barcode: "",
      expiryDate: "",
    });
  };

const handleProductEditChange = (e) => {
  const { name, value } = e.target;
  setEditingProduct((prev) => ({ ...prev, [name]: value }));
};


const saveEditedProduct = () => {
  if (editingIndex !== null) {
    const updatedList = [...productList];
    updatedList[editingIndex] = {
      ...editingProduct,
      purchasePrice: parseFloat(editingProduct.purchasePrice),
      salePrice: parseFloat(editingProduct.salePrice),
      quantity: parseFloat(editingProduct.quantity),
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

    // إرسال كل المنتجات في طلب واحد
    await axios.post(
      "/api/products", // تأكد أن هذا المسار يقبل أكثر من منتج
     productList , // إرسال كائن يحتوي على المصفوفة
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    alert("تمت إضافة جميع المنتجات بنجاح");
    setProductList([]);
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
      bgcolor: "white",
      p: 2,
      borderRadius: 2,
      boxShadow: 24,
      overflow: "hidden", // منع التمرير العام
      display: "flex", // توزيع أفقي
      gap: 2,
    }}
  >
      <BarcodeScanner onScan={handleBarcodeScan} />

    {/* القائمة على اليسار */}
    <div className="w-1/2 overflow-y-auto pr-2 border-r">
      <h2 className="text-lg font-bold mb-2">قائمة المنتجات</h2>
      {productList.length > 0 ? (
        <>
        <div className="border rounded overflow-auto max-h-[80vh]">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2">الاسم</th>
                <th className="p-2">النوع</th>
                <th className="p-2">الوحدة</th>
                <th className="p-2">الكمية</th>
                <th className="p-2">سعر البيع</th>
                <th className="p-2">حذف</th>
              </tr>
            </thead>
<tbody>
  {productList.map((p, idx) => (
    <tr
      key={idx}
      className="border-t cursor-pointer hover:bg-gray-50"
      onClick={() => {
        setEditingIndex(idx);
        setEditingProduct({ ...p });
      }}
    >
      <td className="p-2">
        {editingIndex === idx ? (
          <input
            name="name"
            value={editingProduct.name}
            onChange={handleProductEditChange}
            onBlur={saveEditedProduct}
            className="w-full border rounded p-1"
          />
        ) : (
          p.name
        )}
      </td>

      <td className="p-2">
        {editingIndex === idx ? (
          <select
            name="type"
            value={editingProduct.type}
            onChange={handleProductEditChange}
            onBlur={saveEditedProduct}
            className="w-full border rounded p-1"
          >
            {Object.keys(typesWithUnits).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        ) : (
          p.type
        )}
      </td>

      <td className="p-2">
        {editingIndex === idx ? (
          <select
            name="unit"
            value={editingProduct.unit}
            onChange={handleProductEditChange}
            onBlur={saveEditedProduct}
            className="w-full border rounded p-1"
          >
            {(typesWithUnits[editingProduct.type] || []).map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        ) : (
          p.unit
        )}
      </td>

      <td className="p-2">
        {editingIndex === idx ? (
          <input
            type="number"
            name="quantity"
            value={editingProduct.quantity}
            onChange={handleProductEditChange}
            onBlur={saveEditedProduct}
            className="w-full border rounded p-1"
          />
        ) : (
          p.quantity
        )}
      </td>

      <td className="p-2">
        {editingIndex === idx ? (
          <input
            type="number"
            name="salePrice"
            value={editingProduct.salePrice}
            onChange={handleProductEditChange}
            onBlur={saveEditedProduct}
            className="w-full border rounded p-1"
          />
        ) : (
          p.salePrice
        )}
      </td>

      <td className="p-2 text-center">
        <button
          onClick={(e) => {
            e.stopPropagation(); // منع تفعيل التعديل عند الضغط على الحذف
            handleDelete(idx);
          }}
          className="text-red-600"
        >
          حذف
        </button>
      </td>
    </tr>
  ))}
</tbody>

          </table>
     
    
        </div>
  <button
      onClick={handleSubmit}
        className="bg-green-600 text-white p-2 rounded w-full"
      >
        حفظ كل المنتجات
      </button>
        </>
      ) : (
        <p className="text-gray-500">لا توجد منتجات بعد.</p>
      )}
    </div>

    {/* الفورم على اليمين */}
    <form
      className="w-1/2 space-y-3 overflow-y-auto px-2"
    >
      <h2 className="text-xl font-bold mb-2">إضافة منتج جديد</h2>

      <input type="text" name="name" placeholder="اسم الدواء" value={form.name} onChange={handleChange} className="w-full p-2 border rounded" required />

      <input type="text" name="barcode" placeholder="الباركود" value={form.barcode} onChange={handleChange} className="w-full p-2 border rounded" required />

      <select name="type" value={form.type} onChange={handleChange} className="w-full p-2 border rounded" required>
        <option value="">اختر النوع</option>
        {Object.keys(typesWithUnits).map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {form.type && (
        <select name="unit" value={form.unit} onChange={handleChange} className="w-full p-2 border rounded" required>
          {(typesWithUnits[form.type] || []).map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      )}

      {hasSmallAndBigUnit && (
        <input
          type="number"
          name="unitsPerLargeUnit"
          placeholder="عدد الوحدات في العلبة"
          value={form.unitsPerLargeUnit}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
      )}

      <input
        type="number"
        name="purchasePrice"
        placeholder="سعر الشراء (لصيدلي)"
        value={form.purchasePrice}
        onChange={handleChange}
        className="w-full p-2 border rounded"
        required
      />

      <input
        type="number"
        name="salePrice"
        placeholder="سعر البيع"
        value={form.salePrice}
        onChange={handleChange}
        className="w-full p-2 border rounded"
        required
      />

      <input
        type="number"
        name="quantity"
        placeholder="الكمية"
        value={form.quantity}
        onChange={handleChange}
        className="w-full p-2 border rounded"
        required
      />

      <input
        type="date"
        name="expiryDate"
        placeholder="تاريخ الانتهاء"
        value={form.expiryDate}
        onChange={handleChange}
        className="w-full p-2 border rounded"
      />

      <button
        type="button"
        onClick={handleAddToList}
        className="bg-blue-500 text-white w-full p-2 rounded"
      >
        إضافة للقائمة
      </button>
    </form>
  </Box>
</Modal>

  );
};

export default CreateProductForm;
