import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from './shared/middlewares/errorHandler';
import { v1Routes } from './routes/v1';
import { AppError } from './shared/utils/apiError';

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1', v1Routes);

app.all('*', (req, res, next) => {
  next(new AppError(404, `Target securely missed: ${req.originalUrl}`));
});

app.use(globalErrorHandler);

export default app;
