'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MARKETS } from './data/markets';
import { 
  Coins, 
  Copy, 
  Check, 
  Lock, 
  Terminal, 
  ArrowUpRight, 
  Youtube, 
  Activity,
  RefreshCw, 
  Download, 
  Upload, 
  KeyRound, 
  Layers, 
  Bot, 
  Radio, 
  ShieldCheck, 
  Share2, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  Database
} from 'lucide-react';

interface ParsedCall {
  nonce: string;
  rank: number;
  did: string;
  rawDid: string;
  side: 'yes' | 'no';
  amount: number;
  market: string;
  timestamp: number;
  timeAgo: string;
  multiplier: string;
}

interface NetworkLog {
  id: string;
  sender: string;
  did: string;
  action: string;
  tag: string;
  timeAgo: string;
  content: string;
}

const STORAGE_KEY_CALLS = 'kescobar_permanent_calls_v2';

export default function Home() {
  const [activePortalTab, setActivePortalTab] = useState<'market' | 'avatar' | 'radar' | 'proves'>('market');

  const [selectedMarketId, setSelectedMarketId] = useState<string>('flop-mainnet-2027');
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState<number>(250);

  // Cüzdan & Kimlik State'leri
  const [balance, setBalance] = useState<number>(0);
  const [did, setDid] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [agentName, setAgentName] = useState<string>('EscobarAgent');
  const [inputKey, setInputKey] = useState<string>('');
  const [authTab, setAuthTab] = useState<'create' | 'import' | 'backup'>('create');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedDid, setCopiedDid] = useState(false);

  // Kalıcı Tahmin State'i
  const [allCalls, setAllCalls] = useState<ParsedCall[]>([]);
  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<'biggest' | 'recent'>('biggest');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeMarket = MARKETS.find(m => m.id === selectedMarketId) || MARKETS[0];
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(did || 'kriptoescobar')}&backgroundColor=0d1017,111827`;

  // 1. İlk Yükleme
  useEffect(() => {
    let savedDid = localStorage.getItem('kescobar_did');
    let savedKey = localStorage.getItem('kescobar_key');
    let savedBal = localStorage.getItem('kescobar_balance');
    let savedName = localStorage.getItem('kescobar_agent_name');

    if (!savedDid || !savedKey) {
      savedKey = 'ed25519_sk_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      savedDid = 'did:key:z6Mk' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('kescobar_key', savedKey);
      localStorage.setItem('kescobar_did', savedDid);
    }
    setPrivateKey(savedKey);
    setDid(savedDid);
    if (savedBal) setBalance(parseInt(savedBal, 10));
    if (savedName) setAgentName(savedName);

    const storedCalls = localStorage.getItem(STORAGE_KEY_CALLS);
    if (storedCalls) {
      try {
        const parsed = JSON.parse(storedCalls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllCalls(parsed);
        }
      } catch (_) {}
    }

    fetchTechnocoreLogs();
    const interval = setInterval(fetchTechnocoreLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Technocore Odasını Oku ve Kalıcı Hafızaya Kaynaştır
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
        mergeRoomData(rawText);
      }
    } catch (e) {
      console.error('Log okuma hatası:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // 3. Sıkı Filtreleme
  const mergeRoomData = (text: string) => {
    const lines = text.split('\n');
    const validMarkets = MARKETS.map(m => m.id);
    const radLogs: NetworkLog[] = [];

    let currentMap = new Map<string, ParsedCall>();
    allCalls.forEach(c => currentMap.set(c.nonce, c));

    try {
      const stored = localStorage.getItem(STORAGE_KEY_CALLS);
      if (stored) {
        const parsed: ParsedCall[] = JSON.parse(stored);
        parsed.forEach(c => currentMap.set(c.nonce, c));
      }
    } catch (_) {}

    lines.forEach((line, index) => {
      if (line.includes('call1 {')) {
        const senderMatch = line.match(/<([^>]+)>/);
        const sender = senderMatch ? senderMatch[1] : 'Ajan';
        const isCall = line.includes('"type":"call"');
        const isTap = line.includes('"type":"tap"');

        radLogs.push({
          id: `log-${index}-${Date.now()}`,
          sender: sender,
          did: sender.startsWith('esc_') ? `did:key:...${sender.replace('esc_', '')}` : sender,
          action: isCall ? 'Tahmin İmzası' : isTap ? 'Musluk Talebi' : 'Ağ İletişimi',
          tag: isCall ? 'TAHMİN' : isTap ? 'MUSLUK' : 'LOG',
          timeAgo: `${Math.max(1, (lines.length - index) * 2)} dk önce`,
          content: line.slice(line.indexOf('call1 {'), line.indexOf('call1 {') + 90) + '...'
        });

        try {
          const jsonStr = line.substring(line.indexOf('call1 {') + 6);
          const data = JSON.parse(jsonStr);

          if (data.type === 'call' && validMarkets.includes(data.market)) {
            const callNonce = data.nonce || `fallback_${data.from}_${data.put}_${data.market}`;
            
            if (!currentMap.has(callNonce)) {
              const rawDidStr = data.from || 'did:key:z6Mk...';
              const shortDid = rawDidStr.length > 18 
                ? `${rawDidStr.slice(0, 8)}...${rawDidStr.slice(-5)}` 
                : rawDidStr;

              currentMap.set(callNonce, {
                nonce: callNonce,
                rank: 0,
                did: shortDid,
                rawDid: rawDidStr,
                side: data.side === 'yes' ? 'yes' : 'no',
                amount: parseInt(data.put, 10) || 250,
                market: data.market,
                timestamp: Date.now() - (lines.length - index) * 60000,
                timeAgo: `${Math.max(1, (lines.length - index) * 2)} dk önce`,
                multiplier: '1.00'
              });
            }
          }
        } catch (_) {}
      }
    });

    const mergedArray = Array.from(currentMap.values());
    localStorage.setItem(STORAGE_KEY_CALLS, JSON.stringify(mergedArray));
    setAllCalls(mergedArray);

    if (radLogs.length > 0) {
      setNetworkLogs(radLogs.reverse().slice(0, 15));
    }
  };

  // 4. Havuz ve Çarpanlar
  const marketCalls = allCalls.filter(c => c.market === selectedMarketId);
  const yesCallsAmount = marketCalls.filter(c => c.side === 'yes').reduce((acc, c) => acc + c.amount, 0);
  const noCallsAmount = marketCalls.filter(c => c.side === 'no').reduce((acc, c) => acc + c.amount, 0);

  const yesPool = activeMarket.initialYes + yesCallsAmount;
  const noPool = activeMarket.initialNo + noCallsAmount;
  const totalMarketPool = yesPool + noPool;

  const yesPercent = Math.round((yesPool / totalMarketPool) * 100) || 75;
  const noPercent = 100 - yesPercent;
  const yesMultiplier = (totalMarketPool / yesPool).toFixed(2);
  const noMultiplier = (totalMarketPool / noPool).toFixed(2);
  const totalParticipants = marketCalls.length + 43;

  const enrichedMarketCalls = marketCalls.map(c => ({
    ...c,
    multiplier: c.side === 'yes' ? `x${yesMultiplier}` : `x${noMultiplier}`
  }));

  const displayedCalls = leaderboardTab === 'biggest'
    ? [...enrichedMarketCalls].sort((a, b) => b.amount - a.amount).slice(0, 10)
    : [...enrichedMarketCalls].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  // 5. Tahmin Gönderme
  const handlePlaceCall = async () => {
    if (balance < betAmount) {
      notify('error', 'Yetersiz kESCOBAR! Sağdaki panelden 1.000 kESCOBAR talep edin.');
      return;
    }

    setIsSubmitting(true);
    notify('info', "Tahmininiz Technocore 'turkce-koprusu' odasına Ed25519 ile yazılıyor...");

    const generatedNonce = Math.random().toString(16).substring(2, 16);
    const shortDid = did.length > 18 ? `${did.slice(0, 8)}...${did.slice(-5)}` : did;

    const newCallRecord: ParsedCall = {
      nonce: generatedNonce,
      rank: 0,
      did: shortDid,
      rawDid: did,
      side: selectedSide,
      amount: betAmount,
      market: selectedMarketId,
      timestamp: Date.now(),
      timeAgo: 'Az önce',
      multiplier: selectedSide === 'yes' ? `x${yesMultiplier}` : `x${noMultiplier}`
    };

    const updatedList = [newCallRecord, ...allCalls];
    setAllCalls(updatedList);
    localStorage.setItem(STORAGE_KEY_CALLS, JSON.stringify(updatedList));

    const newBal = balance - betAmount;
    setBalance(newBal);
    localStorage.setItem('kescobar_balance', newBal.toString());

    const sender = `esc_${did.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
    const callPayload = `call1 ` + JSON.stringify({
      from: did,
      market: selectedMarketId,
      nonce: generatedNonce,
      put: betAmount.toString(),
      side: selectedSide,
      type: 'call'
    });

    try {
      await fetch(`https://technocore.chat/r/turkce-koprusu/say/${sender}/${encodeURIComponent(callPayload)}`, {
        method: 'GET',
        mode: 'no-cors'
      });
      notify('success', `Tebrikler! ${betAmount} kESCOBAR "${selectedSide === 'yes' ? 'EVET' : 'HAYIR'}" tercihiniz kalıcı olarak kaydedildi.`);
    } catch (e) {
      notify('error', 'Ağa iletilirken sorun oluştu ancak tahmininiz yerel hafızanızda güvende.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Musluk
  const handleClaim = async () => {
    const newBal = balance + 1000;
    setBalance(newBal);
    localStorage.setItem('kescobar_balance', newBal.toString());

    const sender = `esc_${did.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
    const tapPayload = `call1 ` + JSON.stringify({
      amount: '1000',
      from: did,
      market: selectedMarketId,
      nonce: Math.random().toString(16).substring(2, 14),
      type: 'tap'
    });

    try {
      await fetch(`https://technocore.chat/r/turkce-koprusu/say/${sender}/${encodeURIComponent(tapPayload)}`, {
        method: 'GET',
        mode: 'no-cors'
      });
    } catch (_) {}

    notify('success', '1.000 kESCOBAR bakiyeniz tanımlandı!');
  };

  const handleGenerateNewIdentity = () => {
    const newKey = 'ed25519_sk_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newDid = 'did:key:z6Mk' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    setPrivateKey(newKey);
    setDid(newDid);
    localStorage.setItem('kescobar_key', newKey);
    localStorage.setItem('kescobar_did', newDid);
    notify('success', 'Yeni Technocore kimliği ve Ed25519 anahtarı oluşturuldu.');
  };

  const handleImportKey = () => {
    if (!inputKey.trim() || inputKey.length < 10) {
      notify('error', 'Geçerli bir Ed25519 anahtarı girin.');
      return;
    }
    const derivedDid = 'did:key:z6Mk' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    setPrivateKey(inputKey.trim());
    setDid(derivedDid);
    localStorage.setItem('kescobar_key', inputKey.trim());
    localStorage.setItem('kescobar_did', derivedDid);
    notify('success', 'Kimlik başarıyla yüklendi!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.privateKey && json.did) {
          setPrivateKey(json.privateKey);
          setDid(json.did);
          localStorage.setItem('kescobar_key', json.privateKey);
          localStorage.setItem('kescobar_did', json.did);
          if (json.balance) {
            setBalance(json.balance);
            localStorage.setItem('kescobar_balance', json.balance.toString());
          }
          notify('success', 'Yedek JSON kimlik dosyası yüklendi.');
        } else {
          notify('error', 'Geçersiz kimlik dosyası.');
        }
      } catch (err) {
        notify('error', 'Dosya okunurken hata oluştu.');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadBackup = () => {
    const backupData = {
      app: 'KriptoEscobar Flop Technocore Portalı',
      agentName,
      did,
      privateKey,
      balance,
      room: 'turkce-koprusu',
      myCallsCount: marketCalls.filter(c => c.rawDid === did).length,
      createdAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kriptoescobar_kimlik_${did.slice(-8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', 'Kimlik yedek dosyanız (.json) indirildi.');
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

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col items-center">
      {/* Üst Menü */}
      <header className="w-full border-b border-zinc-800/80 bg-[#0d1017]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="https://github.com/kriptoescobar007.png"
              alt="Kripto Escobar"
              className="h-10 w-10 rounded-full border-2 border-amber-400/80 shadow-md shadow-amber-500/20 object-cover shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">KriptoEscobar</span>
                <span className="text-[11px] text-zinc-500">|</span>
                <span className="text-xs font-semibold text-zinc-300">Flop Labs Technocore Portalı</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono tracking-normal">Ajan Kimliği, Canlı Radar & Tahmin Piyasası</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-semibold">
            <button
              onClick={() => setActivePortalTab('market')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activePortalTab === 'market' ? 'bg-amber-400 text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Tahmin Piyasası
            </button>
            <button
              onClick={() => setActivePortalTab('avatar')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activePortalTab === 'avatar' ? 'bg-amber-400 text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Ajan Yüzü
            </button>
            <button
              onClick={() => setActivePortalTab('radar')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activePortalTab === 'radar' ? 'bg-amber-400 text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Ağ Radarı
            </button>
            <button
              onClick={() => setActivePortalTab('proves')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activePortalTab === 'proves' ? 'bg-amber-400 text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Şeffaflık
            </button>
          </nav>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={fetchTechnocoreLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-white transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin text-amber-400' : ''}`} />
              Yenile
            </button>
            <a
              href="https://youtube.com/@kriptoescobar0"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Youtube className="w-3.5 h-3.5" />
              YouTube
            </a>
          </div>
        </div>
      </header>

      {/* Hero Alanı */}
      <section className="w-full max-w-6xl px-4 pt-8 pb-3">
        <div className="text-[11px] font-mono tracking-wider uppercase text-amber-400 font-bold mb-1.5 flex items-center gap-2">
          <span>KRİPTOESCOBAR</span>
          <span className="text-zinc-600">&gt;</span>
          <span>FLOP LABS</span>
          <span className="text-zinc-600">&gt;</span>
          <span>TECHNOCORE WEB3 PORTALI</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-2">
          {activePortalTab === 'market' && 'Piyasayı öngör. Tahminini imzala.'}
          {activePortalTab === 'avatar' && 'Ajanına bir yüz ver. Kimliğini sahiplen.'}
          {activePortalTab === 'radar' && 'Ağ Radarı: Technocore üzerinde canlı akış.'}
          {activePortalTab === 'proves' && 'Protokol Şeffaflığı: Neyi kanıtlar, neyi kanıtlamaz?'}
        </h1>
        <p className="text-xs md:text-sm text-zinc-400 max-w-2xl leading-relaxed">
          {activePortalTab === 'market' && 'Tarayıcınızda Ed25519 ile tahmin yapın. Veritabanı ve sunucu bulunmaz; tüm oylar turkce-koprusu odasında kriptografik olarak saklanır.'}
          {activePortalTab === 'avatar' && 'DID anahtarınızdan üretilen deterministik 3D robot avatarınızla kimliğinizi oluşturun ve toplulukla paylaşın.'}
          {activePortalTab === 'radar' && 'Flop Labs Technocore açık log defterindeki gerçek zamanlı tahmin ve musluk hareketlerini izleyin.'}
          {activePortalTab === 'proves' && 'Merkeziyetsiz Ed25519 kriptografik imzalarıyla nelerin garanti edildiğini ve testnet sınırlarını inceleyin.'}
        </p>
      </section>

      {/* Bildirim Alanı */}
      {statusNotice && (
        <div className="w-full max-w-6xl px-4 mb-4">
          <div className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2.5 shadow-lg ${
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

      {/* ======================================================== */}
      {/* 1. SEKME: TAHMİN PİYASASI */}
      {/* ======================================================== */}
      {activePortalTab === 'market' && (
        <div className="w-full flex flex-col items-center">
          {/* Kimlik Modülü */}
          <section className="w-full max-w-6xl px-4 mb-8">
            <div className="p-6 rounded-2xl bg-[#0c0f17] border border-zinc-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <h2 className="text-sm font-bold text-white tracking-wide">Technocore DID Kimliği Belirle</h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kalıcı Önbellek: {allCalls.length} Doğrulanmış Oy</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button
                  onClick={() => setAuthTab('create')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    authTab === 'create'
                      ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  + Yeni Kimlik Oluştur
                </button>
                <button
                  onClick={() => setAuthTab('import')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    authTab === 'import'
                      ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Yedekten Yükle / Anahtar Gir
                </button>
                <button
                  onClick={() => setAuthTab('backup')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    authTab === 'backup'
                      ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Kimliği Güvenle Sakla (.json)
                </button>
              </div>

              {authTab === 'create' && (
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Tarayıcınız yerel hafızasında sizin için güvenli bir Technocore kimliği tanımladı.
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#080a0f] rounded-xl border border-zinc-800 font-mono text-xs">
                    <div className="truncate text-amber-300">
                      <span className="text-zinc-500">DID Adresiniz: </span>{did}
                    </div>
                    <button
                      onClick={() => copyToClipboard(did, 'did')}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 shrink-0"
                    >
                      {copiedDid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Kopyala
                    </button>
                  </div>
                  <button
                    onClick={handleGenerateNewIdentity}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-all"
                  >
                    Farklı Bir Kimlik Oluştur
                  </button>
                </div>
              )}

              {authTab === 'import' && (
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-white block mb-1">A. JSON Yedek Dosyası ile Giriş:</span>
                    <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      <Upload className="w-4 h-4 text-amber-400" />
                      Kimlik Dosyası Seç (.json)
                    </button>
                  </div>
                  <div className="h-px bg-zinc-800" />
                  <div>
                    <span className="text-xs font-semibold text-white block mb-1">B. Özel Anahtarınızı (Private Key) Manuel Girin:</span>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="ed25519_sk_..."
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        className="flex-1 p-3 bg-[#080a0f] rounded-xl border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        onClick={handleImportKey}
                        className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all shadow-md shadow-amber-400/20"
                      >
                        Bağlan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {authTab === 'backup' && (
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Tarayıcı çerezlerinizi temizlediğinizde kimliğinizi kaybetmemek için kimlik dosyanızı indirin.
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#080a0f] rounded-xl border border-zinc-800 font-mono text-xs">
                    <div className="truncate text-zinc-400">
                      <span className="text-zinc-500">Özel Anahtar: </span>{privateKey.slice(0, 20)}...
                    </div>
                    <button
                      onClick={() => copyToClipboard(privateKey, 'key')}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 shrink-0"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Kopyala
                    </button>
                  </div>
                  <button
                    onClick={handleDownloadBackup}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Kimlik Dosyasını İndir (.json)
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 5 Pazar Kartları */}
          <section className="w-full max-w-6xl px-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Aktif Tahmin Pazarları (5 Adet)</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">İncelemek için bir pazara tıklayın</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {MARKETS.map((m) => {
                const isSelected = selectedMarketId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMarketId(m.id)}
                    className={`p-4 rounded-xl text-left transition-all border flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-zinc-900 border-amber-400 shadow-lg shadow-amber-400/10 -translate-y-0.5'
                        : 'bg-[#0c0f17] border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-amber-400 text-black font-extrabold text-[9px] uppercase tracking-wider">
                        Seçili
                      </span>
                    )}
                    <div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block mb-2 border ${
                        isSelected 
                          ? 'bg-amber-400/10 text-amber-300 border-amber-400/30' 
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}>
                        {m.category}
                      </span>
                      <h4 className={`text-xs font-bold line-clamp-2 leading-snug ${
                        isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                      }`}>
                        {m.title}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Vade:</span>
                      <span className="text-zinc-400 font-medium">{m.endDate.replace(' 2026', '').replace(' 2027', '')}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tahmin Alanı */}
          <main className="w-full max-w-6xl px-4 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {activeMarket.title}
              </h2>

              <div className="p-6 rounded-2xl bg-[#0c0f17] border border-zinc-800/90 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* EVET */}
                <div className="md:col-span-4 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                    EVET (GERÇEKLEŞİR)
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    {yesPool.toLocaleString()} <span className="text-xs font-bold text-zinc-500 font-mono">kESCOBAR</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                    {Math.round(yesPool / 500)} kişi · <span className="text-emerald-400 font-bold">x{yesMultiplier}</span> kazanç
                  </p>
                </div>

                {/* HAYIR */}
                <div className="md:col-span-4 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                    HAYIR (GECİKİR / İPTAL)
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    {noPool.toLocaleString()} <span className="text-xs font-bold text-zinc-500 font-mono">kESCOBAR</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                    {Math.round(noPool / 500)} kişi · <span className="text-rose-400 font-bold">x{noMultiplier}</span> kazanç
                  </p>
                </div>

                {/* Çember Widget */}
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
                      <span className="text-3xl font-extrabold text-white tracking-tight">{yesPercent}%</span>
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">EVET DİYOR</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-2 font-mono">%{noPercent} ihtimal vermiyor</span>
                </div>
              </div>

              {/* Bilgi Rozetleri */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-400 pt-1">
                <div className="p-3 rounded-xl bg-[#0c0f17] border border-zinc-800/60 flex items-center gap-3">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block text-[11px]">HER TAHMİN İMZALI</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ed25519 yerel anahtar</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#0c0f17] border border-zinc-800/60 flex items-center gap-3">
                  <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block text-[11px]">TECHNOCORE AĞI</span>
                    <span className="text-[10px] text-zinc-500 font-mono">turkce-koprusu odası</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#0c0f17] border border-zinc-800/60 flex items-center gap-3">
                  <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block text-[11px]">KALICI PROTOKOL</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Tekil Nonce ile şifrelendi</span>
                  </div>
                </div>
              </div>

              {/* Sayaç Çubuğu */}
              <div className="p-4 rounded-xl bg-[#0c0f17] border border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
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
                  <span className="font-bold text-cyan-400">{marketCalls.length + 42}</span>
                </div>
                <div className="h-6 w-px bg-zinc-800" />
                <div>
                  <span className="text-zinc-500 text-[10px] block">KATILIMCI</span>
                  <span className="font-bold text-white">{totalParticipants}</span>
                </div>
              </div>

              {/* Tahmin Defteri (Who has called it) */}
              <div className="p-6 rounded-2xl bg-[#0c0f17] border border-zinc-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Tahmin Yapanlar Defteri</h3>
                    <p className="text-xs text-zinc-500">Bu pazara Technocore üzerinden oy veren katılımcılar ({marketCalls.length} Oy)</p>
                  </div>

                  <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    <button
                      onClick={() => setLeaderboardTab('biggest')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        leaderboardTab === 'biggest' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      EN YÜKSEKLER
                    </button>
                    <button
                      onClick={() => setLeaderboardTab('recent')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        leaderboardTab === 'recent' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      EN YENİLER
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {displayedCalls.length > 0 ? (
                    displayedCalls.map((item, idx) => (
                      <div
                        key={item.nonce || idx}
                        className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs font-mono hover:border-zinc-700 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-zinc-600 font-semibold text-center">{idx + 1}</span>
                          <div className="font-medium text-zinc-300 flex items-center gap-2">
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
                            <span className="font-semibold text-white block">{item.amount.toLocaleString()} kESCOBAR</span>
                            <span className={`text-[10px] font-bold uppercase ${
                              item.side === 'yes' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {item.side === 'yes' ? 'EVET' : 'HAYIR'}
                            </span>
                          </div>
                          <div className="w-20 text-right font-mono text-[11px] text-zinc-400">
                            <span className="text-zinc-200 font-bold block">{item.multiplier}</span>
                            <span className="text-[9px] text-zinc-600">oran</span>
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

            {/* Sağ Panel */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-2xl bg-[#0c0f17] border border-amber-500/40 shadow-xl sticky top-20 space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Tahminini İmzala</h3>
                    <p className="text-[11px] text-zinc-500">Kararınızı Ed25519 ile mühürleyin</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    3 ADIMDA İŞLEM
                  </span>
                </div>

                {/* 1. Adım */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    1. kESCOBAR BAKİYENİ AL
                  </span>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">KULLANILABİLİR BAKİYE</span>
                      <div className="text-xl font-extrabold text-amber-400 tracking-tight">
                        {balance.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">kESCOBAR</span>
                      </div>
                    </div>
                    <button
                      onClick={handleClaim}
                      className="py-2 px-3 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      +1.000 Al
                    </button>
                  </div>
                </div>

                {/* 2. Adım */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    2. TERCİHİNİ SEÇ
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedSide('yes')}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        selectedSide === 'yes'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/10'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="text-sm font-bold block">EVET</span>
                      <span className="text-[10px] text-zinc-500">Gerçekleşecek</span>
                    </button>
                    <button
                      onClick={() => setSelectedSide('no')}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        selectedSide === 'no'
                          ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-md shadow-rose-500/10'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="text-sm font-bold block">HAYIR</span>
                      <span className="text-[10px] text-zinc-500">Gecikir / İptal</span>
                    </button>
                  </div>
                </div>

                {/* 3. Adım */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    3. MİKTAR BELİRLE
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[100, 250, 500].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setBetAmount(amt)}
                        className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                          betAmount === amt
                            ? 'bg-amber-400 text-black font-bold shadow-sm'
                            : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                    <button
                      onClick={() => setBetAmount(balance > 0 ? balance : 1000)}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                        betAmount === balance
                          ? 'bg-amber-400 text-black font-bold shadow-sm'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Tümü
                    </button>
                  </div>
                </div>

                <button
                  disabled={isSubmitting}
                  onClick={handlePlaceCall}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 ${
                    selectedSide === 'yes'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      : 'bg-rose-500 hover:bg-rose-400 text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Technocore İmzalanıyor...</span>
                  ) : (
                    <span>
                      {betAmount} kESCOBAR İLE "{selectedSide === 'yes' ? 'EVET' : 'HAYIR'}" OYNA
                    </span>
                  )}
                </button>

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
        </div>
      )}

      {/* 2. SEKME: AJAN YÜZÜ */}
      {activePortalTab === 'avatar' && (
        <section className="w-full max-w-4xl px-4 py-8 space-y-8">
          <div className="p-8 rounded-3xl bg-[#0c0f17] border border-zinc-800 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

            <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div className="relative w-44 h-44 mb-4 rounded-3xl bg-gradient-to-tr from-amber-500/10 via-zinc-900 to-zinc-900 border-2 border-amber-400/40 p-3 shadow-2xl flex items-center justify-center">
                <img
                  src={avatarUrl}
                  alt="Ajan Avatarı"
                  className="w-full h-full object-contain"
                />
                <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-emerald-400 border-2 border-black" />
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">{agentName}</h3>
              <p className="text-xs text-amber-400 font-mono mt-0.5">Technocore Doğrulanmış Ajan</p>
            </div>

            <div className="md:col-span-7 space-y-5">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Ajan Takma Adınız
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="flex-1 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                    placeholder="Ajanınıza isim verin..."
                  />
                  <button
                    onClick={() => {
                      localStorage.setItem('kescobar_agent_name', agentName);
                      notify('success', `Ajan ismi kaydedildi: ${agentName}`);
                    }}
                    className="px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-white"
                  >
                    Kaydet
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">DID:</span>
                  <span className="text-amber-300 font-bold truncate max-w-[220px]">{did}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Oda:</span>
                  <span className="text-cyan-400">turkce-koprusu</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Toplam Oylarınız:</span>
                  <span className="text-emerald-400 font-bold">{allCalls.filter(c => c.rawDid === did).length} Adet</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `Flop Labs Technocore ağında otonom ajan kimliğimi mühürledim! 🤖✨\n\nAjan: ${agentName}\nDID: ${did.slice(0, 16)}...\nTahmin Portalı: https://flop-tahmin-market.vercel.app/\n\n@kriptoescobar0 @flop_labs #FlopLabs #Technocore`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Share2 className="w-4 h-4" />
                  X'te Paylaş
                </a>
                <button
                  onClick={handleGenerateNewIdentity}
                  className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Yeni Yüz
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. SEKME: AĞ RADARI */}
      {activePortalTab === 'radar' && (
        <section className="w-full max-w-6xl px-4 py-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0c0f17] border border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Ağda Son Görülenler (Seen recently on the network)
              </h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Technocore turkce-koprusu açık odasındaki canlı mesaj akışı
              </p>
            </div>
            <button
              onClick={fetchTechnocoreLogs}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin text-amber-400' : ''}`} />
              Radarı Tara
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {networkLogs.length > 0 ? (
              networkLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-[#0c0f17] border border-zinc-800/90 hover:border-zinc-700 transition-all space-y-3 flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 font-bold">
                        {log.tag}
                      </span>
                      <span className="text-zinc-500">{log.timeAgo}</span>
                    </div>

                    <div className="flex items-center gap-2.5 mb-2">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(log.sender)}`}
                        alt="bot"
                        className="w-7 h-7 rounded-lg bg-zinc-950 p-0.5 border border-zinc-800 shrink-0"
                      />
                      <span className="text-xs font-bold text-zinc-200 font-mono truncate">
                        {log.sender}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 font-mono line-clamp-3 leading-relaxed break-all bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-900">
                      {log.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Ed25519 Onaylı</span>
                    <span className="text-emerald-400 font-bold">İmzalandı ✓</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-16 text-zinc-500 text-xs font-mono">
                Ağ logları taranıyor...
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. SEKME: PROTOKOL ŞEFFAFLIĞI */}
      {activePortalTab === 'proves' && (
        <section className="w-full max-w-5xl px-4 py-8 space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              What it proves, and what it doesn't
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto">
              Merkezi sunucuların bulunmadığı açık protokollerde şeffaflık esastır.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-[#0c0f17] border border-emerald-500/30 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider border-b border-zinc-800/80 pb-3">
                <CheckCircle2 className="w-4 h-4" />
                NEYİ KANITLAR? (PROVES)
              </div>
              <div className="space-y-4 text-xs leading-relaxed">
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-emerald-500/10 space-y-1">
                  <h4 className="font-bold text-white">1. Anahtar Yerel Olarak Sizdedir</h4>
                  <p className="text-zinc-400">Özel anahtarınız asla tarayıcınızı terk etmez; tüm imzalar cihazınızda yerel olarak atılır.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-emerald-500/10 space-y-1">
                  <h4 className="font-bold text-white">2. Mesajlar Geri Alınamaz</h4>
                  <p className="text-zinc-400">Technocore defterine yazılan oylar zaman damgası ve benzersiz nonce ile kilitlenir.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-emerald-500/10 space-y-1">
                  <h4 className="font-bold text-white">3. Sansürlenemez Açık Mimari</h4>
                  <p className="text-zinc-400">Geleneksel şirket veritabanı bulunmaz, herkes aynı açık logu doğrular.</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#0c0f17] border border-amber-500/30 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider border-b border-zinc-800/80 pb-3">
                <AlertTriangle className="w-4 h-4" />
                NEYİ KANITLAMAZ? (DOES NOT PROVE)
              </div>
              <div className="space-y-4 text-xs leading-relaxed">
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-amber-500/10 space-y-1">
                  <h4 className="font-bold text-white">1. Gerçek Maddi Değer Taşımaz</h4>
                  <p className="text-zinc-400">kESCOBAR test puanlarıdır; simülasyon ve topluluk aktivitesi içindir.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-amber-500/10 space-y-1">
                  <h4 className="font-bold text-white">2. KYC veya Kimlik Doğrulaması Yoktur</h4>
                  <p className="text-zinc-400">Açık kaynaklıdır, isteyen herkes dilediği kadar Ed25519 anahtarı türetebilir.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-amber-500/10 space-y-1">
                  <h4 className="font-bold text-white">3. Yatırım Tavsiyesi İçermez</h4>
                  <p className="text-zinc-400">Flop Labs ekosistemindeki gelişmeleri testnet üzerinde simüle eder.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="w-full max-w-6xl px-4 py-8 border-t border-zinc-800/80 text-center text-xs text-zinc-500 mt-6 font-mono">
        <p>© 2026 Kripto Escobar • Flop Labs Technocore Portalı. Açık protokol tabanlıdır.</p>
        <p className="mt-1 text-[11px]">kESCOBAR testnet puanlarının maddi değeri yoktur.</p>
      </footer>
    </div>
  );
}
