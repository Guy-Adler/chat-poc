import 'dotenv/config';
import { Kafka } from 'kafkajs';
import { WebSocket } from 'ws';

const kafka = new Kafka({
  brokers: (process.env.KAFKA_BROKERS ?? '').split(','),
  clientId: 'synchronizer-1',
});
const producer = kafka.producer();

let closing = false;
let websocket: WebSocket;

function createWebSocket() {
  const ws = new WebSocket(process.env.WS_HOST!, {});

  ws.on('open', () => {
    console.log('Connected to websocket');

    ws.send(JSON.stringify({ type: 'sub' }));
  });

  ws.on('close', () => {
    if (!closing) {
      console.log('Disconnected from websocket, shutting down');
      process.kill(process.pid, 'SIGTERM');
    }
  });

  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());

    if (!['load', 'update'].includes(message.type)) {
      console.log('Received unknown message type', message.type);
      return;
    }

    const chatId = message.chatId;

    const messagesToSend: {
      id: number;
      chatId: number;
      content: string;
      isDeleted?: boolean;
      createdAt?: string;
      updatedAt: string | null;
    }[] = (message.messages as any[]).map((m: any) => ({
      id: m.id,
      createdAt: m.createdAt,
      content: m.content,
      updatedAt: m.updatedAt,
      chatId,
      isDeleted: false,
    }));

    await producer.send({
      topic: process.env.KAFKA_TOPIC!,
      messages: messagesToSend.map((m) => ({ value: JSON.stringify(m), key: m.chatId.toString() })),
    });
  });

  return ws;
}

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  if (websocket && websocket.readyState === WebSocket.OPEN) {
    console.log('Closing websocket connection...');
    await new Promise((resolve) => {
      closing = true;
      websocket.once('close', resolve);
      websocket.close();
    });
    console.log('Websocket connection closed.');
  }

  // Stop Kafka producer
  await producer.disconnect();

  console.log('Shutdown complete');
  process.exit(0);
});

async function main() {
  await producer.connect();
  websocket = createWebSocket();
  console.log('Waiting for messages from Kafka');
}

main();
