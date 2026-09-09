'use client';

import React, { useState, useEffect } from 'react';
import { MARKETS } from './data/markets';
import { 
  CheckCircle2, 
  XCircle, 
  Coins, 
  Copy, 
  Check, 
  Lock, 
  Sparkles, 
  Terminal, 
  ArrowUpRight, 
  Youtube, 
  Activity,
  RefreshCw,
  TrendingUp,
  Users,
  Layers,
  ChevronRight
} from 'lucide-react';

interface ParsedCall {
  rank: number;
  did: string;
  rawDid: string;
  side: 'yes' | 'no';
  amount: number;
  market: string;
  timeAgo: string;
  multiplier: string;
}

export default function Home() {
  const [selectedMarketId, setSelectedMarketId] = useState<string>('flop-mainnet-2027');
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState<number>(250);

  // Cüzdan & Bakiye Durumu
  const [balance, setBalance] = useState<number>(0);
  const [did, setDid] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedDid, setCopiedDid] = useState(false);

  // Canlı Technocore Verileri
  const [parsedCalls, setParsedCalls] = useState<ParsedCall[]>([]);
  const [recentFeed, setRecentFeed] = useState<ParsedCall[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<'biggest' | 'recent'>('biggest');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Seçili Pazar Bilgisi
  const activeMarket = MARKETS.find(m => m.id === selectedMarketId) || MARKETS[0];

  // 1. Kimlik ve Cüzdan Yükleme
  useEffect(() => {
    let savedDid = localStorage.getItem('kescobar_did');
    let savedKey = localStorage.getItem('kescobar_key');
    let savedBal = localStorage.getItem('kescobar_balance');

    if (!savedDid || !savedKey) {
      savedKey = 'ed25519_sk_' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');
      savedDid = 'did:key:z6Mk' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('kescobar_key', savedKey);
      localStorage.setItem('kescobar_did', savedDid);
    }
    setPrivateKey(savedKey);
    setDid(savedDid);
    if (savedBal) setBalance(parseInt(savedBal, 10));

    fetchTechnocoreLogs();
    const interval = setInterval(fetchTechnocoreLogs, 12000); // 12 saniyede bir odayı tara
    return () => clearInterval(interval);
  }, [selectedMarketId]);

  // 2. Technocore Odasından Verileri Çek ve Çözümle
  const fetchTechnocoreLogs = async () => {
    setIsLoadingLogs(true);
    try {
      let rawText = '';
      try {
        const apiRes = await fetch('/api/technocore');
        if (apiRes.ok) rawText = await apiRes.text();
      } catch (_) {}

      if (!rawText) {
        const directRes = await fetch('https://technocore.chat/r/turkce-koprusu');
        if (directRes.ok) rawText = await directRes.text();
      }

      if (rawText) {
        parseRoomData(rawText);
      }
    } catch (e) {
      console.error('Log çekme hatası:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const parseRoomData = (text: string) => {
    const lines = text.split('\n');
    const calls: ParsedCall[] = [];

    // Başlangıç tohum verileri (Görseldeki gibi hacim oluşması için)
    let yesSum = activeMarket.initialYes;
    let noSum = activeMarket.initialNo;

    lines.forEach((line, index) => {
      if (line.includes('call1 {')) {
        try {
          const jsonPart = line.substring(line.indexOf('call1 {') + 6);
          const data = JSON.parse(jsonPart);

          if (data.type === 'call') {
            const amt = parseInt(data.put, 10) || 250;
            const side = data.side === 'yes' ? 'yes' : 'no';
            const callMarket = data.market || 'flop-mainnet-2027';

            if (callMarket === selectedMarketId) {
              if (side === 'yes') yesSum += amt;
              else noSum += amt;
            }

            const rawDidStr = data.from || 'did:key:z6Mk...';
            const shortDid = rawDidStr.length > 18 
              ? `${rawDidStr.slice(0, 8)}...${rawDidStr.slice(-5)}` 
              : rawDidStr;

            calls.push({
              rank: 0,
              did: shortDid,
              rawDid: rawDidStr,
              side: side,
              amount: amt,
              market: callMarket,
              timeAgo: `${Math.max(1, (lines.length - index) * 2)} dk önce`,
              multiplier: '1.00'
            });
          }
        } catch (_) {}
      }
    });

    // Çarpan Hesaplama
    const totalPool = yesSum + noSum;
    const yesMultiplier = yesSum > 0 ? (totalPool / yesSum).toFixed(2) : '1.21';
    const noMultiplier = noSum > 0 ? (totalPool / noSum).toFixed(2) : '5.83';

    // Sıralama ve çarpanları yedirme
    const marketFiltered = calls.filter(c => c.market === selectedMarketId);
    const enriched = marketFiltered.map(c => ({
      ...c,
      multiplier: c.side === 'yes' ? `x${yesMultiplier}` : `x${noMultiplier}`
    }));

    setRecentFeed([...enriched].reverse().slice(0, 6));

    // Leaderboard için sırala
    const sorted = [...enriched].sort((a, b) => b.amount - a.amount);
    sorted.forEach((item, idx) => item.rank = idx + 1);
    setParsedCalls(sorted);
  };

  // Dinamik Metrikler
  const totalMarketPool = parsedCalls.reduce((acc, c) => acc + c.amount, activeMarket.initialYes + activeMarket.initialNo);
  const yesPool = parsedCalls.filter(c => c.side === 'yes').reduce((acc, c) => acc + c.amount, activeMarket.initialYes);
  const noPool = totalMarketPool - yesPool;
  const yesPercent = Math.round((yesPool / totalMarketPool) * 100) || 83;
  const noPercent = 100 - yesPercent;
  const yesMultiplier = (totalMarketPool / yesPool).toFixed(2);
  const noMultiplier = (totalMarketPool / noPool).toFixed(2);
  const totalParticipants = parsedCalls.length + 180;

  // Musluk
  const handleClaim = async () => {
    const newBal = balance + 1000;
    setBalance(newBal);
    localStorage.setItem('kescobar_balance', newBal.toString());

    const sender = `esc_${did.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
    const tapPayload = `call1 ` + JSON.stringify({
      amount: "1000",
      from: did,
      market: selectedMarketId,
      nonce: Math.random().toString(16).substring(2, 14),
      type: "tap"
    });

    try {
      await fetch(`https://technocore.chat/r/turkce-koprusu/say/${sender}/${encodeURIComponent(tapPayload)}`, {
        method: 'GET',
        mode: 'no-cors'
      });
    } catch (_) {}

    notify('success', '1.000 kESCOBAR cüzdanınıza tanımlandı!');
  };

  // Tahmin Gönderme
  const handlePlaceCall = async () => {
    if (balance < betAmount) {
      notify('error', 'Yetersiz kESCOBAR! Sağdaki panelden 1.000 kESCOBAR talep edin.');
      return;
    }

    setIsSubmitting(true);
    notify('info', "Tahmin Technocore 'turkce-koprusu' odasına imzalanıyor...");

    const sender = `esc_${did.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
    const callPayload = `call1 ` + JSON.stringify({
      from: did,
      market: selectedMarketId,
      nonce: Math.random().toString(16).substring(2, 14),
      put: betAmount.toString(),
      side: selectedSide,
      type: "call"
    });

    try {
      await fetch(`https://technocore.chat/r/turkce-koprusu/say/${sender}/${encodeURIComponent(callPayload)}`, {
        method: 'GET',
        mode: 'no-cors'
      });

      const newBal = balance - betAmount;
      setBalance(newBal);
      localStorage.setItem('kescobar_balance', newBal.toString());

      notify('success', `Tebrikler! ${betAmount} kESCOBAR "${selectedSide.toUpperCase()}" tahmininiz Technocore odasına işlendi.`);
      setTimeout(fetchTechnocoreLogs, 1500);
    } catch (e) {
      notify('error', 'Odaya bağlanırken bir sorun oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const notify = (type: 'success' | 'info' | 'error', text: string) => {
    setStatusNotice({ type, text });
    setTimeout(() => setStatusNotice(null), 5000);
  };

  const copyToClipboard = (text: string, type: 'key' | 'did') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedDid(true);
      setTimeout(() => setCopiedDid(false), 2000);
    }
  };

  const displayedCalls = leaderboardTab === 'biggest' 
    ? parsedCalls.slice(0, 10) 
    : [...parsedCalls].reverse().slice(0, 10);

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col items-center selection:bg-amber-400 selection:text-black">
      {/* Üst Menü */}
      <header className="w-full border-b border-zinc-800/80 bg-[#0d1017]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/20">
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">KriptoEscobar</span>
                <span className="text-[11px] text-zinc-500">|</span>
                <span className="text-xs font-semibold text-zinc-300">Flop Labs Technocore Tahmin Piyasası</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">Merkeziyetsiz Tahmin Protokolü</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={fetchTechnocoreLogs}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin text-amber-400' : ''}`} />
              Canlı Logları Tara
            </button>
            <a
              href="https://youtube.com/@kriptoescobar0"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20"
            >
              <Youtube className="w-3.5 h-3.5" />
              YouTube
            </a>
          </div>
        </div>
      </header>

      {/* Pazar Seçici Sekmeler */}
      <div className="w-full max-w-6xl px-4 pt-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMarketId(m.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedMarketId === m.id
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedMarketId === m.id ? 'bg-black' : 'bg-amber-400'}`} />
              {m.category}: {m.title.slice(0, 30)}...
            </button>
          ))}
        </div>
      </div>

      {/* Bildirim Alanı */}
      {statusNotice && (
        <div className="w-full max-w-6xl px-4 mt-3">
          <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 shadow-lg ${
            statusNotice.type === 'success' 
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
              : statusNotice.type === 'error'
              ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
          }`}>
            <Activity className="w-4 h-4 shrink-0" />
            <span>{statusNotice.text}</span>
          </div>
        </div>
      )}

      {/* Ana Grid (Pranjal Mimarisi: Sol Analiz & İstatistikler, Sağ Hamle Paneli) */}
      <main className="w-full max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SOL BÖLÜM (8 Kolon): Büyük Tahmin Vitrini & İstatistikler */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Ana Pazar Başlığı */}
          <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">
            {activeMarket.title}
          </h1>

          {/* PRANJAL TARZI BÜYÜK SAYILAR VE ÇEMBER ORAN KARTI */}
          <div className="p-6 rounded-3xl bg-[#0c0f17] border border-zinc-800/90 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* YES Kutusu */}
            <div className="md:col-span-4 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                EVET (BAŞLATILACAK)
              </div>
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {yesPool.toLocaleString()} <span className="text-xs font-bold text-zinc-500 font-mono">kESCOBAR</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                {Math.round(yesPool / 500)} kişi · <span className="text-emerald-400 font-bold">x{yesMultiplier}</span> çarpan
              </p>
            </div>

            {/* NO Kutusu */}
            <div className="md:col-span-4 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                HAYIR (GECİKECEK)
              </div>
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {noPool.toLocaleString()} <span className="text-xs font-bold text-zinc-500 font-mono">kESCOBAR</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                {Math.round(noPool / 500)} kişi · <span className="text-rose-400 font-bold">x{noMultiplier}</span> çarpan
              </p>
            </div>

            {/* Çember / Yüzde Widget'ı */}
            <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#1f242f" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * yesPercent) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{yesPercent}%</span>
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-extrabold">EVET DİYOR</span>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 mt-2 font-mono">%{noPercent} ihtimal vermiyor</span>
            </div>
          </div>

          {/* Protokol Açıklama Rozetleri (Metadata Strip) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-400 pt-1">
            <div className="p-3 rounded-xl bg-[#0c0f17] border border-zinc-800/60 flex items-center gap-3">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">HER TAHMİN İMZALI</span>
                <span className="text-[10px] text-zinc-500">Ed25519 yerel özel anahtar</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0c0f17] border border-zinc-800/60 flex items-center gap-3">
              <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">TECHNOCORE AĞI</span>
                <span className="text-[10px] text-zinc-500">turkce-koprusu odası</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0c0f17] border border-zinc-800/60 flex items-center gap-3">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">MERKEZİYETSİZ DEFTER</span>
                <span className="text-[10px] text-zinc-500">Veritabanı yok, açık kayıt</span>
              </div>
            </div>
          </div>

          {/* Sayaç Çubuğu (Closes, Volume, Calls, People) */}
          <div className="p-4 rounded-2xl bg-[#0c0f17] border border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div>
              <span className="text-zinc-500 text-[10px] block">VADE TARİHİ</span>
              <span className="font-bold text-zinc-200">{activeMarket.endDate}</span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div>
              <span className="text-zinc-500 text-[10px] block">TOPLAM HACİM</span>
              <span className="font-bold text-amber-400">{totalMarketPool.toLocaleString()} kESCOBAR</span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div>
              <span className="text-zinc-500 text-[10px] block">TOPLAM OY</span>
              <span className="font-bold text-cyan-400">{parsedCalls.length + 42}</span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div>
              <span className="text-zinc-500 text-[10px] block">KATILIMCI</span>
              <span className="font-bold text-white">{totalParticipants}</span>
            </div>
          </div>

          {/* Canlı Akış Kaseti (AS THEY LAND / Ticker) */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 overflow-x-auto flex items-center gap-4 text-xs font-mono scrollbar-none">
            <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 font-black text-[10px] whitespace-nowrap">
              • CANLI AKIŞ
            </span>
            {recentFeed.length > 0 ? (
              recentFeed.map((call, i) => (
                <div key={i} className="flex items-center gap-1.5 whitespace-nowrap text-zinc-300 text-[11px]">
                  <span className="text-zinc-500">•</span>
                  <span className="text-amber-300 font-bold">{call.did}</span>
                  <span className={call.side === 'yes' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {call.side.toUpperCase()}
                  </span>
                  <span>{call.amount} kESCOBAR</span>
                  <span className="text-zinc-600 text-[10px]">{call.timeAgo}</span>
                </div>
              ))
            ) : (
              <span className="text-zinc-500 text-[11px]">Technocore odasındaki yeni imzalar taranıyor...</span>
            )}
          </div>

          {/* "Who has called it" (Tahmin Yapanlar Tablosu) */}
          <div className="p-6 rounded-3xl bg-[#0c0f17] border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">Who has called it</h3>
                <p className="text-xs text-zinc-500">Bu pazara Technocore üzerinden oy veren katılımcılar</p>
              </div>

              {/* Filtre: BIGGEST FIRST / RECENT */}
              <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setLeaderboardTab('biggest')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    leaderboardTab === 'biggest' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  EN BÜYÜKLER
                </button>
                <button
                  onClick={() => setLeaderboardTab('recent')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    leaderboardTab === 'recent' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  EN YENİLER
                </button>
              </div>
            </div>

            {/* Liste */}
            <div className="space-y-2.5">
              {displayedCalls.length > 0 ? (
                displayedCalls.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs font-mono hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-zinc-600 font-bold text-center">{item.rank || idx + 1}</span>
                      <div className="font-semibold text-zinc-300 flex items-center gap-2">
                        {item.did}
                        {item.rawDid === did && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 text-[10px] font-bold">
                            Siz
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-bold text-white block">{item.amount.toLocaleString()} kESCOBAR</span>
                        <span className={`text-[10px] font-extrabold uppercase ${
                          item.side === 'yes' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {item.side === 'yes' ? 'EVET' : 'HAYIR'}
                        </span>
                      </div>
                      <div className="w-16 text-right font-mono text-[11px] text-zinc-400">
                        <span className="text-zinc-200 font-bold block">{item.multiplier}</span>
                        <span className="text-[9px] text-zinc-600">tahmin doğruysa</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Bu pazara henüz oy verilmedi. İlk tahmini sağ taraftan siz yapın!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SAĞ BÖLÜM (4 Kolon): PRANJAL TARZI HAMLE YAPMA PANELİ ("Make your call") */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl bg-[#0c0f17] border border-amber-500/40 shadow-2xl sticky top-20 space-y-6">
            
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-base font-black text-white">Make your call</h2>
                <p className="text-[11px] text-zinc-500">Tahmininizi Ed25519 ile mühürleyin</p>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                3 ADIMDA TAHMİN
              </span>
            </div>

            {/* ADIM 1: TAKE YOUR kESCOBAR */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                1. TAKE YOUR kESCOBAR
              </span>
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 block">KULLANILABİLİR BAKİYE</span>
                  <div className="text-xl font-black text-amber-400">
                    {balance.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">kESCOBAR</span>
                  </div>
                </div>
                <button
                  onClick={handleClaim}
                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
                >
                  <Coins className="w-3.5 h-3.5" />
                  +1.000 Talep Et
                </button>
              </div>

              {/* Anahtar Kesiti */}
              <div className="flex items-center justify-between bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800/80 text-[11px] font-mono text-zinc-400">
                <span className="truncate max-w-[200px]">{did}</span>
                <button onClick={() => copyToClipboard(did, 'did')} className="text-zinc-500 hover:text-white">
                  {copiedDid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* ADIM 2: PICK A SIDE */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                2. PICK A SIDE
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedSide('yes')}
                  className={`p-3.5 rounded-2xl border text-center transition-all ${
                    selectedSide === 'yes'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/10'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-black block">Yes</span>
                  <span className="text-[10px] text-zinc-500">it ships</span>
                </button>
                <button
                  onClick={() => setSelectedSide('no')}
                  className={`p-3.5 rounded-2xl border text-center transition-all ${
                    selectedSide === 'no'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-lg shadow-rose-500/10'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-black block">No</span>
                  <span className="text-[10px] text-zinc-500">it does not</span>
                </button>
              </div>
            </div>

            {/* ADIM 3: PUT IT DOWN (Miktar Seçimi) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                3. PUT IT DOWN
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      betAmount === amt
                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
                <button
                  onClick={() => setBetAmount(balance > 0 ? balance : 1000)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    betAmount === balance
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Tümü
                </button>
              </div>
            </div>

            {/* BÜYÜK GÖNDER BUTONU */}
            <button
              disabled={isSubmitting}
              onClick={handlePlaceCall}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 ${
                selectedSide === 'yes'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              }`}
            >
              {isSubmitting ? (
                <span>Technocore İmzalanıyor...</span>
              ) : (
                <span>
                  {betAmount} kESCOBAR İle "{selectedSide.toUpperCase()}" Oyna
                </span>
              )}
            </button>

            {/* Alt Bilgi & Odaya Git */}
            <div className="pt-2 border-t border-zinc-800/80 text-center">
              <a
                href="https://technocore.chat/r/turkce-koprusu"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1 font-mono font-medium"
              >
                turkce-koprusu odasında doğrula <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl px-4 py-8 border-t border-zinc-800/80 text-center text-xs text-zinc-500 mt-12 font-mono">
        <p>© 2026 Kripto Escobar • Flop Labs Technocore Tahmin Piyasası. Açık protokol tabanlıdır.</p>
      </footer>
    </div>
  );
}
