import mongoose from 'mongoose';
import app from './app';
import { config } from './config';

let server: any;

async function bootstrap() {
  try {
    await mongoose.connect(config.db.uri);
    console.log(`Database stably linked gracefully connecting internally`);

    server = app.listen(config.port, () => {
      console.log(`Server actively running bound fully onto port ${config.port}`);
    });
  } catch (error) {
    console.error(`Server abruptly crashed natively triggering termination`);
    process.exit(1);
  }
}

bootstrap();

process.on('unhandledRejection', (error) => {
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  process.exit(1);
});
