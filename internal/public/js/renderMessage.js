import { messagesContainer } from './globals.js';

/**
 * @param {{
 *  id: number,
 *  content: string,
 *  createdAt?: string,
 *  updatedAt: string | null,
 * }} message
 */
export function appendMessage(message) {
  // Check if message already exists
  let messageElement = messagesContainer.querySelector(`[data-message-id="${message.id}"]`);
  if (messageElement) {
    // Try to update content and timestamp
    let contentElement = messageElement.querySelector('.message-content');
    let timestampElement = messageElement.querySelector('.message-timestamp');

    contentElement.textContent = message.content;
    if (message.updatedAt) {
      const updatedAt = new Date(message.updatedAt);
      const timestampWithoutUpdatedAt = timestampElement.textContent.replace(/ \(edited .*\)/, '');
      timestampElement.textContent = `${timestampWithoutUpdatedAt} (edited ${updatedAt.toLocaleString()})`;
    }
    return;
  }

  messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.classList.add('sent');
  messageElement.dataset.messageId = message.id;

  const contentElement = document.createElement('div');
  contentElement.classList.add('message-content');
  contentElement.textContent = message.content;

  const timestampElement = document.createElement('div');
  timestampElement.classList.add('message-timestamp');
  const createdAt = new Date(message.createdAt);
  timestampElement.textContent = createdAt.toLocaleString();
  if (message.updatedAt) {
    const updatedAt = new Date(message.updatedAt);
    timestampElement.textContent += ` (edited ${updatedAt.toLocaleString()})`;
  }

  messageElement.appendChild(contentElement);
  messageElement.appendChild(timestampElement);
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}