import { NextResponse } from 'next/server';
import { getSessionToken, deleteSession, clearSessionCookie } from '@/lib/auth';

export async function POST() {
  try {
    const token = await getSessionToken();
    if (token) {
      await deleteSession(token);
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
