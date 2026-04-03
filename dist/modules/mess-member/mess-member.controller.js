"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeMember = exports.rejectMember = exports.approveMember = exports.getMembers = exports.requestJoin = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
exports.requestJoin = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 201, success: true, message: 'Joined', data: {} });
});
exports.getMembers = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Fetched', data: [] });
});
exports.approveMember = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Approved', data: {} });
});
exports.rejectMember = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Rejected', data: {} });
});
exports.removeMember = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Removed', data: {} });
});
