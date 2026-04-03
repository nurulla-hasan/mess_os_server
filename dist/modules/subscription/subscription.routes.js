"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.messSubscriptionRoutes = exports.globalSubscriptionRoutes = void 0;
const express_1 = require("express");
const authorize_1 = require("../../shared/middlewares/authorize");
const validateRequest_1 = require("../../shared/middlewares/validateRequest");
const ctl = __importStar(require("./subscription.controller"));
const val = __importStar(require("./subscription.validation"));
const roles_1 = require("../../constants/roles");
exports.globalSubscriptionRoutes = (0, express_1.Router)();
exports.globalSubscriptionRoutes.get('/plans', ctl.getAvailablePlans);
exports.messSubscriptionRoutes = (0, express_1.Router)({ mergeParams: true });
exports.messSubscriptionRoutes.get('/current', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), ctl.getCurrentPlan);
exports.messSubscriptionRoutes.get('/history', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), ctl.getHistory);
exports.messSubscriptionRoutes.post('/trial', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), ctl.startTrial);
exports.messSubscriptionRoutes.post('/subscribe', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), (0, validateRequest_1.validateRequest)(val.subscribeSchema), ctl.subscribePlan);
exports.messSubscriptionRoutes.post('/cancel', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), ctl.cancelSubscription);
