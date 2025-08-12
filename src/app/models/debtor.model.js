import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  total: { type: Number, required: true },
  unitOptions: [{ type: String }],
fullProduct: {
    type: Object,
    required: false, // <-- make it optional here
    default: null,
  },
});

const orderSchema = new mongoose.Schema({
  items: [itemSchema],
  total: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const debtorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  orders: [orderSchema],
  partialPayments: { type: Number, default: 0 }, // 👈 أضف هذا السطر
});

const Debtor = mongoose.models.Debtor || mongoose.model("Debtor", debtorSchema);
export default Debtor;
