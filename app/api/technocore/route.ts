import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://technocore.chat/r/turkce-koprusu', {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KriptoEscobarMarket/1.0)'
      }
    });
    if (!res.ok) throw new Error('Odaya erisilemedi');
    const text = await res.text();
    return new NextResponse(text, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
