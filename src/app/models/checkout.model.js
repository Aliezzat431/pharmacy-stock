import mongoose from "mongoose";

const checkoutSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
  unit: String,
  total: Number,
});

export const CheckoutItem = mongoose.models.CheckoutItem || mongoose.model("CheckoutItem", checkoutSchema);
