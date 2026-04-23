module.exports = (error, _req, res, _next) => {
  console.error(error);

  // Express body-parser throws SyntaxError for malformed JSON payloads.
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    Object.prototype.hasOwnProperty.call(error, "body")
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Malformed JSON request body."
      }
    });
    return;
  }

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
