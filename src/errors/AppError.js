export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;

    // Marks expected application errors so they can be handled separately
    // from unexpected programming or infrastructure errors.
    this.isOperational = true;

    Error.captureStackTrace(this, AppError);
  }
}
