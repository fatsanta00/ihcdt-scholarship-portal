import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-production';
const encodedKey = new TextEncoder().encode(secretKey);

export async function signToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(encodedKey);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin_token')?.value;
  if (!sessionToken) return null;
  return await verifyToken(sessionToken);
}
