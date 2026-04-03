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
exports.complaintRoutes = void 0;
const express_1 = require("express");
const authorize_1 = require("../../shared/middlewares/authorize");
const validateRequest_1 = require("../../shared/middlewares/validateRequest");
const ctl = __importStar(require("./complaint.controller"));
const val = __importStar(require("./complaint.validation"));
const roles_1 = require("../../constants/roles");
const router = (0, express_1.Router)({ mergeParams: true });
router.get('/', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), ctl.getComplaints);
router.get('/my', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), ctl.getMyComplaints);
router.get('/:complaintId', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), ctl.getComplaintById);
router.post('/', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), (0, validateRequest_1.validateRequest)(val.createComplaintSchema), ctl.createComplaint);
router.patch('/:complaintId/status', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), (0, validateRequest_1.validateRequest)(val.updateStatusSchema), ctl.updateStatus);
router.post('/:complaintId/resolve', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), (0, validateRequest_1.validateRequest)(val.resolveComplaintSchema), ctl.resolveComplaint);
router.post('/:complaintId/reject', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), (0, validateRequest_1.validateRequest)(val.resolveComplaintSchema), ctl.rejectComplaint);
exports.complaintRoutes = router;
