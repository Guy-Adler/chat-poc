import 'dotenv/config';
import { dataSource } from './db/dataSource';
import { server } from './api';

const PORT = process.env.PORT || 4000;

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Close HTTP server
  server.closeAllConnections();
  await new Promise<void>((resolve) => {
    server.close(() => {
      console.log('HTTP server closed');
      resolve();
    });
  });

  // Close database connection
  if (dataSource.isInitialized) {
    await dataSource.destroy();
    console.log('Database connection closed');
  }

  console.log('Shutdown complete');
  process.exit(0);
});

server.listen(PORT, async () => {
  await dataSource.initialize();

  console.log(`Listening on port ${PORT}`);
});
