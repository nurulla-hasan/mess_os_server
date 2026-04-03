"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../../config");
const transporter = nodemailer_1.default.createTransport({
    host: config_1.config.smtp.host,
    port: Number(config_1.config.smtp.port),
    auth: {
        user: config_1.config.smtp.user,
        pass: config_1.config.smtp.pass,
    },
});
const sendEmail = async (to, subject, html) => {
    await transporter.sendMail({
        from: config_1.config.smtp.from,
        to,
        subject,
        html,
    });
};
exports.sendEmail = sendEmail;
