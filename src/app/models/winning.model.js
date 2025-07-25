import mongoose from "mongoose";

const winningSchema = new mongoose.Schema({
  amount: Number,
  reason: String, // مثل "شراء بضاعة", "بيع", "سحب", "إضافة رأس مال"
  transactionType: {required:true, type: String, enum: ["in", "suspended", "out"] }, // in=زيادة, out=نقص
  date: { type: Date, default: Date.now },
});

export default mongoose.models.Winning || mongoose.model("Winning", winningSchema);
