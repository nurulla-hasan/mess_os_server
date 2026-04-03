import { Request, Response, NextFunction } from 'express';
export const validateRequest = (schema: any) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({ body: req.body, query: req.query, params: req.params, cookies: req.cookies });
    return next();
  } catch (error) {
    next(error);
  }
};
