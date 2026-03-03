import { InferSchemaType, Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    diabetesType: {
      type: String,
      enum: ['type1', 'type2', 'gestational', 'other'],
      default: 'type1',
    },
    targetGlucoseMin: { type: Number, default: 80 },
    targetGlucoseMax: { type: Number, default: 140 },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model<UserDoc>('User', userSchema);
