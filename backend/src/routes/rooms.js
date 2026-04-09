const express = require('express');

const { createRoom, listRooms } = require('../controllers/roomController');

const router = express.Router();

router.get('/', listRooms);
router.post('/', createRoom);

module.exports = router;
