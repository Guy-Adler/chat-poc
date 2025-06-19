import 'dotenv/config';
import { dataSource } from './db/dataSource';
import { shutdownKafka, startKafka } from './kafkaConsumer';

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Stop Kafka consumer
  await shutdownKafka();

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

  console.log(`Ready for Kafka messages`);
}

main();
