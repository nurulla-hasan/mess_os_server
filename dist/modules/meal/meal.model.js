"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Meal = void 0;
const mongoose_1 = require("mongoose");
const mealSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    messMemberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MessMember', required: true },
    date: { type: Date, required: true },
    mealCount: { type: Number, required: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true } // Audit constraint
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });
mealSchema.index({ messId: 1, messMemberId: 1, date: 1 }, { unique: true });
exports.Meal = (0, mongoose_1.model)('Meal', mealSchema);
