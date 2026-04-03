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
exports.archiveNotice = exports.pinNotice = exports.updateNotice = exports.getNotice = exports.getNotices = exports.createNotice = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const noteService = __importStar(require("./notice.service"));
exports.createNotice = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 201, success: true, message: 'Notice created', data: await noteService.createNotice(req.messId, req.body, req.user.userId) });
});
exports.getNotices = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Notices listed', data: await noteService.getNotices(req.messId) });
});
exports.getNotice = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Notice found', data: await noteService.getNotice(req.messId, String(req.params.noticeId)) });
});
exports.updateNotice = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Notice updated', data: await noteService.updateNotice(req.messId, String(req.params.noticeId), req.body) });
});
exports.pinNotice = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Notice pinned', data: await noteService.pinNotice(req.messId, String(req.params.noticeId)) });
});
exports.archiveNotice = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Notice archived', data: await noteService.archiveNotice(req.messId, String(req.params.noticeId)) });
});
