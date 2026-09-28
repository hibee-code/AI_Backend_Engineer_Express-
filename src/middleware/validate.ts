import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Validates request parts against zod schemas. ZodErrors go to the error handler (400).
 * The parsed body replaces req.body; params/query are validated only because
 * Express 5 exposes req.query as a read-only getter.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    if (schemas.params) schemas.params.parse(req.params);
    if (schemas.query) schemas.query.parse(req.query);
    if (schemas.body) req.body = schemas.body.parse(req.body);
    next();
  };
