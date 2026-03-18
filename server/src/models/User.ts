import { InferSchemaType, Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'viewer'], required: true, default: 'owner' },
    diabetesType: {
      type: String,
      enum: ['type1', 'type2', 'gestational', 'other'],
      default: 'type1',
    },
    targetGlucoseMin: { type: Number, default: 70 },
    targetGlucoseMax: { type: Number, default: 180 },
    doctorSettings: {
      icr: { type: Number, default: 10 },
      isf: { type: Number, default: 50 },
      targetGlucose: { type: Number, default: 110 },
      maxDosePerMeal: { type: Number, default: 15 },
    },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model<UserDoc>('User', userSchema);
