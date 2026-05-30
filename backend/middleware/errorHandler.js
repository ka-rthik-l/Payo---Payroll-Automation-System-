import multer from 'multer';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File exceeds the maximum upload size.'
      : err.message;
    return res.status(400).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'DUPLICATE_RECORD',
      message: 'A record with this identifier already exists.'
    });
  }

  if (err.code === 'P2003') {
    return res.status(409).json({
      success: false,
      error: 'REFERENCE_CONSTRAINT',
      message: 'This record cannot be removed because related payroll data exists.'
    });
  }

  const status = err.statusCode || err.status || 500;
  const isAppError = err.name === 'AppError' || err.statusCode;
  const message = isAppError || process.env.NODE_ENV !== 'production'
    ? (err.message || 'Internal server error')
    : 'An unexpected error occurred. Please try again.';

  res.status(status).json({
    success: false,
    error: err.code || 'INTERNAL_ERROR',
    message
  });
}

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
