const SERVER_URL = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_BASE = SERVER_URL + '/api';
const STORAGE_KEY = 'cloudchat.ui-state';

const socket = io(SERVER_URL);

const elements = {
  userNameInput: document.getElementById('userNameInput'),
  groupForm: document.getElementById('groupForm'),
  groupNameInput: document.getElementById('groupNameInput'),
  groupDescriptionInput: document.getElementById('groupDescriptionInput'),
  groupList: document.getElementById('groupList'),
  groupCount: document.getElementById('groupCount'),
  activeGroupTitle: document.getElementById('activeGroupTitle'),
  activeGroupMeta: document.getElementById('activeGroupMeta'),
  deleteGroupButton: document.getElementById('deleteGroupButton'),
  messageForm: document.getElementById('messageForm'),
  messageInput: document.getElementById('messageInput'),
  messageList: document.getElementById('messageList'),
  messagesEmptyState: document.getElementById('messagesEmptyState'),
  typingIndicator: document.getElementById('typingIndicator')
};

const state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        userName: parsed.userName || 'Anonymous',
        activeGroupId: parsed.activeGroupId || null,
        groups: [],
        messages: []
      };
    } catch { /* fall through */ }
  }
  return { userName: 'Anonymous', activeGroupId: null, groups: [], messages: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    userName: state.userName,
    activeGroupId: state.activeGroupId
  }));
}

function getActiveGroup() {
  return state.groups.find((g) => g._id === state.activeGroupId) || null;
}

function formatTimeStamp(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// --- API helpers ---

async function api(path, options) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || res.statusText);
  }
  return res.json();
}

async function fetchRooms() {
  state.groups = await api('/rooms');
  renderGroups();
  if (state.activeGroupId) {
    const still = state.groups.find((g) => g._id === state.activeGroupId);
    if (!still && state.groups.length) {
      state.activeGroupId = state.groups[0]._id;
    } else if (!still) {
      state.activeGroupId = null;
    }
  }
  if (!state.activeGroupId && state.groups.length) {
    state.activeGroupId = state.groups[0]._id;
  }
  renderGroups();
  await switchRoom(state.activeGroupId);
}

async function fetchMessages(roomId) {
  if (!roomId) {
    state.messages = [];
    return;
  }
  state.messages = await api('/messages/' + roomId);
}

// --- Socket room management ---

let currentSocketRoom = null;

function joinSocketRoom(roomId) {
  if (currentSocketRoom === roomId) return;
  if (currentSocketRoom) {
    socket.emit('leaveRoom', { roomId: currentSocketRoom, username: state.userName });
  }
  if (roomId) {
    socket.emit('joinRoom', { roomId, username: state.userName });
  }
  currentSocketRoom = roomId;
}

async function switchRoom(roomId) {
  state.activeGroupId = roomId;
  saveState();
  joinSocketRoom(roomId);
  await fetchMessages(roomId);
  renderMessages();
}

// --- Rendering ---

function renderGroups() {
  elements.groupCount.textContent = String(state.groups.length);
  elements.groupList.innerHTML = '';

  if (!state.groups.length) {
    const emptyGroup = document.createElement('div');
    emptyGroup.className = 'empty-state';
    emptyGroup.innerHTML = '<h3>No groups yet</h3><p>Create a group to start your first chat room.</p>';
    elements.groupList.appendChild(emptyGroup);
    return;
  }

  for (const group of state.groups) {
    const isActive = group._id === state.activeGroupId;
    const lastMsg = group.lastMessage ? group.lastMessage.content : '';
    const preview = lastMsg ? lastMsg.slice(0, 40) + (lastMsg.length > 40 ? '...' : '') : 'No messages yet';
    const groupCard = document.createElement('div');
    groupCard.className = `group-card${isActive ? ' active' : ''}`;
    groupCard.tabIndex = 0;
    groupCard.setAttribute('role', 'button');
    groupCard.setAttribute('aria-pressed', String(isActive));
    groupCard.innerHTML = `
      <div class="group-card-top">
        <div>
          <h3>${group.name}</h3>
          <p class="group-description">${group.description || preview}</p>
        </div>
        <span class="group-count">${group.members ? group.members.length : 0} member${group.members && group.members.length === 1 ? '' : 's'}</span>
      </div>
      <div class="group-actions">
        <button class="ghost-button" type="button">Open room</button>
        <button class="icon-button" type="button">Delete</button>
      </div>
    `;

    const openHandler = (event) => {
      event.stopPropagation();
      switchRoom(group._id);
      renderGroups();
    };

    groupCard.addEventListener('click', () => {
      switchRoom(group._id);
      renderGroups();
    });

    groupCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        switchRoom(group._id);
        renderGroups();
      }
    });

    groupCard.querySelector('.ghost-button').addEventListener('click', openHandler);

    groupCard.querySelector('.icon-button').addEventListener('click', (event) => {
      event.stopPropagation();
      deleteGroup(group._id);
    });

    elements.groupList.appendChild(groupCard);
  }
}

function renderMessages() {
  const activeGroup = getActiveGroup();
  const hasMessages = Boolean(state.messages.length);

  elements.messagesEmptyState.style.display = hasMessages ? 'none' : 'grid';
  elements.messageList.innerHTML = '';

  if (!activeGroup) {
    elements.activeGroupTitle.textContent = 'No group selected';
    elements.activeGroupMeta.textContent = 'Create or select a group to begin.';
    elements.deleteGroupButton.disabled = true;
    return;
  }

  elements.activeGroupTitle.textContent = activeGroup.name;
  elements.activeGroupMeta.textContent = `${state.messages.length} message${state.messages.length === 1 ? '' : 's'} in this room`;
  elements.deleteGroupButton.disabled = false;

  for (const message of state.messages) {
    const isMine = message.sender.toLowerCase() === state.userName.toLowerCase();
    const messageCard = document.createElement('article');
    messageCard.className = `message-card${isMine ? ' mine' : ''}`;
    messageCard.innerHTML = `
      <div class="message-top">
        <div class="message-sender">
          <span class="avatar">${getInitials(message.sender) || '?'}</span>
          <span>${message.sender}</span>
        </div>
        <span class="message-meta">${formatTimeStamp(message.createdAt)}</span>
      </div>
      <p class="message-content">${message.content}</p>
      <div class="message-footer">
        <span class="message-meta">${isMine ? 'Sent by you' : 'Room message'}</span>
        <button class="icon-button" type="button">Delete message</button>
      </div>
    `;

    messageCard.querySelector('.icon-button').addEventListener('click', () => {
      deleteMessage(message._id);
    });

    elements.messageList.appendChild(messageCard);
  }

  requestAnimationFrame(() => {
    elements.messageList.scrollTop = elements.messageList.scrollHeight;
  });
}

// --- Actions ---

async function createGroup(name, description) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const duplicate = state.groups.some((g) => g.name.toLowerCase() === trimmedName.toLowerCase());
  if (duplicate) {
    window.alert('That group name already exists.');
    return;
  }

  const room = await api('/rooms', {
    method: 'POST',
    body: JSON.stringify({ name: trimmedName, description: description.trim(), members: [state.userName] })
  });

  state.groups.unshift(room);
  elements.groupForm.reset();
  await switchRoom(room._id);
  renderGroups();
}

async function deleteGroup(groupId) {
  const group = state.groups.find((g) => g._id === groupId);
  if (!group) return;

  const confirmed = window.confirm(`Delete the group "${group.name}" and all of its messages?`);
  if (!confirmed) return;

  state.groups = state.groups.filter((g) => g._id !== groupId);

  if (state.activeGroupId === groupId) {
    const next = state.groups[0]?._id || null;
    await switchRoom(next);
  }

  renderGroups();
}

function sendMessage(text) {
  const activeGroup = getActiveGroup();
  if (!activeGroup) {
    window.alert('Create or select a group first.');
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  socket.emit('sendMessage', {
    roomId: activeGroup._id,
    sender: state.userName.trim() || 'Anonymous',
    content: trimmed
  });

  elements.messageForm.reset();
}

function deleteMessage(messageId) {
  state.messages = state.messages.filter((m) => m._id !== messageId);
  renderMessages();
}

// --- Typing indicator ---

let typingTimeout = null;

function emitTyping() {
  if (!state.activeGroupId) return;
  socket.emit('typing', { roomId: state.activeGroupId, username: state.userName });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stopTyping', { roomId: state.activeGroupId, username: state.userName });
  }, 1500);
}

let typingClearTimer = null;

function showTyping(username) {
  elements.typingIndicator.textContent = `${username} is typing...`;
  elements.typingIndicator.hidden = false;
  clearTimeout(typingClearTimer);
  typingClearTimer = setTimeout(() => {
    elements.typingIndicator.hidden = true;
  }, 2000);
}

function hideTyping() {
  elements.typingIndicator.hidden = true;
}

// --- Socket event listeners ---

socket.on('newMessage', (message) => {
  if (message.room === state.activeGroupId || message.roomId === state.activeGroupId) {
    state.messages.push(message);
    renderMessages();
  }
});

socket.on('userJoined', ({ message }) => {
  console.log(message);
});

socket.on('userLeft', ({ message }) => {
  console.log(message);
});

socket.on('typing', ({ username }) => {
  showTyping(username);
});

socket.on('stopTyping', () => {
  hideTyping();
});

socket.on('errorMessage', ({ message }) => {
  console.error('Socket error:', message);
});

// --- DOM event listeners ---

elements.userNameInput.addEventListener('input', (event) => {
  state.userName = event.target.value.slice(0, 32) || 'Anonymous';
  saveState();
});

elements.groupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  createGroup(elements.groupNameInput.value, elements.groupDescriptionInput.value);
});

elements.deleteGroupButton.addEventListener('click', () => {
  const activeGroup = getActiveGroup();
  if (activeGroup) {
    deleteGroup(activeGroup._id);
  }
});

elements.messageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(elements.messageInput.value);
});

elements.messageInput.addEventListener('input', emitTyping);

// --- Init ---

elements.userNameInput.value = state.userName;
fetchRooms();
