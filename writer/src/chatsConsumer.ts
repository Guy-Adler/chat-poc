import { Kafka } from 'kafkajs';
import type { KafkaMessage } from './types';
import { saveChat } from './saveChat';

const kafka = new Kafka({
  brokers: (process.env.KAFKA_BROKERS ?? '').split(','),
  clientId: process.env.KAFKA_CLIENT_ID!,
});
const consumer = kafka.consumer({
  groupId: process.env.KAFKA_CHATS_GROUP_ID!,
});

export async function startChatsKafka() {
  await consumer.connect();
  await consumer.subscribe({ topic: process.env.KAFKA_CHAT_TOPIC!, fromBeginning: true });

  await consumer.run({
    async eachMessage({ message }) {
      if (!message.value) return;
      console.log(`Received message (${message.value.toString()})`);
      try {
        const kafkaMessage: { type: 'delete' | 'new'; id: string } = JSON.parse(
          message.value.toString()
        );

        await saveChat(kafkaMessage);
      } catch {
        console.error('Failed to handle message!');
      }
    },
  });
}

export async function shutdownChatsKafka() {
  await consumer.disconnect();
}
