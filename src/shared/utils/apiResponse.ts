import { Response } from 'express';
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
        meta: data.meta,
        data: data.data,
    });
};
