import winston, { format } from 'winston';
import { threadId } from 'worker_threads';

const { combine, timestamp, label, printf, colorize } = format;

const customFormat = printf(({ level, message, label, timestamp }) => {
  return `[${timestamp}][${level}][${label}]: ${message}`;
});

const logger = winston.createLogger({
  level: 'info',
  format: combine(
    label({ label: 'api' }),
    timestamp({ format: 'YYYY-MM-DD.HH:mm:ss' }),
    colorize(),
    customFormat
  ),
  defaultMeta: threadId ? { tid: `${threadId}` } : undefined,
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new winston.transports.Console(),
    new winston.transports.File({
      filename: './logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({ filename: './logs/combined.log' })
  ]
});
export default logger;
