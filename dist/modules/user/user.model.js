"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    globalRole: { type: String, enum: ['user', 'super_admin'], default: 'user' },
    verificationOtp: String,
    verificationOtpExpiresAt: Date,
    resetPasswordOtp: String,
    resetPasswordOtpExpiresAt: Date
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.passwordHash; return ret; } }
});
exports.User = (0, mongoose_1.model)('User', userSchema);
