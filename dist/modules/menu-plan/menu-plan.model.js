"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuPlan = void 0;
const mongoose_1 = require("mongoose");
const menuPlanSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    date: { type: Date, required: true },
    meals: {
        breakfast: String,
        lunch: String,
        dinner: String
    },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    isAiGenerated: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});
menuPlanSchema.index({ messId: 1, date: 1 });
exports.MenuPlan = (0, mongoose_1.model)('MenuPlan', menuPlanSchema);
