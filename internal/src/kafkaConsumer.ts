import { Kafka } from 'kafkajs';
import { sendUpdate } from './socket';

const kafka = new Kafka({
  brokers: (process.env.KAFKA_BROKERS ?? '').split(','),
  clientId: 'internal-1',
});
const consumer = kafka.consumer({
  groupId: `internal-${Date.now()}`,
});

export async function startKafka() {
  await consumer.connect();
  await consumer.subscribe({ topic: process.env.KAFKA_TOPIC!, fromBeginning: true });

  await consumer.run({
    async eachMessage({ message }) {
      if (!message.value) return;
      console.log(`Received message (${message.value.toString()})`);
      try {
        const kafkaMessage: {
          id: number;
          chatId: number;
          content: string;
          isDeleted?: boolean;
          createdAt?: string;
          updatedAt: string | null;
        } = JSON.parse(message.value.toString());

        sendUpdate(kafkaMessage.chatId, kafkaMessage);
      } catch {
        console.error('Failed to handle message!');
      }
    },
  });
}

export async function shutdownKafka() {
  await consumer.disconnect();
}
