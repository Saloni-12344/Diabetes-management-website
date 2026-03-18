import { InferSchemaType, Schema, model } from 'mongoose';

const advisoryAuditSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currentGlucose: { type: Number, required: true },
    mealCarbs: { type: Number, required: true },
    icr: { type: Number, required: true },
    isf: { type: Number, required: true },
    targetGlucose: { type: Number, required: true },
    iob: { type: Number, required: true },
    recommendedDose: { type: Number, required: true },
    disclaimerConfirmed: { type: Boolean, required: true },
    confirmedByUser: { type: Boolean, required: true },
  },
  { timestamps: true },
);

advisoryAuditSchema.index({ userId: 1, createdAt: -1 });

export type AdvisoryAuditDoc = InferSchemaType<typeof advisoryAuditSchema>;
export const AdvisoryAudit = model<AdvisoryAuditDoc>('AdvisoryAudit', advisoryAuditSchema);
