const express = require("express");
const router = express.Router();

const {
    createGroup, getMyGroups, getActiveGroups, getGroup, updateGroup, deleteGroup,
    joinGroup, joinGroupById, leaveGroup, removeMember, refreshInviteCode,
} = require("../controllers/groupController");

const { protect, requireGroupMembership, requireGroupAdmin } = require("../middleware/auth");
const {
    validateCreateGroup, validateUpdateGroup, validateJoinGroup, validateMongoId,
} = require("../middleware/validate");
const { uploadSingle } = require("../middleware/upload");

router.use(protect);

router.post("/",    validateCreateGroup, createGroup); 
router.get("/",     getMyGroups);                      
router.get("/active", getActiveGroups);
router.post("/join", validateJoinGroup, joinGroup);    
router.post("/:groupId/join", validateMongoId("groupId"), joinGroupById);

router
    .route("/:groupId")
    .get(    requireGroupMembership, getGroup)
    .patch(  requireGroupAdmin, uploadSingle, validateUpdateGroup, updateGroup)
    .delete( requireGroupAdmin, deleteGroup);

router.delete("/:groupId/leave",              requireGroupMembership, leaveGroup);
router.delete("/:groupId/members/:userId",    requireGroupAdmin, removeMember);
router.get("/:groupId/invite/refresh",        requireGroupAdmin, refreshInviteCode);

module.exports = router;