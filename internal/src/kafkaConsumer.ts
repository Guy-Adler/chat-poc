import { Kafka } from 'kafkajs';
import { sendUpdate } from './socket';
import type { KafkaMessage } from './types';
import { updateMessageInCache } from './redis/updateCache';

const kafka = new Kafka({
  brokers: (process.env.KAFKA_BROKERS ?? '').split(','),
  clientId: process.env.KAFKA_CLIENT_ID!,
});
const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID!,
});

export async function startKafka() {
  await consumer.connect();
  await consumer.subscribe({ topic: process.env.KAFKA_TOPIC!, fromBeginning: true });

  await consumer.run({
    async eachMessage({ message }) {
      if (!message.value) return;
      console.log(`Received message (${message.value.toString()})`);
      try {
        const kafkaMessage: KafkaMessage = JSON.parse(message.value.toString());

        await updateMessageInCache(kafkaMessage);

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
