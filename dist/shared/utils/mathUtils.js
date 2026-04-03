"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeDivide = exports.roundTo = void 0;
const roundTo = (num, decimals = 2) => Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
exports.roundTo = roundTo;
const safeDivide = (a, b) => b === 0 ? 0 : a / b;
exports.safeDivide = safeDivide;
