import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../lib/metrics';

// Label for requests that matched no route (404s, scanners probing random
// URLs). Collapsing them into one series keeps metric cardinality bounded.
const UNMATCHED_ROUTE = '<unmatched>';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer();
  const getRoutePattern = trackRoutePattern(req);

  res.once('finish', () => {
    const path = getRoutePattern();
    const statusCode = res.statusCode.toString();

    httpRequestsTotal.inc({ method: req.method, path, status_code: statusCode });
    end({ method: req.method, path });
  });

  next();
}

// Label requests by route pattern (/api/v1/documents/:id), never by raw URL
// (/api/v1/documents/cm1x9...), or each document ID becomes its own series.
//
// req.route is only set once routing runs, after this middleware. Reading it
// on 'finish' is not enough: when a handler throws, Express resets req.baseUrl
// before the error handler responds, leaving just "/:id". So capture the full
// pattern at the moment Express assigns req.route, while baseUrl is correct.
function trackRoutePattern(req: Request): () => string {
  let pattern: string | undefined;
  let route: Request['route'];

  Object.defineProperty(req, 'route', {
    configurable: true,
    enumerable: true,
    get: () => route,
    set: (value: Request['route']) => {
      route = value;
      if (typeof value?.path === 'string') {
        pattern = `${req.baseUrl}${value.path}`;
      }
    },
  });

  return () => pattern ?? UNMATCHED_ROUTE;
}
