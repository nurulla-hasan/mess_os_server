"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MealOffRequest = void 0;
const mongoose_1 = require("mongoose");
const mealOffRequestSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    messMemberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MessMember', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reason: { type: String },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' } // Audit constraint
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });
exports.MealOffRequest = (0, mongoose_1.model)('MealOffRequest', mealOffRequestSchema);
