import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// The schema describes the whole request: z.object({ body: ..., query: ..., params: ... })
type RequestSchema = z.ZodType<{ body?: unknown; query?: unknown; params?: unknown }>;

export function validate(schema: RequestSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      // zod 4: the list of problems is `issues` (zod 3 called it `errors`)
      const errors = result.error.issues.map((err) => ({
        field: err.path.slice(1).join('.'), // Remove 'body'/'query' prefix
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      });
    }

    // Replace req properties with validated (and transformed) data
    req.body = result.data.body ?? req.body;
    // Express 5 makes req.query a read-only getter, so redefine it instead of assigning
    Object.defineProperty(req, 'query', {
      value: result.data.query ?? req.query,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    req.params = (result.data.params ?? req.params) as Request['params'];
    next();
  };
}
