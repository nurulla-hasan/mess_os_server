import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import { chatWithAssistant, getChatHistory, deleteChatHistory } from './docs-chat.service';

export const chat = catchAsync(async (req: Request, res: Response) => {
  const { question, context, sessionId } = req.body;
  const userAgent = req.headers['user-agent'];
  const userId = req.user?.userId;
  const result = await chatWithAssistant(question, context, sessionId, userAgent, userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Response generated',
    data: { answer: result.answer, sessionId: result.sessionId },
  });
});

export const getHistory = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.query as { sessionId: string };
  const userId = req.user?.userId;
  const history = await getChatHistory(sessionId, userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Chat history fetched',
    data: history,
  });
});

export const deleteHistory = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.query as { sessionId: string };
  const userId = req.user?.userId;
  await deleteChatHistory(sessionId, userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Chat history deleted',
  });
});
