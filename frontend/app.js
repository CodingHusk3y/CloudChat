const SERVER_URL = (() => {
  if (window.location.protocol === 'file:') return 'http://localhost:5000';
  const isLocalFrontend = window.location.hostname === 'localhost' && window.location.port === '3000';
  if (isLocalFrontend) return 'http://localhost:5000';
  return window.location.origin;
})();
const API_BASE = SERVER_URL + '/api';
const STORAGE_KEY = 'cloudchat.ui-state';

if (typeof checkAuthentication === 'function' && !checkAuthentication()) {
  throw new Error('Authentication required');
}

// Wait for Socket.IO to be available
let socket;
function initializeSocket() {
  if (typeof io === 'undefined') {
    console.warn('Socket.IO not yet loaded, retrying...');
    setTimeout(initializeSocket, 100);
    return;
  }
  socket = io(SERVER_URL);
  setupSocketListeners();
}

function setupSocketListeners() {
  if (!socket) {
    console.warn('Socket not ready, will retry...');
    setTimeout(setupSocketListeners, 100);
    return;
  }
  
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
}

initializeSocket();

const elements = {
  userNameInput: document.getElementById('userNameInput'),
  groupForm: document.getElementById('groupForm'),
  groupNameInput: document.getElementById('groupNameInput'),
  groupDescriptionInput: document.getElementById('groupDescriptionInput'),
  groupList: document.getElementById('groupList'),
  groupCount: document.getElementById('groupCount'),
  activeGroupList: document.getElementById('activeGroupList'),
  activeGroupCount: document.getElementById('activeGroupCount'),
  activeGroupTitle: document.getElementById('activeGroupTitle'),
  activeGroupMeta: document.getElementById('activeGroupMeta'),
  deleteGroupButton: document.getElementById('deleteGroupButton'),
  messageForm: document.getElementById('messageForm'),
  messageInput: document.getElementById('messageInput'),
  messageList: document.getElementById('messageList'),
  messagesEmptyState: document.getElementById('messagesEmptyState'),
  typingIndicator: document.getElementById('typingIndicator'),
  displayUsername: document.getElementById('displayUsername'),
  displayEmail: document.getElementById('displayEmail'),
  logoutBtn: document.getElementById('logoutBtn')
};

// Display user info
function displayUserInfo() {
  const user = AuthManager.getUser();
  if (user) {
    elements.displayUsername.textContent = user.username;
    document.getElementById('displayUsername2').textContent = user.username;
    elements.displayEmail.textContent = user.email;
  }
}

// Identity tab toggle functionality
const identityToggle = document.getElementById('identityToggle');
const identityPanel = document.getElementById('identityPanel');

if (identityToggle && identityPanel) {
  identityToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    identityPanel.classList.toggle('expanded');
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!identityToggle.contains(e.target) && !identityPanel.contains(e.target)) {
      identityPanel.classList.remove('expanded');
    }
  });

  // Close panel when clicking inside (to prevent accidental closing)
  identityPanel.addEventListener('click', (e) => {
    if (e.target.id === 'logoutBtn') {
      identityPanel.classList.remove('expanded');
    }
  });
}

// Logout handler
elements.logoutBtn?.addEventListener('click', () => {
  UserAPI.logout().catch((error) => {
    console.error('Logout error:', error);
  });
});

const state = loadState();
const currentUser = AuthManager.getUser() || {};
const currentUserId = currentUser.id || currentUser._id || null;
const MESSAGE_PAGE_SIZE = 20;
const paging = {
  nextCursor: null,
  hasMore: true,
  isLoading: false
};
let toastTimer = null;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        userName: parsed.userName || 'Anonymous',
        activeGroupId: parsed.activeGroupId || null,
        groups: [],
        activeGroups: [],
        messages: []
      };
    } catch { /* fall through */ }
  }
  return { userName: 'Anonymous', activeGroupId: null, groups: [], activeGroups: [], messages: [] };
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

function ensureToastRoot() {
  let root = document.getElementById('toastRoot');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'toastRoot';
  root.className = 'toast-root';
  root.setAttribute('aria-live', 'polite');
  root.setAttribute('aria-atomic', 'true');
  document.body.appendChild(root);
  return root;
}

function showSuccessToast(message) {
  const root = ensureToastRoot();
  clearTimeout(toastTimer);

  root.innerHTML = '';
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.textContent = message;
  root.appendChild(toast);

  toastTimer = setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentNode === root) {
        root.removeChild(toast);
      }
    }, 200);
  }, 1800);
}

// --- API helpers ---

async function api(path, options) {
  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers
  };

  // Add auth token if available
  const token = AuthManager.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(API_BASE + path, {
    headers,
    ...options
  });
  
  // Handle 401 Unauthorized
  if (res.status === 401) {
    AuthManager.logout();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || res.statusText);
  }
  return res.json();
}

async function fetchRooms() {
  const data = await api('/groups');
  state.groups = Array.isArray(data) ? data : (data.groups || []);
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

async function fetchActiveGroups() {
  const data = await api('/groups/active');
  state.activeGroups = Array.isArray(data) ? data : (data.groups || []);
  renderActiveGroups();
}

async function fetchMessages(roomId) {
  if (!roomId) {
    state.messages = [];
    paging.nextCursor = null;
    paging.hasMore = false;
    return;
  }

  paging.isLoading = true;
  try {
    const query = new URLSearchParams({ limit: String(MESSAGE_PAGE_SIZE) });
    if (paging.nextCursor) {
      query.set('before', paging.nextCursor);
    }

    const paths = [
      '/groups/' + roomId + '/messages?' + query.toString()
    ];

    let data = null;
    for (const path of paths) {
      try {
        data = await api(path);
        break;
      } catch {
        // try fallback path
      }
    }

    if (!data) {
      if (!state.messages.length) {
        state.messages = [];
      }
      paging.hasMore = false;
      return;
    }

    const incoming = Array.isArray(data) ? data : (data.messages || []);
    const receivedNextCursor = data && !Array.isArray(data) ? (data.nextCursor || null) : null;

    if (!paging.nextCursor) {
      state.messages = incoming;
    } else {
      const existingIds = new Set(state.messages.map((m) => String(m._id)));
      const older = incoming.filter((m) => !existingIds.has(String(m._id)));
      state.messages = [...older, ...state.messages];
    }

    paging.nextCursor = receivedNextCursor || (incoming.length ? String(incoming[0]._id) : null);
    paging.hasMore = Boolean(receivedNextCursor) || incoming.length === MESSAGE_PAGE_SIZE;
  } finally {
    paging.isLoading = false;
  }
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
  paging.nextCursor = null;
  paging.hasMore = Boolean(roomId);
  await fetchMessages(roomId);
  renderMessages({ scrollToBottom: true });
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
    groupCard.innerHTML = `
      <div class="group-card-top">
        <div>
          <h3>${group.name}</h3>
          <p class="group-description">${group.description || preview}</p>
        </div>
        <span class="group-count">${group.members ? group.members.length : 0} member${group.members && group.members.length === 1 ? '' : 's'}</span>
      </div>
      <div class="group-actions">
        <button class="ghost-button" type="button">Enter room</button>
        <button class="icon-button" type="button">Leave chat</button>
      </div>
    `;

    const openHandler = (event) => {
      event.stopPropagation();
      switchRoom(group._id);
      renderGroups();
    };

    groupCard.querySelector('.ghost-button').addEventListener('click', openHandler);

    groupCard.querySelector('.icon-button').addEventListener('click', (event) => {
      event.stopPropagation();
      leaveGroup(group._id);
    });

    elements.groupList.appendChild(groupCard);
  }
}

function renderActiveGroups() {
  if (!elements.activeGroupList || !elements.activeGroupCount) return;

  elements.activeGroupCount.textContent = String(state.activeGroups.length);
  elements.activeGroupList.innerHTML = '';

  if (!state.activeGroups.length) {
    const emptyGroup = document.createElement('div');
    emptyGroup.className = 'empty-state';
    emptyGroup.innerHTML = '<h3>No active groups</h3><p>When other users create public groups, they appear here.</p>';
    elements.activeGroupList.appendChild(emptyGroup);
    return;
  }

  for (const group of state.activeGroups) {
    const ownerName = group.owner && group.owner.username ? group.owner.username : 'Unknown';
    const groupCard = document.createElement('div');
    groupCard.className = 'group-card';
    groupCard.innerHTML = `
      <div class="group-card-top">
        <div>
          <h3>${group.name}</h3>
          <p class="group-description">${group.description || 'Join this public group to start chatting.'}</p>
        </div>
        <button class="creator-chip" type="button">@${ownerName}</button>
      </div>
      <div class="group-actions">
        <button class="primary-button join-group-button" type="button">Join</button>
      </div>
    `;

    groupCard.querySelector('.join-group-button').addEventListener('click', (event) => {
      event.stopPropagation();
      joinActiveGroup(group._id).catch((error) => {
        window.alert(error.message || 'Unable to join this group.');
      });
    });

    elements.activeGroupList.appendChild(groupCard);
  }
}

function getSenderName(message) {
  if (!message) return 'Unknown';
  if (typeof message.sender === 'string') return message.sender;
  if (message.sender && typeof message.sender === 'object') {
    return message.sender.username || message.sender.name || 'Unknown';
  }
  return 'Unknown';
}

function renderMessages(options = {}) {
  const { scrollToBottom = true, preserveAnchor = null } = options;
  const activeGroup = getActiveGroup();
  const hasMessages = Boolean(state.messages.length);

  elements.messagesEmptyState.style.display = hasMessages ? 'none' : 'grid';
  elements.messageList.innerHTML = '';

  if (!activeGroup) {
    if (elements.activeGroupTitle) {
      elements.activeGroupTitle.textContent = 'No group selected';
    }
    if (elements.activeGroupMeta) {
      elements.activeGroupMeta.textContent = 'Create or select a group to begin.';
    }
    if (elements.deleteGroupButton) {
      elements.deleteGroupButton.disabled = true;
    }
    return;
  }

  if (elements.activeGroupTitle) {
    elements.activeGroupTitle.textContent = activeGroup.name;
  }
  if (elements.activeGroupMeta) {
    elements.activeGroupMeta.textContent = `${state.messages.length} message${state.messages.length === 1 ? '' : 's'} in this room`;
  }
  if (elements.deleteGroupButton) {
    elements.deleteGroupButton.disabled = false;
  }

  for (const message of state.messages) {
    const senderName = getSenderName(message);
    const isMine = senderName.toLowerCase() === state.userName.toLowerCase();
    const messageCard = document.createElement('article');
    messageCard.className = `message-card${isMine ? ' mine' : ''}`;
    messageCard.innerHTML = `
      <div class="message-top">
        <div class="message-sender">
          <span class="avatar">${getInitials(senderName) || '?'}</span>
          <span>${senderName}</span>
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
    if (preserveAnchor) {
      const newHeight = elements.messageList.scrollHeight;
      elements.messageList.scrollTop = newHeight - preserveAnchor.prevHeight + preserveAnchor.prevTop;
      return;
    }

    if (scrollToBottom) {
      elements.messageList.scrollTop = elements.messageList.scrollHeight;
    }
  });
}

async function loadOlderMessages() {
  if (!state.activeGroupId || paging.isLoading || !paging.hasMore || !state.messages.length) {
    return;
  }

  const prevHeight = elements.messageList.scrollHeight;
  const prevTop = elements.messageList.scrollTop;

  await fetchMessages(state.activeGroupId);
  renderMessages({ scrollToBottom: false, preserveAnchor: { prevHeight, prevTop } });
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

  const created = await api('/groups', {
    method: 'POST',
    body: JSON.stringify({ name: trimmedName, description: description.trim(), members: [state.userName] })
  });
  const room = created && created.group ? created.group : created;

  state.groups.unshift(room);
  state.activeGroups = state.activeGroups.filter((group) => group._id !== room._id);
  elements.groupForm.reset();
  await switchRoom(room._id);
  renderGroups();
  renderActiveGroups();
}

async function deleteGroup(groupId) {
  const group = state.groups.find((g) => g._id === groupId);
  if (!group) return;

  const confirmed = window.confirm(`Delete the group "${group.name}" and all of its messages?`);
  if (!confirmed) return;

  await api('/groups/' + groupId, { method: 'DELETE' });

  state.groups = state.groups.filter((g) => g._id !== groupId);

  if (state.activeGroupId === groupId) {
    const next = state.groups[0]?._id || null;
    await switchRoom(next);
  }

  renderGroups();
}

async function leaveGroup(groupId) {
  const group = state.groups.find((g) => g._id === groupId);
  if (!group) return;

  const confirmedLeave = window.confirm(`Leave chat "${group.name}"?`);
  if (!confirmedLeave) return;

  try {
    await api('/groups/' + groupId + '/leave', { method: 'DELETE' });
  } catch (error) {
    // Owners cannot leave; allow optional delete as a fallback.
    if ((error.message || '').toLowerCase().includes('owners cannot leave')) {
      const confirmedDelete = window.confirm(
        'You are the owner of this group and cannot leave it. Delete this group instead?'
      );
      if (!confirmedDelete) return;
      await deleteGroup(groupId);
      return;
    }
    throw error;
  }

  state.groups = state.groups.filter((g) => g._id !== groupId);

  const ownerId = typeof group.owner === 'object' ? (group.owner._id || group.owner.id) : group.owner;
  const isPublicGroup = !(group.settings && group.settings.isPrivate);
  const ownedByCurrentUser = ownerId && currentUserId ? String(ownerId) === String(currentUserId) : false;
  if (isPublicGroup && !ownedByCurrentUser) {
    state.activeGroups.unshift(group);
    renderActiveGroups();
  }

  if (state.activeGroupId === groupId) {
    const next = state.groups[0]?._id || null;
    await switchRoom(next);
  }

  renderGroups();
}

async function joinActiveGroup(groupId) {
  const joined = await api('/groups/' + groupId + '/join', { method: 'POST' });
  const group = joined && joined.group ? joined.group : joined;

  if (!group || !group._id) {
    throw new Error('Invalid group response from server.');
  }

  state.activeGroups = state.activeGroups.filter((g) => g._id !== group._id);

  const exists = state.groups.some((g) => g._id === group._id);
  if (!exists) {
    state.groups.unshift(group);
  }

  renderActiveGroups();
  renderGroups();
  await switchRoom(group._id);
  showSuccessToast(`Joined ${group.name}`);
}

async function sendMessage(text) {
  const activeGroup = getActiveGroup();
  if (!activeGroup) {
    window.alert('Create or select a group first.');
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  const data = await api('/groups/' + activeGroup._id + '/messages', {
    method: 'POST',
    body: JSON.stringify({ content: trimmed })
  });

  const created = data && data.message ? data.message : null;
  if (created) {
    state.messages.push(created);
    renderMessages({ scrollToBottom: true });
  }

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

// --- DOM event listeners ---

elements.userNameInput.addEventListener('input', (event) => {
  state.userName = event.target.value.slice(0, 32) || 'Anonymous';
  saveState();
});

elements.groupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  createGroup(elements.groupNameInput.value, elements.groupDescriptionInput.value);
});

elements.deleteGroupButton?.addEventListener('click', () => {
  const activeGroup = getActiveGroup();
  if (activeGroup) {
    deleteGroup(activeGroup._id);
  }
});

elements.messageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(elements.messageInput.value).catch((error) => {
    window.alert(error.message || 'Failed to send message.');
  });
});

elements.messageInput.addEventListener('input', emitTyping);

elements.messageList.addEventListener('scroll', () => {
  if (elements.messageList.scrollTop <= 40) {
    loadOlderMessages();
  }
});

// --- Init ---

displayUserInfo();
elements.userNameInput.value = state.userName;
Promise.all([fetchRooms(), fetchActiveGroups()]).catch((error) => {
  window.alert(error.message || 'Failed to load groups.');
});
