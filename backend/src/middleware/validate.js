const { body, param, query, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

const validateRegister = [
    body("username")
        .trim()
        .notEmpty().withMessage("Username is required")
        .isLength({ min: 3, max: 30 }).withMessage("Username must be 3–30 characters")
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage("Username: only letters, digits, _ and -"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Must be a valid email address")
        .normalizeEmail(), 

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
        .matches(/[0-9]/).withMessage("Password must contain at least one number"),

    handleValidationErrors,
    ];

    const validateLogin = [
    body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
    handleValidationErrors,
];

const validateCreateGroup = [
    body("name")
        .trim()
        .notEmpty().withMessage("Group name is required")
        .isLength({ min: 2, max: 60 }).withMessage("Group name must be 2–60 characters"),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 300 }).withMessage("Description cannot exceed 300 characters"),

    body("settings.isPrivate")
        .optional()
        .isBoolean().withMessage("isPrivate must be a boolean"),

    body("settings.maxMembers")
        .optional()
        .isInt({ min: 2, max: 500 }).withMessage("maxMembers must be between 2 and 500"),

    handleValidationErrors,
];

const validateUpdateGroup = [
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 60 }).withMessage("Group name must be 2–60 characters"),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 300 }).withMessage("Description too long"),

    handleValidationErrors,
];

const validateJoinGroup = [
    body("inviteCode")
        .trim()
        .notEmpty().withMessage("Invite code is required")
        .isLength({ min: 8, max: 8 }).withMessage("Invite code must be exactly 8 characters")
        .isAlphanumeric().withMessage("Invite code must be alphanumeric"),

    handleValidationErrors,
];

const validateCreateMessage = [
    body("content")
        .optional()
        .trim()
        .isLength({ max: 4000 }).withMessage("Message cannot exceed 4000 characters"),

    body("replyTo")
        .optional()
        .isMongoId().withMessage("replyTo must be a valid message ID"),

    body().custom((_, { req }) => {
        const hasContent = req.body.content && req.body.content.trim().length > 0;
        const hasFile = req.file || (req.files && req.files.length > 0);
        if (!hasContent && !hasFile) {
        throw new Error("Message must have content or an attached file");
        }
        return true;
    }),

    handleValidationErrors,
];

const validateUpdateMessage = [
    body("content")
        .trim()
        .notEmpty().withMessage("Updated content cannot be empty")
        .isLength({ max: 4000 }).withMessage("Message cannot exceed 4000 characters"),

    handleValidationErrors,
];

const validatePagination = [
    query("page")
        .optional()
        .isInt({ min: 1 }).withMessage("Page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),

    handleValidationErrors,
];


const validateMongoId = (paramName) => [
    param(paramName).isMongoId().withMessage(`${paramName} must be a valid ID`),
    handleValidationErrors,
];

module.exports = {
    handleValidationErrors,
    validateRegister,
    validateLogin,
    validateCreateGroup,
    validateUpdateGroup,
    validateJoinGroup,
    validateCreateMessage,
    validateUpdateMessage,
    validatePagination,
    validateMongoId,
};