import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    // Verify password
    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    // Check if user has an organization
    const membership = user.memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'No organization associated with this account' },
        { status: 403 },
      );
    }

    // Create session
    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      organization: {
        id: membership.organizationId,
        name: membership.organization.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 },
    );
  }
}
