import { messagesContainer } from './globals.js';


/**
 * Start editing a message
 * 
 * @param {HTMLDivElement} messageElement 
 * @param {number} messageId 
 */
function startEditing(messageElement, messageId) {
  const contentElement = messageElement.querySelector('.message-content');
  const currentContent = contentElement.textContent;

  const editForm = document.createElement('form');
  editForm.classList.add('edit-form');

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.value = currentContent;
  editInput.classList.add('edit-input');

  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.textContent = 'Save';
  saveButton.classList.add('save-edit-btn');

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  cancelButton.classList.add('cancel-edit-btn');
  cancelButton.onclick = () => {
    messageElement.replaceChild(contentElement, editForm);
  };

  editForm.appendChild(editInput);
  editForm.appendChild(saveButton);
  editForm.appendChild(cancelButton);

  editForm.onsubmit = async (event) => {
    event.preventDefault();
    const newContent = editInput.value.trim();

    messageElement.replaceChild(contentElement, editForm);

    try {
      const response = await fetch(`/chat/${currentChatId}/message/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        console.error('Failed to update message');
      }
    } catch (error) {
      console.error('Failed to update message:', error);
    }
  };

  messageElement.replaceChild(editForm, contentElement);
  editInput.focus();
}

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

  const editButton = document.createElement('button');
  editButton.classList.add('edit-message-btn');
  editButton.innerHTML = '✎';
  editButton.onclick = () => startEditing(messageElement, message.id);

  messageElement.appendChild(contentElement);
  messageElement.appendChild(timestampElement);
  messageElement.appendChild(editButton);
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}