import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    pharmacyId: { type: String, required: false },
}, { timestamps: true });

export const getUserModel = (conn) => conn.models.User || conn.model('User', UserSchema);
