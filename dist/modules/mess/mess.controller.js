"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferOwnership = exports.regenerateInviteCode = exports.updateMess = exports.getMess = exports.createMess = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
exports.createMess = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 201, success: true, message: 'Created', data: {} });
});
exports.getMess = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Fetched', data: {} });
});
exports.updateMess = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Updated', data: {} });
});
exports.regenerateInviteCode = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Regenerated', data: {} });
});
exports.transferOwnership = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Transferred', data: {} });
});
