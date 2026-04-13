const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied. No token provided.",
        });
    }

    const token = authHeader.split(" ")[1]; 

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "User belonging to this token no longer exists.",
        });
    }

    req.user = user;
    next(); 
    } catch (error) {
        if (error.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
        }
        if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ success: false, message: "Invalid token." });
        }
        return res.status(500).json({ success: false, message: "Authentication error." });
    }
};

const requireGroupMembership = async (req, res, next) => {
    const Group = require("../models/Group"); 
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
        return res.status(404).json({ success: false, message: "Group not found." });
        }

        if (!group.isMember(req.user._id)) {
        return res.status(403).json({ success: false, message: "You are not a member of this group." });
        }

        req.group = group; 
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error checking group membership." });
    }
};

const requireGroupAdmin = async (req, res, next) => {
    const Group = require("../models/Group");
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
        return res.status(404).json({ success: false, message: "Group not found." });
        }

        if (!group.isAdmin(req.user._id) && group.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Admin privileges required." });
        }

        req.group = group;
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error checking group admin." });
    }
};

module.exports = { protect, requireGroupMembership, requireGroupAdmin };