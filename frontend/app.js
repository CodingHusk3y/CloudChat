const STORAGE_KEY = 'cloudchat.ui-state';

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
  messagesEmptyState: document.getElementById('messagesEmptyState')
};

const demoData = {
  userName: 'Avery',
  activeGroupId: 'product-team',
  groups: [
    {
      id: 'product-team',
      name: 'Product Team',
      description: 'Release planning, bugs, and launch updates.',
      createdAt: '2026-04-01T09:00:00.000Z',
      messages: [
        {
          id: 'm1',
          sender: 'Jordan',
          content: 'Shipped the first draft of the onboarding flow.',
          createdAt: '2026-04-09T08:20:00.000Z'
        },
        {
          id: 'm2',
          sender: 'Avery',
          content: 'Great. Let us review the edge cases before release.',
          createdAt: '2026-04-09T08:24:00.000Z'
        }
      ]
    },
    {
      id: 'design-sync',
      name: 'Design Sync',
      description: 'UI feedback, visual direction, and component reviews.',
      createdAt: '2026-04-04T10:30:00.000Z',
      messages: [
        {
          id: 'm3',
          sender: 'Mina',
          content: 'The new message cards need a stronger visual hierarchy.',
          createdAt: '2026-04-09T07:18:00.000Z'
        }
      ]
    }
  ]
};

const state = loadState();

function loadState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return structuredClone(demoData);
  }

  try {
    const parsedState = JSON.parse(savedState);
    return {
      userName: parsedState.userName || demoData.userName,
      activeGroupId: parsedState.activeGroupId || demoData.activeGroupId,
      groups: Array.isArray(parsedState.groups) && parsedState.groups.length ? parsedState.groups : structuredClone(demoData.groups)
    };
  } catch {
    return structuredClone(demoData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getActiveGroup() {
  return state.groups.find((group) => group.id === state.activeGroupId) || null;
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

function persistAndRender() {
  saveState();
  render();
}

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
    const messageCount = group.messages.length;
    const isActive = group.id === state.activeGroupId;
    const groupCard = document.createElement('div');
    groupCard.className = `group-card${isActive ? ' active' : ''}`;
    groupCard.tabIndex = 0;
    groupCard.setAttribute('role', 'button');
    groupCard.setAttribute('aria-pressed', String(isActive));
    groupCard.innerHTML = `
      <div class="group-card-top">
        <div>
          <h3>${group.name}</h3>
          <p class="group-description">${group.description || 'No description added yet.'}</p>
        </div>
        <span class="group-count">${messageCount} msg${messageCount === 1 ? '' : 's'}</span>
      </div>
      <div class="group-actions">
        <button class="ghost-button" type="button">Open room</button>
        <button class="icon-button" type="button">Delete</button>
      </div>
    `;

    groupCard.addEventListener('click', () => {
      state.activeGroupId = group.id;
      persistAndRender();
    });

    groupCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        state.activeGroupId = group.id;
        persistAndRender();
      }
    });

    const openButton = groupCard.querySelector('.ghost-button');
    const deleteButton = groupCard.querySelector('.icon-button');

    openButton.addEventListener('click', (event) => {
      event.stopPropagation();
      state.activeGroupId = group.id;
      persistAndRender();
    });

    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteGroup(group.id);
    });

    elements.groupList.appendChild(groupCard);
  }
}

function renderMessages() {
  const activeGroup = getActiveGroup();
  const hasMessages = Boolean(activeGroup && activeGroup.messages.length);

  elements.messagesEmptyState.style.display = hasMessages ? 'none' : 'grid';
  elements.messageList.innerHTML = '';

  if (!activeGroup) {
    elements.activeGroupTitle.textContent = 'No group selected';
    elements.activeGroupMeta.textContent = 'Create or select a group to begin.';
    elements.deleteGroupButton.disabled = true;
    return;
  }

  elements.activeGroupTitle.textContent = activeGroup.name;
  elements.activeGroupMeta.textContent = `${activeGroup.messages.length} message${activeGroup.messages.length === 1 ? '' : 's'} in this room`;
  elements.deleteGroupButton.disabled = false;

  if (!activeGroup.messages.length) {
    return;
  }

  for (const message of activeGroup.messages) {
    const messageCard = document.createElement('article');
    const isMine = message.sender.toLowerCase() === state.userName.toLowerCase();
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

    const deleteButton = messageCard.querySelector('.icon-button');
    deleteButton.addEventListener('click', () => {
      deleteMessage(activeGroup.id, message.id);
    });

    elements.messageList.appendChild(messageCard);
  }
}

function render() {
  elements.userNameInput.value = state.userName;
  renderGroups();
  renderMessages();
}

function createGroup(name, description) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    return;
  }

  const duplicateExists = state.groups.some((group) => group.name.toLowerCase() === normalizedName.toLowerCase());
  if (duplicateExists) {
    window.alert('That group name already exists.');
    return;
  }

  const newGroup = {
    id: generateId('group'),
    name: normalizedName,
    description: description.trim(),
    createdAt: new Date().toISOString(),
    messages: []
  };

  state.groups.unshift(newGroup);
  state.activeGroupId = newGroup.id;
  elements.groupForm.reset();
  persistAndRender();
}

function deleteGroup(groupId) {
  const group = state.groups.find((entry) => entry.id === groupId);
  if (!group) {
    return;
  }

  const confirmed = window.confirm(`Delete the group "${group.name}" and all of its messages?`);
  if (!confirmed) {
    return;
  }

  state.groups = state.groups.filter((entry) => entry.id !== groupId);

  if (state.activeGroupId === groupId) {
    state.activeGroupId = state.groups[0]?.id || null;
  }

  persistAndRender();
}

function sendMessage(text) {
  const activeGroup = getActiveGroup();

  if (!activeGroup) {
    window.alert('Create or select a group first.');
    return;
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    return;
  }

  activeGroup.messages.push({
    id: generateId('message'),
    sender: state.userName.trim() || 'Anonymous',
    content: trimmedText,
    createdAt: new Date().toISOString()
  });

  elements.messageForm.reset();
  persistAndRender();

  requestAnimationFrame(() => {
    elements.messageList.scrollTop = elements.messageList.scrollHeight;
  });
}

function deleteMessage(groupId, messageId) {
  const group = state.groups.find((entry) => entry.id === groupId);
  if (!group) {
    return;
  }

  group.messages = group.messages.filter((message) => message.id !== messageId);
  persistAndRender();
}

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
    deleteGroup(activeGroup.id);
  }
});

elements.messageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(elements.messageInput.value);
});

render();
