const Group = require("../models/Group");
const User = require("../models/User");
const Message = require("../models/Message");
const { asyncHandler } = require("../middleware/errorHandler");

const createGroup = asyncHandler(async (req, res) => {
    const { name, description, settings } = req.body;

    const group = await Group.create({
        name,
        description,
        settings,
        owner: req.user._id,
        members: [{ user: req.user._id, role: "admin" }],
    });

    await User.findByIdAndUpdate(req.user._id, {
        $push: { groups: group._id },
    });

    await group.populate("owner", "username avatar");

    res.status(201).json({ success: true, group });
});

const getMyGroups = asyncHandler(async (req, res) => {
    const groups = await Group.find({ "members.user": req.user._id })
        .populate("owner", "username avatar")
        .populate("members.user", "username avatar isOnline")
        .sort({ updatedAt: -1 }); // most recently active first

    res.status(200).json({ success: true, count: groups.length, groups });
});

const getActiveGroups = asyncHandler(async (req, res) => {
    const groups = await Group.find({
        owner: { $ne: req.user._id },
        "settings.isPrivate": false,
        members: { $not: { $elemMatch: { user: req.user._id } } },
    })
        .populate("owner", "username avatar")
        .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: groups.length, groups });
});

const getGroup = asyncHandler(async (req, res) => {
    await req.group.populate("owner", "username avatar");
    await req.group.populate("members.user", "username avatar isOnline lastSeen");

    res.status(200).json({ success: true, group: req.group });
});

const updateGroup = asyncHandler(async (req, res) => {
    const { name, description, settings } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (settings !== undefined) {
        Object.entries(settings).forEach(([k, v]) => {
        updates[`settings.${k}`] = v; // dot notation for nested field update
        });
    }
    if (req.file) updates.avatar = `/uploads/${req.file.filename}`;

    const group = await Group.findByIdAndUpdate(
        req.params.groupId,
        { $set: updates },
        { new: true, runValidators: true }
    ).populate("owner", "username avatar");

    res.status(200).json({ success: true, group });
});

const deleteGroup = asyncHandler(async (req, res) => {
    const group = req.group;

    if (group.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
        success: false,
        message: "Only the group owner can delete the group.",
        });
    }

    const memberIds = group.members.map((m) => m.user);
    await User.updateMany(
        { _id: { $in: memberIds } },
        { $pull: { groups: group._id } } // $pull removes a value from an array
    );

    await Message.deleteMany({ group: group._id });

    await group.deleteOne();

    res.status(200).json({ success: true, message: "Group deleted successfully." });
});

const joinGroup = asyncHandler(async (req, res) => {
    const { inviteCode } = req.body;

    const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });

    if (!group) {
        return res.status(404).json({ success: false, message: "Invalid invite code." });
    }

    if (group.isMember(req.user._id)) {
        return res.status(409).json({ success: false, message: "You are already in this group." });
    }

    if (group.members.length >= group.settings.maxMembers) {
        return res.status(400).json({ success: false, message: "This group is full." });
    }

    group.members.push({ user: req.user._id, role: "member" });
    await group.save();

    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { groups: group._id }, // $addToSet prevents duplicates
    });

    await group.populate("owner", "username avatar");

    res.status(200).json({ success: true, message: "Joined group successfully!", group });
});

const joinGroupById = asyncHandler(async (req, res) => {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
        return res.status(404).json({ success: false, message: "Group not found." });
    }

    if (group.settings && group.settings.isPrivate) {
        return res.status(403).json({
            success: false,
            message: "This group is private. Use an invite code to join.",
        });
    }

    if (group.isMember(req.user._id)) {
        return res.status(409).json({ success: false, message: "You are already in this group." });
    }

    if (group.members.length >= group.settings.maxMembers) {
        return res.status(400).json({ success: false, message: "This group is full." });
    }

    group.members.push({ user: req.user._id, role: "member" });
    await group.save();

    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { groups: group._id },
    });

    await group.populate("owner", "username avatar");
    await group.populate("members.user", "username avatar isOnline");

    res.status(200).json({ success: true, message: "Joined group successfully!", group });
});

const leaveGroup = asyncHandler(async (req, res) => {
    const group = req.group;

    if (group.owner.toString() === req.user._id.toString()) {
        return res.status(400).json({
        success: false,
        message: "Group owners cannot leave. Transfer ownership or delete the group.",
        });
    }

    group.members = group.members.filter(
        (m) => m.user.toString() !== req.user._id.toString()
    );
    await group.save();

    await User.findByIdAndUpdate(req.user._id, {
        $pull: { groups: group._id },
    });

    res.status(200).json({ success: true, message: "Left the group successfully." });
});

const removeMember = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const group = req.group;

    if (!group.isMember(userId)) {
        return res.status(404).json({ success: false, message: "User is not a member of this group." });
    }

    if (group.owner.toString() === userId) {
        return res.status(400).json({ success: false, message: "Cannot remove the group owner." });
    }

    group.members = group.members.filter((m) => m.user.toString() !== userId);
    await group.save();

    await User.findByIdAndUpdate(userId, { $pull: { groups: group._id } });

    res.status(200).json({ success: true, message: "Member removed." });
});

const refreshInviteCode = asyncHandler(async (req, res) => {
    const { v4: uuidv4 } = require("uuid");
    const newCode = uuidv4().replace(/-/g, "").slice(0, 8).toUpperCase();

    const group = await Group.findByIdAndUpdate(
        req.params.groupId,
        { inviteCode: newCode },
        { new: true }
    );

    res.status(200).json({ success: true, inviteCode: group.inviteCode });
});

module.exports = {
    createGroup,
    getMyGroups,
    getActiveGroups,
    getGroup,
    updateGroup,
    deleteGroup,
    joinGroup,
    joinGroupById,
    leaveGroup,
    removeMember,
    refreshInviteCode,
};