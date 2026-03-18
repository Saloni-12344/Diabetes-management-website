import { InferSchemaType, Schema, model } from 'mongoose';

const glucoseLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    value: { type: Number, required: true, min: 1 },
    unit: { type: String, enum: ['mg/dL', 'mmol/L'], default: 'mg/dL' },
    loggedAt: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    source: { type: String, enum: ['manual'], default: 'manual' },
  },
  { timestamps: true },
);

glucoseLogSchema.index({ userId: 1, loggedAt: -1 });

export type GlucoseLogDoc = InferSchemaType<typeof glucoseLogSchema>;
export const GlucoseLog = model<GlucoseLogDoc>('GlucoseLog', glucoseLogSchema);
