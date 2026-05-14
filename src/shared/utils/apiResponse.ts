import { Response } from 'express';
import { normalizeResponseAvatars } from './responseNormalizer';

export const sendResponse = <T>(
    res: Response,
    data: {
        statusCode: number;
        success: boolean;
        message: string;
        meta?: any;
        data?: T;
    }
) => {
    res.status(data.statusCode).json({
        success: data.success,
        message: data.message,
        meta: normalizeResponseAvatars(data.meta),
        data: normalizeResponseAvatars(data.data),
    });
};
