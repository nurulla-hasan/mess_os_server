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
exports.completeSchedule = exports.voidSchedule = exports.updateActualSpent = exports.reassignSchedule = exports.updateSchedule = exports.getMyDuties = exports.getSchedules = exports.createSchedule = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const msService = __importStar(require("./market-schedule.service"));
const apiError_1 = require("../../shared/utils/apiError");
exports.createSchedule = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 201, success: true, message: 'Schedule assigned', data: await msService.createSchedule(req.messId, req.body, req.user.userId) });
});
exports.getSchedules = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Schedules loaded', data: await msService.getSchedules(req.messId) });
});
exports.getMyDuties = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    if (!req.messMember)
        throw new apiError_1.AppError(403, 'Context missing mapping bounds');
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Duties found', data: await msService.getMyDuties(req.messId, req.messMember._id.toString()) });
});
exports.updateSchedule = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Schedule mutated', data: await msService.updateSchedule(req.messId, String(req.params.scheduleId), req.body) });
});
exports.reassignSchedule = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Schedule reassigned', data: await msService.reassignSchedule(req.messId, String(req.params.scheduleId), req.body.assignedTo) });
});
exports.updateActualSpent = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    if (!req.messMember)
        throw new apiError_1.AppError(403, 'Context missing mapping bounds');
    const isManager = req.messMember.messRole === 'manager' || req.messRole === 'manager';
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Spent budget updated', data: await msService.updateActualSpent(req.messId, String(req.params.scheduleId), req.body.actualSpent, req.messMember._id.toString(), isManager) });
});
exports.voidSchedule = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Schedule permanently voided', data: await msService.voidSchedule(req.messId, String(req.params.scheduleId)) });
});
exports.completeSchedule = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    if (!req.messMember)
        throw new apiError_1.AppError(403, 'Context missing mapping bounds');
    const isManager = req.messMember.messRole === 'manager' || req.messRole === 'manager';
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Schedule fulfilled and expense fully mapped', data: await msService.completeSchedule(req.messId, String(req.params.scheduleId), req.body, req.messMember._id.toString(), req.user.userId, isManager) });
});
