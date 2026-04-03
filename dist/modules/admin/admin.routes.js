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
exports.adminRoutes = exports.requireSuperAdmin = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../shared/middlewares/authenticate");
const apiError_1 = require("../../shared/utils/apiError");
const validateRequest_1 = require("../../shared/middlewares/validateRequest");
const ctl = __importStar(require("./admin.controller"));
const val = __importStar(require("./admin.validation"));
const requireSuperAdmin = (req, res, next) => {
    if (req.user?.globalRole !== 'super_admin') {
        return next(new apiError_1.AppError(403, 'Restricted strictly to platform super administrators'));
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate, exports.requireSuperAdmin);
router.get('/users', (0, validateRequest_1.validateRequest)(val.paginationSchema), ctl.getAllUsers);
router.get('/messes', (0, validateRequest_1.validateRequest)(val.paginationSchema), ctl.getAllMesses);
router.get('/stats', ctl.getStats);
router.patch('/users/:userId/role', (0, validateRequest_1.validateRequest)(val.updateRoleSchema), ctl.updateUserRole);
router.patch('/users/:userId/block', ctl.blockUser);
router.patch('/messes/:messId/suspend', ctl.suspendMess);
exports.adminRoutes = router;
