module.exports = (error, _req, res, _next) => {
  console.error(error);

  const statusCode = error.statusCode || 500;
  const code = error.code || "INTERNAL_SERVER_ERROR";
  const message = error.message || "An unexpected error occurred.";

  res.status(statusCode).json({
    error: {
      code,
      message
    }
  });
};

