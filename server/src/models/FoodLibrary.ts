import { InferSchemaType, Schema, model } from 'mongoose';

const foodLibrarySchema = new Schema(
  {
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    familyOwnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dishName: { type: String, required: true, trim: true },
    gramsPerServing: { type: Number, required: true, min: 1 },
    calories: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    isCooked: { type: Boolean, required: true, default: true },
    photoUrl: { type: String, trim: true },
    isConfirmed: { type: Boolean, default: true },
  },
  { timestamps: true },
);

foodLibrarySchema.index({ familyOwnerId: 1, dishName: 1 }, { unique: true });

export type FoodLibraryDoc = InferSchemaType<typeof foodLibrarySchema>;
export const FoodLibrary = model<FoodLibraryDoc>('FoodLibrary', foodLibrarySchema);
