import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProduction
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length
              ? ` ${JSON.stringify(meta)}`
              : '';
            return `${timestamp} ${level}: ${message}${metaStr}`;
          })
        )
  ),
  defaultMeta: { service: 'docuchat' },
  transports: [new winston.transports.Console()],
});

// Error objects serialize to {} under JSON.stringify, so flatten them into
// plain fields before passing them as log metadata.
export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}
