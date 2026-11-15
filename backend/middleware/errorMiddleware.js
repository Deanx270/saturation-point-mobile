const multer = require('multer');

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file exceeds the 5MB limit' : err.message,
      status: 'error',
    });
  }

  if (err.message && err.message.includes('Only static image files')) {
    return res.status(400).json({
      message: err.message,
      status: 'error',
    });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    status: 'error',
  });
};

module.exports = {
  notFound,
  errorHandler,
};
