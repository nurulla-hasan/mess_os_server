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
exports.aiShoppingRoutes = void 0;
const express_1 = require("express");
const authorize_1 = require("../../shared/middlewares/authorize");
const validateRequest_1 = require("../../shared/middlewares/validateRequest");
const ctl = __importStar(require("./ai-shopping.controller"));
const val = __importStar(require("./ai-shopping.validation"));
const roles_1 = require("../../constants/roles");
const router = (0, express_1.Router)({ mergeParams: true });
router.get('/', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), ctl.getLists);
router.get('/:listId', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), ctl.getListById);
router.post('/generate', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), (0, validateRequest_1.validateRequest)(val.generateListSchema), ctl.generateList);
router.post('/:listId/approve', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), ctl.approveList);
router.post('/:listId/reject', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), ctl.rejectList);
router.post('/:listId/convert', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), (0, validateRequest_1.validateRequest)(val.convertListSchema), ctl.convertList);
exports.aiShoppingRoutes = router;
