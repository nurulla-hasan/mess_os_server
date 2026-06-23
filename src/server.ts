import mongoose from 'mongoose';
import app from './app';
import { config } from './config';
import 'dotenv/config';

const PORT = config.port;
let server: ReturnType<typeof app.listen>;

async function main() {
  try {
    await mongoose.connect(config.db.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('📦 Database connected');

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting the server:', error);
    process.exit(1);
  }
}

const shutdown = (signal: string) => (error?: Error) => {
  console.log(`\n🔻 Received ${signal}. Shutting down...`);
  if (error) console.error(error);

  server?.close(async () => {
    await mongoose.disconnect();
    console.log('👋 Goodbye!');
    process.exit(error ? 1 : 0);
  });

  setTimeout(() => process.exit(1), 10_000);
};

main();

process.on('unhandledRejection', shutdown('unhandledRejection'));
process.on('uncaughtException', shutdown('uncaughtException'));
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
