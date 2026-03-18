import { InferSchemaType, Schema, model } from 'mongoose';

const alertSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['post_meal_walk', 'high_carb_low_protein', 'pattern', 'critical_glucose'],
      required: true,
    },
    message: { type: String, required: true },
    relatedLogId: { type: Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false },
    triggeredAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

alertSchema.index({ userId: 1, triggeredAt: -1, isRead: 1 });

export type AlertDoc = InferSchemaType<typeof alertSchema>;
export const Alert = model<AlertDoc>('Alert', alertSchema);
