import 'dotenv/config';
import { Kafka } from 'kafkajs';
import { WebSocket } from 'ws';
import { RedisLeaderElector } from './elections/RedisLeaderElector';

const leaderElector = RedisLeaderElector.getInstance();

leaderElector.on('gained', () => {
  console.log('🔒✅ Gained lock');
});

leaderElector.on('extended', () => {
  console.log('🔒🔄 Extended lock');
});

leaderElector.on('lost', () => {
  console.log('🔒❌ Lost lock');
});

const kafka = new Kafka({
  brokers: (process.env.KAFKA_BROKERS ?? '').split(','),
  clientId: process.env.KAFKA_CLIENT_ID,
});
const producer = kafka.producer();

async function handleChat(message: any) {
  if (!leaderElector.isLeader) {
    console.log('[chat synchronizer] Not leader, skipping sending messags');
    return;
  }
  const { chatId } = message;

  await producer.send({
    topic: process.env.KAFKA_CHAT_TOPIC!,
    messages: [
      {
        value: JSON.stringify({
          type: message.type === 'delete' ? 'delete' : 'new',
          id: chatId,
        }),
      },
    ],
  });
}

let closing = false;
let websocket: WebSocket;

/**
 * Creates and manages the WebSocket connection to the chat server.
 * Handles incoming messages and forwards them to Kafka.
 * @returns {WebSocket} The created WebSocket instance.
 */
function createWebSocket() {
  const ws = new WebSocket(process.env.WS_HOST!, {});

  ws.on('open', () => {
    console.log('[synchronizer] Connected to websocket');
    ws.send(JSON.stringify({ type: 'sub' }));
  });

  ws.on('close', () => {
    if (!closing) {
      console.log('[synchronizer] Disconnected from websocket, shutting down');
      process.kill(process.pid, 'SIGTERM');
    }
  });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (['newChat', 'delete'].includes(message.type)) {
        await handleChat(message);
        return;
      }

      if (!['load', 'update'].includes(message.type)) {
        console.log('[synchronizer] Received unknown message type', message.type);
        return;
      }
      const chatId = message.chatId;
      const messagesToSend = (message.messages as any[]).map((m: any) => ({
        key: chatId,
        value: JSON.stringify({
          id: m.id,
          createdAt: m.createdAt,
          content: m.content,
          updatedAt: m.updatedAt,
          chatId,
          isDeleted: false,
        }),
      }));

      if (leaderElector.isLeader) {
        console.log(
          `[synchronizer] Forwarding ${messagesToSend.length} messages for chatId=${chatId} to Kafka`
        );
        await producer.send({
          topic: process.env.KAFKA_TOPIC!,
          messages: messagesToSend,
        });
      } else {
        console.log('[synchronizer] Not leader, skipping sending messags');
      }
    } catch (err) {
      console.error('[synchronizer] Error handling websocket message:', err);
    }
  });

  return ws;
}

process.on('SIGTERM', async () => {
  console.log('[synchronizer] Shutting down gracefully...');
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    console.log('[synchronizer] Closing websocket connection...');
    await new Promise((resolve) => {
      closing = true;
      websocket.once('close', resolve);
      websocket.close();
    });
    console.log('[synchronizer] Websocket connection closed.');
  }
  await leaderElector.stop();
  // Stop Kafka producer
  await producer.disconnect();
  console.log('[synchronizer] Shutdown complete');
  process.exit(0);
});

/**
 * Main entry point for the synchronizer service.
 * Connects the Kafka producer and establishes the websocket connection.
 */
async function main() {
  leaderElector.start();
  await producer.connect();
  websocket = createWebSocket();
  console.log('[synchronizer] Waiting for messages from Kafka');
}

main();
