import { InferSchemaType, Schema, model } from 'mongoose';

const insulinLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dose: { type: Number, required: true, min: 0 },
    insulinType: { type: String, enum: ['fast', 'slow'], required: true },
    loggedAt: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    source: { type: String, enum: ['manual'], default: 'manual' },
    idempotencyKey: { type: String },
  },
  { timestamps: true },
);

insulinLogSchema.index({ userId: 1, loggedAt: -1 });
insulinLogSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export type InsulinLogDoc = InferSchemaType<typeof insulinLogSchema>;
export const InsulinLog = model<InsulinLogDoc>('InsulinLog', insulinLogSchema);
