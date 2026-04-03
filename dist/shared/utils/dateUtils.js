"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDateRange = exports.normalizeMealDate = exports.getMonthBoundariesDhaka = exports.getDhakaNow = exports.DHAKA_OFFSET_MS = void 0;
exports.DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const getDhakaNow = () => {
    return new Date(Date.now() + exports.DHAKA_OFFSET_MS);
};
exports.getDhakaNow = getDhakaNow;
const getMonthBoundariesDhaka = (month, year) => {
    // Asia/Dhaka is UTC+6
    const utcStartOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const start = new Date(utcStartOfMonth.getTime() - exports.DHAKA_OFFSET_MS);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const utcStartOfNextMonth = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0, 0));
    const end = new Date(utcStartOfNextMonth.getTime() - exports.DHAKA_OFFSET_MS - 1);
    return { start, end };
};
exports.getMonthBoundariesDhaka = getMonthBoundariesDhaka;
const normalizeMealDate = (inputDate) => {
    const absoluteTime = new Date(inputDate).getTime();
    const dhakaMs = absoluteTime + exports.DHAKA_OFFSET_MS;
    const dhakaDateObject = new Date(dhakaMs);
    const normalizedDhakaUtc = new Date(Date.UTC(dhakaDateObject.getUTCFullYear(), dhakaDateObject.getUTCMonth(), dhakaDateObject.getUTCDate(), 0, 0, 0, 0));
    return new Date(normalizedDhakaUtc.getTime() - exports.DHAKA_OFFSET_MS);
};
exports.normalizeMealDate = normalizeMealDate;
const generateDateRange = (start, end) => {
    const dates = [];
    let current = new Date(start);
    while (current <= end) {
        dates.push(new Date(current));
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    return dates;
};
exports.generateDateRange = generateDateRange;
