const path = require('path');
const express = require('express');
const cors = require('cors');

const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

app.use(express.static(path.join(__dirname, '../../frontend')));

module.exports = app;
