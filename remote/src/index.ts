import 'dotenv/config';
import { server } from './api';
import { wss } from './websocket';
import { dataSource } from './db/dataSource';
import { ClientsManager } from './ws/ClientsManager';
import { initializeRoomsManager } from './ws/RoomsManager';

const PORT = process.env.PORT || 3000;

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Close all WebSocket connections
  ClientsManager.closeAll(1000, 'Server shutting down');

  // Close WebSocket server
  wss.close();

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

  await initializeRoomsManager();

  console.log(`Listening on port ${PORT}`);
});
