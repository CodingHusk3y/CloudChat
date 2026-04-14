const express = require("express");
const router = express.Router({ mergeParams: true }); // ← key option

const {
    getMessages, createMessage, updateMessage, deleteMessage,
    reactToMessage, searchMessages,
} = require("../controllers/messageController");

const { protect, requireGroupMembership } = require("../middleware/auth");
const {
    validateCreateMessage, validateUpdateMessage, validatePagination, validateMongoId,
} = require("../middleware/validate");
const { uploadMultiple } = require("../middleware/upload");

router.use(protect, requireGroupMembership);

router.get(  "/",        validatePagination, getMessages);
router.post( "/",        uploadMultiple, validateCreateMessage, createMessage);
router.get(  "/search",  searchMessages);

router.patch( "/:messageId", validateUpdateMessage, updateMessage);
router.delete("/:messageId", deleteMessage);
router.post(  "/:messageId/react", reactToMessage);

module.exports = router;