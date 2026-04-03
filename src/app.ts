import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from './shared/middlewares/errorHandler';
import { v1Routes } from './routes/v1';
import { AppError } from './shared/utils/apiError';
import { config } from './config';

const app = express();

const corsOptions = {
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1', v1Routes);

app.use('/', (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Hello from MessManagerOS API!',
  });
});

app.all('*', (req, res, next) => {
  next(new AppError(404, `Target securely missed: ${req.originalUrl}`));
});

app.use(globalErrorHandler);

export default app;
