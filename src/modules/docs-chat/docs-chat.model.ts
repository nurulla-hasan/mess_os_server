import { Schema, model, Document } from 'mongoose';

export interface IChatMessage extends Document {
  sessionId: string;
  question: string;
  answer: string;
  context?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    sessionId: { type: String, required: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    context: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export const ChatMessage = model<IChatMessage>('ChatMessage', chatMessageSchema);
