import { appendMessage, displayMessages } from './renderMessage.js';

export const socket = io();

socket.on('load', (data) => {
  displayMessages(data);
});

socket.on('update', (data) => {
  appendMessage(data);
})

