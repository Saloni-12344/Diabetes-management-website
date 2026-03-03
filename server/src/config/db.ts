import mongoose from 'mongoose';

export async function connectDb(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is missing');
  }

  await mongoose.connect(uri);
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
