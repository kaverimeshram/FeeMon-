export const globalErrorHandler = (err, req, res, next) => {
  const status = err.status || 500;

  // Log all 500 errors with stack trace to console
  if (status === 500) {
    console.error('[Error] Internal server error:', err);
  }

  res.status(status).json({
    error: err.message || 'Internal server error',
  });
};

export default globalErrorHandler;
