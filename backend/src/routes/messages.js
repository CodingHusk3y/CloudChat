const express = require('express');
const router = express.Router();
const {
  createMessage,
  getMessagesByRoom,
} = require('../controllers/messageController');

router.post('/', createMessage);
router.get('/:roomId', getMessagesByRoom);

module.exports = router;