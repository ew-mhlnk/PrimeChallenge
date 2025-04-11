import { NextResponse } from 'next/server';

const tournaments = [
  { id: 1, name: 'Monte Carlo 2025', date: '6-14 апреля', active: true },
  { id: 2, name: 'Brisbane 2025', date: '1-8 января', active: false },
];

export async function GET() {
  return NextResponse.json(tournaments);
}