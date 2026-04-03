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
exports.archiveMenuPlan = exports.publishMenuPlan = exports.updateMenuPlan = exports.getMenuPlanByDate = exports.getMenuPlanById = exports.getMenuPlans = exports.createMenuPlan = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const menuService = __importStar(require("./menu-plan.service"));
exports.createMenuPlan = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 201, success: true, message: 'Menu drafted', data: await menuService.createMenuPlan(req.messId, req.body, req.user.userId) });
});
exports.getMenuPlans = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Menus read', data: await menuService.getMenuPlans(req.messId) });
});
exports.getMenuPlanById = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Menu found', data: await menuService.getMenuPlanById(req.messId, String(req.params.planId)) });
});
exports.getMenuPlanByDate = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Menu found via date', data: await menuService.getMenuPlanByDate(req.messId, String(req.params.date)) });
});
exports.updateMenuPlan = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Menu updated', data: await menuService.updateMenuPlan(req.messId, String(req.params.planId), req.body) });
});
exports.publishMenuPlan = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Menu published', data: await menuService.publishMenuPlan(req.messId, String(req.params.planId)) });
});
exports.archiveMenuPlan = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Menu archived', data: await menuService.archiveMenuPlan(req.messId, String(req.params.planId)) });
});
