import { NextResponse } from 'next/server';

const TECHNOCORE_BASE = 'https://technocore.chat';
const ROOM_NAME = 'flop-tahmin-tr';

export async function GET() {
  try {
    const res = await fetch(`${TECHNOCORE_BASE}/r/${ROOM_NAME}`, {
      cache: 'no-store'
    });
    if (!res.ok) {
      return NextResponse.json({ messages: [] });
    }
    const text = await res.text();
    const lines = text.split('\n').filter(Boolean);
    return NextResponse.json({ lines });
  } catch (error) {
    return NextResponse.json({ lines: [], error: 'Technocore okuma hatası' });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { marketId, choice, amount, did } = body;

    const messagePayload = encodeURIComponent(
      JSON.stringify({ app: 'flop-market', m: marketId, c: choice, a: amount, t: Date.now() })
    );
    const sender = encodeURIComponent(did ? did.slice(0, 16) : 'anon-user');

    const targetUrl = `${TECHNOCORE_BASE}/r/${ROOM_NAME}/say/${sender}/${messagePayload}`;
    const technocoreRes = await fetch(targetUrl);
    
    return NextResponse.json({ success: technocoreRes.ok });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Oya ulaşılamadı' }, { status: 500 });
  }
}