const Message = require("../models/Message");
const Group = require("../models/Group");
const { asyncHandler } = require("../middleware/errorHandler");
const path = require("path");
const fs = require("fs");
const {
  redisGetJson,
  redisSetJsonEx,
  redisDeleteByPattern,
} = require("../config/redis");

const MESSAGE_CACHE_TTL_SEC = Number(process.env.MESSAGE_CACHE_TTL_SEC || 30);

const recentMessagesCacheKey = (groupId, limit) => `messages:group:${groupId}:recent:${limit}`;
const recentMessagesCachePattern = (groupId) => `messages:group:${groupId}:recent:*`;

const getMessages = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before; 

  if (!before) {
    const cacheKey = recentMessagesCacheKey(groupId, limit);
    const cached = await redisGetJson(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }
  }

  const filter = { group: groupId };
  if (before) {
    filter._id = { $lt: before };
  }

  const messages = await Message.find(filter)
    .populate("sender", "username avatar")
    .populate("replyTo", "content sender")      
    .sort({ createdAt: -1 })                   
    .limit(limit);

  messages.reverse();

  const nextCursor = messages.length === limit ? messages[0]?._id : null;

  const payload = {
    success: true,
    count: messages.length,
    nextCursor,          
    messages,
  };

  if (!before) {
    const cacheKey = recentMessagesCacheKey(groupId, limit);
    await redisSetJsonEx(cacheKey, MESSAGE_CACHE_TTL_SEC, payload);
  }

  res.status(200).json(payload);
});

const createMessage = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { content, replyTo } = req.body;

  const attachments = [];
  const uploadedFiles = req.files || (req.file ? [req.file] : []);

  for (const file of uploadedFiles) {
    if (!req.group.settings.allowFileSharing) {
      fs.unlink(file.path, () => {});
      return res.status(403).json({
        success: false,
        message: "File sharing is disabled in this group.",
      });
    }

    attachments.push({
      filename: file.originalname,
      storedName: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
    });
  }

  const messageData = {
    group: groupId,
    sender: req.user._id,
    content: content || "",
    type: attachments.length > 0 ? "file" : "text",
    attachments,
    replyTo: replyTo || null,
  };

  let message = await Message.create(messageData);

  message = await message.populate("sender", "username avatar");
  if (replyTo) {
    message = await message.populate("replyTo", "content sender");
  }

  await redisDeleteByPattern(recentMessagesCachePattern(groupId));
  await Group.findByIdAndUpdate(groupId, { updatedAt: new Date() });

  res.status(201).json({ success: true, message });
});

const updateMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({ success: false, message: "Message not found." });
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "You can only edit your own messages." });
  }

  if (message.isDeleted) {
    return res.status(400).json({ success: false, message: "Cannot edit a deleted message." });
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();
  await redisDeleteByPattern(recentMessagesCachePattern(message.group.toString()));

  await message.populate("sender", "username avatar");

  res.status(200).json({ success: true, message });
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findOne({ _id: messageId, group: req.params.groupId })
    .setOptions({ includeDeleted: true });

  if (!message) {
    return res.status(404).json({ success: false, message: "Message not found." });
  }

  const isSender = message.sender.toString() === req.user._id.toString();
  const isAdmin = req.group.isAdmin(req.user._id);

  if (!isSender && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "You can only delete your own messages (admins can delete any).",
    });
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = "";      // clear content for privacy
  message.attachments = [];  // remove attachment references
  await message.save();
  await redisDeleteByPattern(recentMessagesCachePattern(req.params.groupId));

  res.status(200).json({ success: true, message: "Message deleted." });
});

const reactToMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    return res.status(400).json({ success: false, message: "emoji field is required." });
  }

  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(404).json({ success: false, message: "Message not found." });
  }

  const userId = req.user._id.toString();
  const currentReactors = message.reactions.get(emoji) || [];

  if (currentReactors.includes(userId)) {
    message.reactions.set(emoji, currentReactors.filter((id) => id !== userId));
    if (message.reactions.get(emoji).length === 0) {
      message.reactions.delete(emoji);
    }
  } else {
    message.reactions.set(emoji, [...currentReactors, userId]);
  }

  await message.save();
  await redisDeleteByPattern(recentMessagesCachePattern(message.group.toString()));

  res.status(200).json({ success: true, reactions: Object.fromEntries(message.reactions) });
});

const searchMessages = asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, message: "Search query must be at least 2 characters." });
  }

  const messages = await Message.find({
    group: req.params.groupId,
    content: { $regex: q.trim(), $options: "i" }, // i = case-insensitive
  })
    .populate("sender", "username avatar")
    .sort({ createdAt: -1 })
    .limit(Math.min(parseInt(limit), 50));

  res.status(200).json({ success: true, count: messages.length, messages });
});

module.exports = {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  reactToMessage,
  searchMessages,
};
