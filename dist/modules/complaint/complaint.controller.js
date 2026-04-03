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
exports.rejectComplaint = exports.resolveComplaint = exports.updateStatus = exports.getComplaintById = exports.getMyComplaints = exports.getComplaints = exports.createComplaint = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const compService = __importStar(require("./complaint.service"));
const apiError_1 = require("../../shared/utils/apiError");
exports.createComplaint = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    if (!req.messMember)
        throw new apiError_1.AppError(403, 'Context missing mapping bounds');
    (0, apiResponse_1.sendResponse)(res, { statusCode: 201, success: true, message: 'Complaint registered', data: await compService.createComplaint(req.messId, req.body, req.messMember._id.toString()) });
});
exports.getComplaints = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Complaints fully traversed', data: await compService.getComplaints(req.messId) });
});
exports.getMyComplaints = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    if (!req.messMember)
        throw new apiError_1.AppError(403, 'Mapped user required');
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'My complaints pulled', data: await compService.getMyComplaints(req.messId, req.messMember._id.toString()) });
});
exports.getComplaintById = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    if (!req.messMember)
        throw new apiError_1.AppError(403, 'Context missing mapping bounds');
    const isManager = req.messMember.messRole === 'manager' || req.messRole === 'manager';
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Complaint pulled', data: await compService.getComplaintById(req.messId, String(req.params.complaintId), req.messMember._id.toString(), isManager) });
});
exports.updateStatus = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Status mapped', data: await compService.updateComplaintStatus(req.messId, String(req.params.complaintId), req.body.status) });
});
exports.resolveComplaint = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Complete', data: await compService.resolveComplaint(req.messId, String(req.params.complaintId), req.body.resolvedNote || '', req.user.userId) });
});
exports.rejectComplaint = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Rejected mapping', data: await compService.rejectComplaint(req.messId, String(req.params.complaintId), req.body.resolvedNote || '', req.user.userId) });
});
