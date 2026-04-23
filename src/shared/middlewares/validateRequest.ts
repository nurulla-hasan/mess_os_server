import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export const validateRequest = (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = await schema.parseAsync({ body: req.body, query: req.query, params: req.params, cookies: req.cookies });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    if (parsed.cookies) req.cookies = parsed.cookies;
    return next();
  } catch (error) {
    next(error);
  }
};
