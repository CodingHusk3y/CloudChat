const express = require('express');
const router = express.Router();
const {
  createRoom,
  getAllRooms,
  getRoomById,
  addMemberToRoom,
} = require('../controllers/roomController');

router.post('/', createRoom);
router.get('/', getAllRooms);
router.get('/:roomId', getRoomById);
router.post('/:roomId/members', addMemberToRoom);

module.exports = router;
