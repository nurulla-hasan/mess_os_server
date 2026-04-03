"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
const mongoose_1 = require("mongoose");
const paymentSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    messMemberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MessMember', required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    reference: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'canceled'], default: 'pending' },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    receivedDate: { type: Date }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });
exports.Payment = (0, mongoose_1.model)('Payment', paymentSchema);
