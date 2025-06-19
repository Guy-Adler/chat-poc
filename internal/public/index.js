import { chatList, messagesContainer } from './js/globals.js';
import { appendMessage } from './js/renderMessage.js';
import { socket } from './js/socket.js';

// Load available chats
async function loadChats() {
  try {
    const response = await fetch('/chats');
    const chats = await response.json();

    chatList.innerHTML = '';
    chats.forEach(({ id: chatId }) => {
      const chatElement = document.createElement('div');
      chatElement.className = 'chat-item';
      if (chatId === currentChatId) {
        chatElement.classList.add('active');
      }
      chatElement.onclick = () => selectChat(chatId);

      const chatContent = document.createElement('span');
      chatContent.textContent = `Chat ${chatId}`;

      chatElement.appendChild(chatContent);
      chatList.appendChild(chatElement);
    });
  } catch (error) {
    console.error('Failed to load chats:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadChats);

// Select a chat
function selectChat(chatId) {
  if (currentChatId !== null) {
    socket.emit('unsub', { id: currentChatId })
  }

  currentChatId = chatId;

  // Update UI
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.classList.add('active');

  // Subscribe to chat
  socket.emit('sub', { id: currentChatId })
}
