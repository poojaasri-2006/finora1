import { NextResponse } from 'next/server';
import { GET as getDashboard } from '../dashboard/route';

export async function GET() {
  const response = await getDashboard();
  if (!response.ok) return response;
  const data = await response.json();
  return NextResponse.json({ alerts: data.alerts });
}
