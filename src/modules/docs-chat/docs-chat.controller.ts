import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import { chatWithAssistant } from './docs-chat.service';

export const chat = catchAsync(async (req: Request, res: Response) => {
  const { question, context } = req.body;
  const answer = await chatWithAssistant(question, context);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Response generated',
    data: { answer },
  });
});
