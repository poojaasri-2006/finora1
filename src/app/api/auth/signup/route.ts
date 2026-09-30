import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  organizationName: z.string().min(1),
  baseCurrency: z.string().default('USD'),
  currentCashCents: z.number().int().default(0),
  minimumCashReserveCents: z.number().int().default(0),
  defaultProjectionPeriod: z.string().default('MONTHLY'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = signupSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user, organization, and membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          emailVerified: true, // Development mode — skip email verification
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          baseCurrency: data.baseCurrency,
          currentCashCents: data.currentCashCents,
          minimumCashReserveCents: data.minimumCashReserveCents,
          defaultProjectionPeriod: data.defaultProjectionPeriod,
          onboardingCompleted: true,
        },
      });

      await tx.organizationMembership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      return { user, organization };
    });

    // Create session
    const token = await createSession(result.user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 },
    );
  }
}
