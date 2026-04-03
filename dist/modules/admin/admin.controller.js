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
exports.suspendMess = exports.blockUser = exports.updateUserRole = exports.getStats = exports.getAllMesses = exports.getAllUsers = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const adminService = __importStar(require("./admin.service"));
exports.getAllUsers = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const page = parseInt(String(req.query.page)) || 1;
    const limit = parseInt(String(req.query.limit)) || 20;
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Platform users retrieved', data: await adminService.getAllUsers(page, limit) });
});
exports.getAllMesses = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const page = parseInt(String(req.query.page)) || 1;
    const limit = parseInt(String(req.query.limit)) || 20;
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Platform messes retrieved', data: await adminService.getAllMesses(page, limit) });
});
exports.getStats = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Platform statistics retrieved', data: await adminService.getPlatformStats() });
});
exports.updateUserRole = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'User role escalated/de-escalated', data: await adminService.updateUserRole(String(req.params.userId), req.body.globalRole) });
});
exports.blockUser = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'User explicitly blocked from platform', data: await adminService.blockUser(String(req.params.userId)) });
});
exports.suspendMess = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Mess securely suspended globally', data: await adminService.suspendMess(String(req.params.messId)) });
});
