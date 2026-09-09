import { NextResponse } from 'next/server';

const TECHNOCORE_BASE = 'https://technocore.chat';
const ROOM_NAME = 'flop-tahmin-tr';

// Odayı oku (GET)
export async function GET() {
  try {
    const res = await fetch(`${TECHNOCORE_BASE}/r/${ROOM_NAME}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EscobarFlopMarket/1.0)'
      }
    });
    if (!res.ok) {
      return NextResponse.json({ lines: [] });
    }
    const text = await res.text();
    const lines = text.split('\n').filter(Boolean);
    return NextResponse.json({ lines });
  } catch (error) {
    return NextResponse.json({ lines: [], error: 'Technocore okuma hatası' }, { status: 500 });
  }
}

// Odaya oy kaydet (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { marketId, choice, amount, did } = body;

    // 1. Nick temizleme: Özel karakterleri (: / .) atıp sadece harf-rakam bırakıyoruz
    const cleanNick = (did || 'escobar')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-10); // Son 10 karakter
    const sender = `user_${cleanNick}`;

    // 2. Mesaj metni
    const voteText = `[TAHMIN] Pazar:${marketId} | Karar:${choice} | Miktar:${amount} kESCOBAR | DID:${did}`;
    const encodedPayload = encodeURIComponent(voteText);

    // 3. Technocore'a ilet
    const targetUrl = `${TECHNOCORE_BASE}/r/${ROOM_NAME}/say/${sender}/${encodedPayload}`;
    
    const technocoreRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EscobarFlopMarket/1.0)'
      }
    });

    const responseText = await technocoreRes.text();
    console.log('Technocore yanıtı:', responseText);

    if (!technocoreRes.ok) {
      return NextResponse.json({ success: false, error: responseText }, { status: technocoreRes.status });
    }

    return NextResponse.json({ success: true, response: responseText });
  } catch (error: any) {
    console.error('Technocore yazma hatası:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
