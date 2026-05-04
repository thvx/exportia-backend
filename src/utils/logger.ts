/**
 * Centralized logging service
 * Replaces console.log with structured logging
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  requestId?: string;
  context?: Record<string, any>;
}

function serializeError(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(typeof (error as any).code === "string" ? { code: (error as any).code } : {}),
      ...(typeof (error as any).errno === "number" ? { errno: (error as any).errno } : {}),
      ...(typeof (error as any).address === "string" ? { address: (error as any).address } : {}),
      ...(typeof (error as any).port === "number" ? { port: (error as any).port } : {}),
    };
  }

  if (error && typeof error === "object") {
    return { ...error };
  }

  return { value: error };
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  private formatEntry(level: LogLevel, message: string, requestId?: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      message,
      requestId,
      context,
    };
  }

  private output(entry: LogEntry): void {
    if (this.isDevelopment) {
      const levelPrefix = {
        info: "[INFO]",
        warn: "[WARN]",
        error: "[ERROR]",
        debug: "[DEBUG]",
      }[entry.level];

      const contextStr = entry.context ? ` | ${JSON.stringify(entry.context)}` : "";
      const reqIdStr = entry.requestId ? ` | ${entry.requestId}` : "";

      console.log(`${entry.timestamp} ${levelPrefix} ${entry.message}${reqIdStr}${contextStr}`);
    } else {
      // Production: JSON logging for structured log aggregation
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, requestId?: string, context?: Record<string, any>): void {
    this.output(this.formatEntry("info", message, requestId, context));
  }

  warn(message: string, requestId?: string, context?: Record<string, any>): void {
    this.output(this.formatEntry("warn", message, requestId, context));
  }

  error(message: string, errorOrRequestId?: unknown, context?: Record<string, any>): void {
    if (typeof errorOrRequestId === "string" || errorOrRequestId === undefined) {
      this.output(this.formatEntry("error", message, errorOrRequestId, context));
      return;
    }

    this.output(this.formatEntry("error", message, undefined, {
      ...context,
      error: serializeError(errorOrRequestId),
    }));
  }

  debug(message: string, requestId?: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.output(this.formatEntry("debug", message, requestId, context));
    }
  }

  startup(message: string): void {
    console.log(`\n[STARTUP] ${message}\n`);
  }

  httpRequest(method: string, path: string, status: number, duration: number, requestId: string): void {
    const message = `[${status}] ${method} ${path} (${duration}ms)`;
    const logLevel = status >= 400 ? "warn" : "info";

    if (logLevel === "warn") {
      this.warn(message, requestId);
    } else {
      this.info(message, requestId);
    }
  }
}

export const logger = new Logger();
