"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiShoppingList = void 0;
const mongoose_1 = require("mongoose");
const aiShoppingSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    menuPlanId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MenuPlan', required: true },
    targetDate: { type: Date, required: true },
    items: [{
            name: { type: String, required: true },
            quantity: { type: String, required: true },
            category: { type: String, required: true }
        }],
    status: { type: String, enum: ['draft', 'approved', 'rejected', 'converted'], default: 'draft' },
    marketScheduleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MarketSchedule' },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});
aiShoppingSchema.index({ messId: 1, menuPlanId: 1 });
exports.AiShoppingList = (0, mongoose_1.model)('AiShoppingList', aiShoppingSchema);
