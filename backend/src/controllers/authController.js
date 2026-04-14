const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

const signToken = (userId) =>
    jwt.sign(
        { id: userId },                  
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

const sendTokenResponse = (user, statusCode, res) => {
    const token = signToken(user._id);

    res.status(statusCode).json({
        success: true,
        token,
        user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
        },
    });
};

const register = asyncHandler(async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: "Database is not connected yet. Please try again in a few seconds.",
        });
    }

    const { username, email, password } = req.body;

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
        return res.status(409).json({
        success: false,
        message: exists.email === email
            ? "An account with this email already exists."
            : "This username is already taken.",
        });
    }

    const user = await User.create({ username, email, password });

    sendTokenResponse(user, 201, res);
});

const login = asyncHandler(async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: "Database is not connected yet. Please try again in a few seconds.",
        });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
        });
    }

    user.isOnline = true;
    user.lastSeen = Date.now();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
});


const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        isOnline: false,
        lastSeen: Date.now(),
    });

    res.status(200).json({ success: true, message: "Logged out successfully." });
});

const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate("groups", "name avatar memberCount");

    res.status(200).json({ success: true, user });
});

const updateMe = asyncHandler(async (req, res) => {
    const { username } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (req.file) updateData.avatar = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
        new: true,           
        runValidators: true,
    });

    res.status(200).json({ success: true, user });
});

module.exports = { register, login, logout, getMe, updateMe };