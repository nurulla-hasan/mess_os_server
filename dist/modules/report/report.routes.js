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
exports.reportRoutes = void 0;
const express_1 = require("express");
const authorize_1 = require("../../shared/middlewares/authorize");
const ctl = __importStar(require("./report.controller"));
const roles_1 = require("../../constants/roles");
const router = (0, express_1.Router)({ mergeParams: true });
router.get('/summary', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), ctl.getMessSummary);
router.get('/financial', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), ctl.getMonthlyFinancials);
router.get('/members/:memberId', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), ctl.getMemberStatement);
router.get('/expenses', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), ctl.getExpenseReport);
router.get('/payments', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), ctl.getPaymentReport);
router.get('/export/csv', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), ctl.exportCsvReport);
router.get('/export/pdf', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), ctl.exportPdfReport);
exports.reportRoutes = router;
