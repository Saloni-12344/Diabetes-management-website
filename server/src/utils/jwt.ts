import jwt, { type SignOptions } from 'jsonwebtoken';

export type AuthTokenPayload = {
  userId: string;
  email: string;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is missing');
  }
  return secret;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, getJwtSecret(), options);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret());
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  return {
    userId: String(decoded.userId),
    email: String(decoded.email),
  };
}
