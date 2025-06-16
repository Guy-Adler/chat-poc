let currentChatId = null;
const ws = new WebSocket(`ws://${window.location.host}/ws`);

// DOM Elements
const chatList = document.getElementById('chatList');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const newChatBtn = document.getElementById('newChatBtn');

// WebSocket event handlers
ws.onopen = () => {
  console.log('Connected to WebSocket');
  loadChats();
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'load':
      displayMessages(data.messages);
      break;
    case 'update':
      if (data.chatId === currentChatId) {
        data.messages.forEach((message) => appendMessage(message));
      }
      break;
  }
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket');
};

// Load available chats
async function loadChats() {
  try {
    const response = await fetch('/chats');
    const chats = await response.json();

    chatList.innerHTML = '';
    chats.forEach(chatId => {
      const chatElement = document.createElement('div');
      chatElement.className = 'chat-item';
      if (chatId === currentChatId) {
        chatElement.classList.add('active');
      }
      chatElement.onclick = () => selectChat(chatId);

      const chatContent = document.createElement('span');
      chatContent.textContent = `Chat ${chatId}`;

      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-chat-btn';
      deleteButton.innerHTML = '×';
      deleteButton.onclick = (e) => {
        e.stopPropagation();
        deleteChat(chatId);
      };

      chatElement.appendChild(chatContent);
      chatElement.appendChild(deleteButton);
      chatList.appendChild(chatElement);
    });
  } catch (error) {
    console.error('Failed to load chats:', error);
  }
}

// Select a chat
function selectChat(chatId) {
  if (currentChatId !== null) {
    ws.send(JSON.stringify({ type: 'unsub', id: currentChatId }));
  }

  currentChatId = chatId;

  // Update UI
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.classList.add('active');

  // Subscribe to chat
  ws.send(JSON.stringify({ type: 'sub', id: chatId }));
}

// Display messages
function displayMessages(messages) {
  messagesContainer.innerHTML = '';
  messages.forEach(message => appendMessage(message));
}

// Append a single message
function appendMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.classList.add('sent');
  messageElement.textContent = message.content;
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send a message
messageForm.onsubmit = async (event) => {
  event.preventDefault();

  if (!currentChatId) {
    alert('Please select a chat first');
    return;
  }

  const content = messageInput.value.trim();
  if (!content) return;

  try {
    const response = await fetch(`/chat/${currentChatId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      messageInput.value = '';
    } else {
      console.error('Failed to send message');
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};

// Create a new chat
newChatBtn.onclick = async () => {
  try {
    const response = await fetch('/chats', {
      method: 'POST',
    });

    if (response.ok) {
      loadChats();
    } else {
      console.error('Failed to create new chat');
    }
  } catch (error) {
    console.error('Failed to create new chat:', error);
  }
};

// Add delete chat function
async function deleteChat(chatId) {
  if (!confirm('Are you sure you want to delete this chat?')) {
    return;
  }

  try {
    const response = await fetch(`/chat/${chatId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      if (currentChatId === chatId) {
        currentChatId = null;
        messagesContainer.innerHTML = '<p class="no-messages">Select a chat to continue</p>';
      }
      loadChats();
    } else {
      console.error('Failed to delete chat');
    }
  } catch (error) {
    console.error('Failed to delete chat:', error);
  }
}
