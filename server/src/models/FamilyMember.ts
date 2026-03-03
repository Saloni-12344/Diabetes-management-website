import { InferSchemaType, Schema, model, Types } from 'mongoose';

const familyMemberSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'viewer'], required: true, default: 'viewer' },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['invited', 'accepted'], default: 'invited' },
  },
  { timestamps: true },
);

familyMemberSchema.index({ ownerUserId: 1, memberUserId: 1 }, { unique: true });

export type FamilyMemberDoc = InferSchemaType<typeof familyMemberSchema> & {
  ownerUserId: Types.ObjectId;
  memberUserId: Types.ObjectId;
};

export const FamilyMember = model<FamilyMemberDoc>('FamilyMember', familyMemberSchema);
