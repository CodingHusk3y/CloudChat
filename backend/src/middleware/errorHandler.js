const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    if (err.name === "CastError" && err.kind === "ObjectId") {
        statusCode = 404;
        message = "Resource not found (invalid ID format)";
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        statusCode = 409; // 409 Conflict
        message = `A record with this ${field} already exists.`;
    }

    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors)
        .map((e) => e.message)
        .join(". ");
    }

    if (
        err.name === "MongoServerSelectionError" ||
        err.name === "MongooseServerSelectionError" ||
        /buffering timed out|server selection/i.test(err.message || "")
    ) {
        statusCode = 503;
        message = "Database is temporarily unavailable. Please try again shortly.";
    }

    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token.";
    }
    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token expired.";
    }

    if (process.env.NODE_ENV === "development") {
        console.error(`[${new Date().toISOString()}] ${statusCode} ${message}`);
        console.error(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};

const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl}`,
    });
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, notFound, asyncHandler };