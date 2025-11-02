
// server/src/middleware/validate.ts
import { Request, Response, NextFunction } from "express";

/**
 * Validate req.body with a Zod schema.
 * Parsed result is stored on res.locals.body
 */
export const validateBody =
  (schema: any) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "validation_error",
        details: result.error.flatten().fieldErrors,
      });
    }
    res.locals.body = result.data;
    next();
  };

/**
 * Validate req.query with a Zod schema.
 * Parsed result is stored on res.locals.query
 */
export const validateQuery =
  (schema: any) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: "validation_error",
        details: result.error.flatten().fieldErrors,
      });
    }
    res.locals.query = result.data;
    next();
  };

/**
 * Validate req.params with a Zod schema.
 * Parsed result is stored on res.locals.params
 */
export const validateParams =
  (schema: any) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: "validation_error",
        details: result.error.flatten().fieldErrors,
      });
    }
    res.locals.params = result.data;
    next();
  };