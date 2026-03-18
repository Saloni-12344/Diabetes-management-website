import { InferSchemaType, Schema, model } from 'mongoose';

const reminderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['post_meal_walk', 'no_glucose_logged', 'iob_expiry'], required: true },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'sent', 'cancelled'], default: 'pending' },
    relatedLogId: { type: Schema.Types.ObjectId },
    jobId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

reminderSchema.index({ userId: 1, status: 1, scheduledAt: 1 });
reminderSchema.index({ jobId: 1 }, { unique: true, sparse: true });

export type ReminderDoc = InferSchemaType<typeof reminderSchema>;
export const Reminder = model<ReminderDoc>('Reminder', reminderSchema);
