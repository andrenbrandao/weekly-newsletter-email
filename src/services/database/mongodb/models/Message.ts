import { Model, Schema, Document, model } from 'mongoose';
import { Message } from '@shared/interfaces';

export interface IMessageModel extends Message, Document {
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    userEmail: {
      type: String,
      required: true,
      immutable: true,
    },
    externalId: {
      type: String,
      required: true,
      index: true,
      unique: true,
      immutable: true,
    },
    historyId: { type: String },
    labelIds: { type: [String] },
    raw: { type: String, required: true },
    sizeEstimate: { type: Number },
    snippet: { type: String },
    threadId: { type: String },
    receivedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

MessageSchema.index({ userEmail: 1, receivedAt: 1 });

const Message: Model<IMessageModel> = model('Message', MessageSchema);

export default Message;
