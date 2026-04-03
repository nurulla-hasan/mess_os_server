"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const errorHandler_1 = require("./shared/middlewares/errorHandler");
const v1_1 = require("./routes/v1");
const apiError_1 = require("./shared/utils/apiError");
const config_1 = require("./config");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: config_1.config.clientUrl,
    credentials: true
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)(config_1.config.env === 'production' ? 'combined' : 'dev'));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/api/v1', v1_1.v1Routes);
app.all('*', (req, res, next) => {
    next(new apiError_1.AppError(404, `Target securely missed: ${req.originalUrl}`));
});
app.use(errorHandler_1.globalErrorHandler);
exports.default = app;
