import 'dotenv/config';
import { dataSource } from './db/dataSource';
import { shutdownKafka, startKafka } from './kafkaConsumer';
import { shutdownChatsKafka, startChatsKafka } from './chatsConsumer';

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Stop Kafka consumer
  await shutdownKafka();
  await shutdownChatsKafka();

  // Close database connection
  if (dataSource.isInitialized) {
    await dataSource.destroy();
    console.log('Database connection closed');
  }

  console.log('Shutdown complete');
  process.exit(0);
});

async function main() {
  await dataSource.initialize();
  await startKafka();
  await startChatsKafka();

  console.log(`Ready for Kafka messages`);
}

main();
