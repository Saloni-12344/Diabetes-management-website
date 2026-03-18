import { InferSchemaType, Schema, model } from 'mongoose';

const mealLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mealName: { type: String, required: true, trim: true },
    foodLibraryId: { type: Schema.Types.ObjectId, ref: 'FoodLibrary' },
    grams: { type: Number, required: true, min: 1 },
    calories: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    isCooked: { type: Boolean, required: true, default: true },
    loggedAt: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    source: { type: String, enum: ['manual', 'ai', 'library'], default: 'manual' },
  },
  { timestamps: true },
);

mealLogSchema.index({ userId: 1, loggedAt: -1 });
mealLogSchema.index({ foodLibraryId: 1 });

export type MealLogDoc = InferSchemaType<typeof mealLogSchema>;
export const MealLog = model<MealLogDoc>('MealLog', mealLogSchema);
