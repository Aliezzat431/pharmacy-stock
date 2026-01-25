import mongoose from 'mongoose';

const WinningSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  transactionType: { type: String, enum: ['in', 'suspended', 'out', 'sadaqah'], required: true },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

export const getWinningModel = (conn) =>
  conn.models.Winning || conn.model('Winning', WinningSchema);
