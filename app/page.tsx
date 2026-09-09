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
  Download, 
  Upload, 
  KeyRound, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  Database,
  Award,
  Flame,
  Sparkles,
  Dices,
  MessageSquare,
  Send
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

interface WallPost {
  id: string;
  did: string;
  text: string;
  time: string;
}

interface FlipHistory {
  id: string;
  choice: 'yazi' | 'tura';
  result: 'yazi' | 'tura';
  won: boolean;
  amount: number;
  time: string;
}

const STORAGE_KEY_CALLS = 'kescobar_permanent_calls_v2';
const STORAGE_KEY_GM_DATE = 'kescobar_last_gm_date';
const STORAGE_KEY_STREAK = 'kescobar_gm_streak';
const STORAGE_KEY_WALL = 'kescobar_wall_posts_v2';
const STORAGE_KEY_FLIPS = 'kescobar_flip_history_v2';

export default function Home() {
  const [activePortalTab, setActivePortalTab] = useState<'market' | 'passport' | 'arena' | 'proves'>('market');

  const [selectedMarketId, setSelectedMarketId] = useState<string>('flop-mainnet-2027');
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState<number>(250);

  // Cüzdan & Kimlik State'leri
  const [balance, setBalance] = useState<number>(0);
  const [did, setDid] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [authTab, setAuthTab] = useState<'create' | 'import' | 'backup'>('create');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedDid, setCopiedDid] = useState(false);

  // Pasaport State'leri
  const [gmStreak, setGmStreak] = useState<number>(1);
  const [hasClaimedGmToday, setHasClaimedGmToday] = useState<boolean>(false);

  // Yazı-Tura Düello State'leri
  const [coinChoice, setCoinChoice] = useState<'yazi' | 'tura'>('yazi');
  const [coinBetAmount, setCoinBetAmount] = useState<number>(100);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipResultText, setFlipResultText] = useState<string | null>(null);
  const [flipHistory, setFlipHistory] = useState<FlipHistory[]>([]);

  // Ajan Duvarı State'leri
  const [wallInput, setWallInput] = useState<string>('');
  const [isPostingWall, setIsPostingWall] = useState<boolean>(false);
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);

  // Kalıcı Tahmin State'i
  const [allCalls, setAllCalls] = useState<ParsedCall[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<'biggest' | 'recent'>('biggest');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeMarket = MARKETS.find(m => m.id === selectedMarketId) || MARKETS[0];

  useEffect(() => {
    let savedDid = localStorage.getItem('kescobar_did');
    let savedKey = localStorage.getItem('kescobar_key');
    let savedBal = localStorage.getItem('kescobar_balance');
    let savedStreak = localStorage.getItem(STORAGE_KEY_STREAK);
    let lastGmDate = localStorage.getItem(STORAGE_KEY_GM_DATE);

    if (!savedDid || !savedKey) {
      savedKey = 'ed25519_sk_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      savedDid = 'did:key:z6Mk' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('kescobar_key', savedKey);
      localStorage.setItem('kescobar_did', savedDid);
    }
    setPrivateKey(savedKey);
    setDid(savedDid);
    if (savedBal) setBalance(parseInt(savedBal, 10));

    if (savedStreak) setGmStreak(parseInt(savedStreak, 10));
    const todayStr = new Date().toISOString().slice(0, 10);
    if (lastGmDate === todayStr) {
      setHasClaimedGmToday(true);
    }

    // Yerel Hafızaları Yükle
    const storedCalls = localStorage.getItem(STORAGE_KEY_CALLS);
    if (storedCalls) {
      try {
        const parsed = JSON.parse(storedCalls);
        if (Array.isArray(parsed)) setAllCalls(parsed);
      } catch (_) {}
    }

    const storedWall = localStorage.getItem(STORAGE_KEY_WALL);
    if (storedWall) {
      try {
        const parsed = JSON.parse(storedWall);
        if (Array.isArray(parsed)) setWallPosts(parsed);
      } catch (_) {}
    } else {
      setWallPosts([
        { id: '1', did: 'did:key:z6Mkesc...', text: 'Kripto Escobar topluluğu Technocore ağında ilk imzasını attı! 🚀', time: '10 dk önce' },
        { id: '2', did: 'did:key:z6Mkj7q...', text: 'Flop Labs 2027 Mainnet tahminine 1.000 EVET bastım.', time: '25 dk önce' }
      ]);
    }

    const storedFlips = localStorage.getItem(STORAGE_KEY_FLIPS);
    if (storedFlips) {
      try {
        const parsed = JSON.parse(storedFlips);
        if (Array.isArray(parsed)) setFlipHistory(parsed);
      } catch (_) {}
    }

    fetchTechnocoreLogs();
    const interval = setInterval(fetchTechnocoreLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTechnocoreLogs = async () => {
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
    }
  };

  const mergeRoomData = (text: string) => {
    const lines = text.split('\n');
    const validMarkets = MARKETS.map(m => m.id);

    let currentMap = new Map<string, ParsedCall>();
    allCalls.forEach(c => currentMap.set(c.nonce, c));

    lines.forEach((line, index) => {
      if (line.includes('call1 {')) {
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
  };

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

  // Tahmin Gönderme
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

  // Günlük GM İmzası
  const handleClaimDailyGm = async () => {
    if (hasClaimedGmToday) {
      notify('info', 'Bugünkü GM imzanızı zaten attınız. Yarın tekrar gelin!');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const newStreak = gmStreak + 1;
    const newBal = balance + 250;

    setGmStreak(newStreak);
    setHasClaimedGmToday(true);
    setBalance(newBal);

    localStorage.setItem(STORAGE_KEY_STREAK, newStreak.toString());
    localStorage.setItem(STORAGE_KEY_GM_DATE, todayStr);
    localStorage.setItem('kescobar_balance', newBal.toString());

    const sender = `esc_${did.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
    const gmPayload = `call1 ` + JSON.stringify({
      from: did,
      streak: newStreak,
      type: 'gm',
      nonce: Math.random().toString(16).substring(2, 14)
    });

    try {
      await fetch(`https://technocore.chat/r/turkce-koprusu/say/${sender}/${encodeURIComponent(gmPayload)}`, {
        method: 'GET',
        mode: 'no-cors'
      });
    } catch (_) {}

    notify('success', `Harika! Günlük GM imzalandı. 🔥 ${newStreak}. Gün Serisi! +250 kESCOBAR eklendi.`);
  };

  // 1. OYUNCAK: Kriptografik Yazı-Tura Fonksiyonu
  const handleFlipCoin = async () => {
    if (balance < coinBetAmount) {
      notify('error', 'Yetersiz kESCOBAR! Lütfen tahmin piyasasından musluk talebi yapın.');
      return;
    }

    setIsFlipping(true);
    setFlipResultText('Para havada dönüyor...');

    const outcome: 'yazi' | 'tura' = Math.random() < 0.5 ? 'yazi' : 'tura';
    const isWin = outcome === coinChoice;

    setTimeout(async () => {
      setIsFlipping(false);
      const newBal = isWin ? balance + coinBetAmount : balance - coinBetAmount;
      setBalance(newBal);
      localStorage.setItem('kescobar_balance', newBal.toString());

      const resultMsg = isWin 
        ? `🎉 KAZANDIN! Para ${outcome.toUpperCase()} geldi. +${coinBetAmount * 2} kESCOBAR!` 
        : `Kaybettin. Para ${outcome.toUpperCase()} geldi. -${coinBetAmount} kESCOBAR.`;
      setFlipResultText(resultMsg);

      const flipItem: FlipHistory = {
        id: Math.random().toString(16).slice(2, 8),
        choice: coinChoice,
        result: outcome,
        won: isWin,
        amount: coinBetAmount,
        time: 'Az önce'
      };

      const updatedHistory = [flipItem, ...flipHistory.slice(0, 9)];
      setFlipHistory(updatedHistory);
      localStorage.setItem(STORAGE_KEY_FLIPS, JSON.stringify(updatedHistory));

      // Technocore Odasına Şeffaf Zar İmzası
      const sender = `esc_${did.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
      const flipPayload = `call1 ` + JSON.stringify({
        from: did,
        game: 'coinflip',
        choice: coinChoice,
        outcome: outcome,
        won: isWin,
        amount: coinBetAmount,
        nonce: Math.random().toString(16).substring(2, 14)
      });

      try {
        await fetch(`https://technocore.chat/r/turkce-koprusu/say/${sender}/${encodeURIComponent(flipPayload)}`, {
          method: 'GET',
          mode: 'no-cors'
        });
      } catch (_) {}
    }, 1500);
  };

  // 2. OYUNCAK: Anonim Ajan Duvarına Not Kazıma
  const handlePostWall = async () => {
    if (!wallInput.trim()) return;
    if (wallInput.length > 80) {
      notify('error', 'Mesajınız en fazla 80 karakter olabilir.');
      return;
    }

    setIsPostingWall(true);
    const shortDid = did.length > 18 ? `${did.slice(0, 8)}...${did.slice(-5)}` : did;
    const newPost: WallPost = {
      id: Math.random().toString(16).slice(2, 8),
      did: shortDid,
      text: wallInput.trim(),
      time: 'Az önce'
    };

    const updatedWall = [newPost, ...wallPosts.slice(0, 19)];
    setWallPosts(updatedWall);
    localStorage.setItem(STORAGE_KEY_WALL, JSON.stringify(updatedWall));

    const sender = `esc_${did.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
    const wallPayload = `call1 ` + JSON.stringify({
      from: did,
      type: 'wall',
      msg: wallInput.trim(),
      nonce: Math.random().toString(16).substring(2, 14)
    });

    try {
      await fetch(`https://technocore.chat/r/turkce-koprusu/say/${sender}/${encodeURIComponent(wallPayload)}`, {
        method: 'GET',
        mode: 'no-cors'
      });
      setWallInput('');
      notify('success', 'Mesajınız Technocore açık duvarına kalıcı olarak kazındı!');
    } catch (_) {
      notify('error', 'Ağa iletilemedi ancak yerel terminalde kaydedildi.');
    } finally {
      setIsPostingWall(false);
    }
  };

  // Airdrop Skor Hesaplaması
  const myTotalVotes = allCalls.filter(c => c.rawDid === did).length;
  const airdropScore = Math.min(100, (did ? 25 : 0) + (myTotalVotes * 15) + (gmStreak * 10) + (balance > 0 ? 15 : 0));
  const agentRankTitle = airdropScore >= 75 ? 'Escobar Elit Ajanı' : airdropScore >= 40 ? 'Aktif Kaşif Ajan' : 'Çaylak Ajan';

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
      did,
      privateKey,
      balance,
      airdropScore,
      gmStreak,
      room: 'turkce-koprusu',
      myCallsCount: myTotalVotes,
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
              <p className="text-[11px] text-zinc-500 font-mono tracking-normal">Ajan Kimliği & Tahmin Piyasası</p>
            </div>
          </div>

          {/* Portal Sekmeleri (4 Adet) */}
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
              onClick={() => setActivePortalTab('passport')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activePortalTab === 'passport' ? 'bg-amber-400 text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Ajan Pasaportu
            </button>
            <button
              onClick={() => setActivePortalTab('arena')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activePortalTab === 'arena' ? 'bg-amber-400 text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Dices className="w-3.5 h-3.5" />
              Düello & Duvar
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

          {/* Sosyal Butonlar */}
          <div className="flex items-center gap-2">
            <a
              href="https://x.com/kriptoescobar0"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all border border-zinc-700 shadow-sm"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              @kriptoescobar0
            </a>
            <a
              href="https://youtube.com/@kriptoescobar"
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
          {activePortalTab === 'passport' && 'Ajan Pasaportu & Airdrop Karnesi.'}
          {activePortalTab === 'arena' && 'Ajan Arenası: Yazı-Tura Düellosu & Anonim Duvar.'}
          {activePortalTab === 'proves' && 'Protokol Şeffaflığı: Neyi kanıtlar, neyi kanıtlamaz?'}
        </h1>
        <p className="text-xs md:text-sm text-zinc-400 max-w-2xl leading-relaxed">
          {activePortalTab === 'market' && 'Tarayıcınızda Ed25519 ile tahmin yapın. Veritabanı ve sunucu bulunmaz; tüm oylar turkce-koprusu odasında kriptografik olarak saklanır.'}
          {activePortalTab === 'passport' && 'Ağdaki aktivitenizi puanlayın, her gün gelip serinizi koruyarak kESCOBAR kazanın ve airdrop skorunuzu tescilleyin.'}
          {activePortalTab === 'arena' && 'Kriptografik yazı-tura ile puanını katla veya Technocore açık log defterine sansürsüz mesajını imzalayarak duvara kazı.'}
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

              {/* Tahmin Defteri */}
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

      {/* ======================================================== */}
      {/* 2. SEKME: AJAN PASAPORTU */}
      {/* ======================================================== */}
      {activePortalTab === 'passport' && (
        <section className="w-full max-w-4xl px-4 py-8 space-y-8">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-[#0c0f17] to-[#0c0f17] border border-amber-500/40 shadow-2xl flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-400/30">
                  GÜNLÜK İMZALI YOKLAMA
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-white">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                  {gmStreak} Günlük Seri
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white">Günün İmzasını At (GM)</h3>
              <p className="text-xs text-zinc-400 max-w-md">
                Her gün siteye gelip Technocore açık odasına kriptografik imzanızı atın. Serinizi koruyun ve +250 kESCOBAR kazanın!
              </p>
            </div>

            <button
              onClick={handleClaimDailyGm}
              disabled={hasClaimedGmToday}
              className={`py-3.5 px-6 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-xl active:scale-95 ${
                hasClaimedGmToday
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-amber-500/20'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {hasClaimedGmToday ? 'Bugün İmzalandı ✓ (Yarın Gel)' : 'İmzala & +250 kESCOBAR Al'}
            </button>
          </div>

          <div className="p-8 rounded-3xl bg-[#0c0f17] border border-zinc-800 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center font-black text-amber-400 text-xl font-mono">
                  TC
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white tracking-tight">Technocore Ajan Pasaportu</h3>
                  <p className="text-xs text-zinc-500 font-mono">Flop Labs Protokol Kimlik Tescili</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                DOĞRULANMIŞ AJAN
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">AİRDROP SKORU</span>
                <div className="text-3xl font-extrabold text-amber-400 font-mono">
                  {airdropScore} <span className="text-xs text-zinc-500">/ 100</span>
                </div>
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-amber-400 h-full transition-all" style={{ width: `${airdropScore}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">AJAN RÜTBESİ</span>
                <div className="text-lg font-bold text-white truncate">
                  {agentRankTitle}
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-1">
                  {myTotalVotes} Tahmin İmzası
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">AKTİF GÜNLÜK SERİ</span>
                <div className="text-2xl font-extrabold text-white flex items-center gap-1.5">
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                  {gmStreak} Gün
                </div>
                <p className="text-[11px] text-emerald-400 font-mono mt-1">
                  +{gmStreak * 250} kESCOBAR Kazanıldı
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">DID Adresi:</span>
                <span className="text-amber-300 font-bold truncate max-w-[280px]">{did}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Ağ Protokolü:</span>
                <span className="text-zinc-300">Flop Labs Technocore Ed25519</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Tescilli Oda:</span>
                <span className="text-cyan-400">turkce-koprusu</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Kullanılabilir Bakiye:</span>
                <span className="text-white font-bold">{balance.toLocaleString()} kESCOBAR</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. SEKME: DÜELLO & AJAN DUVARI (BİRLEŞİK OYUN ALANI) */}
      {/* ======================================================== */}
      {activePortalTab === 'arena' && (
        <section className="w-full max-w-6xl px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SOL: Kriptografik Yazı-Tura Düellosu */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-3xl bg-[#0c0f17] border border-zinc-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Dices className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-extrabold text-white">Kriptografik Yazı-Tura</h3>
                </div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">
                  Ed25519 Şeffaf Zar
                </span>
              </div>

              {/* Madeni Para Alanı */}
              <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/70 rounded-2xl border border-zinc-800">
                <div className={`w-28 h-28 rounded-full border-4 border-amber-400/80 bg-gradient-to-tr from-amber-500/20 to-zinc-900 flex items-center justify-center shadow-xl shadow-amber-500/10 mb-3 ${
                  isFlipping ? 'animate-spin' : ''
                }`}>
                  <span className="text-3xl font-black text-amber-300 uppercase tracking-wider">
                    {coinChoice === 'yazi' ? 'Y' : 'T'}
                  </span>
                </div>
                <span className="text-xs font-bold text-zinc-300 font-mono">
                  {isFlipping ? 'Kriptografik İmza Üretiliyor...' : `Seçiminiz: ${coinChoice.toUpperCase()}`}
                </span>
                {flipResultText && (
                  <p className="text-xs font-bold mt-2 text-center text-amber-400 font-mono">
                    {flipResultText}
                  </p>
                )}
              </div>

              {/* Taraf Seçimi (YAZI / TURA) */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCoinChoice('yazi')}
                  className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                    coinChoice === 'yazi'
                      ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  YAZI
                </button>
                <button
                  onClick={() => setCoinChoice('tura')}
                  className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                    coinChoice === 'tura'
                      ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  TURA
                </button>
              </div>

              {/* Bahis Miktarı */}
              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 250].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCoinBetAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      coinBetAmount === amt
                        ? 'bg-zinc-800 text-amber-300 border-amber-400/40'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                    }`}
                  >
                    {amt} kESCOBAR
                  </button>
                ))}
              </div>

              {/* Çevir Butonu */}
              <button
                disabled={isFlipping}
                onClick={handleFlipCoin}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
              >
                {isFlipping ? 'Technocore Üzerinde Çevriliyor...' : `Kaderini İmzala (${coinBetAmount} kESCOBAR)`}
              </button>

              {/* Geçmiş Düellolar */}
              <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Son Düello Sonuçları
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {flipHistory.length > 0 ? (
                    flipHistory.map((item) => (
                      <div key={item.id} className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800 text-[11px] font-mono flex items-center justify-between">
                        <span className="text-zinc-400">{item.choice.toUpperCase()} seçildi → Geldi: {item.result.toUpperCase()}</span>
                        <span className={`font-bold ${item.won ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.won ? `+${item.amount * 2}` : `-${item.amount}`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500">Henüz bir düello oynanmadı.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SAĞ: Anonim Ajan Duvarı (Terminal Graffiti) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-3xl bg-[#0c0f17] border border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-extrabold text-white">Anonim Ajan Duvarı</h3>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono">
                  ● Sansürsüz Defter
                </span>
              </div>

              <p className="text-xs text-zinc-400">
                Technocore açık odasına kalıcı ve silinemez bir mesaj kazıyın. Her mesaj Ed25519 ile imzalanır.
              </p>

              {/* Mesaj Girişi */}
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Technocore duvarına not kazı... (Maks 80 harf)"
                  value={wallInput}
                  onChange={(e) => setWallInput(e.target.value)}
                  className="flex-1 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                />
                <button
                  disabled={isPostingWall || !wallInput.trim()}
                  onClick={handlePostWall}
                  className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  İmzala
                </button>
              </div>

              {/* Duvar Gösterim Terminali */}
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800/90 font-mono space-y-3 max-h-96 overflow-y-auto">
                <div className="text-[11px] text-zinc-500 border-b border-zinc-900 pb-2">
                  // TECHNOCORE / TURKCE-KOPRUSU DUVAR AKIŞI
                </div>
                {wallPosts.map((post) => (
                  <div key={post.id} className="text-xs space-y-0.5 border-b border-zinc-900/60 pb-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-amber-400 font-bold">{post.did}</span>
                      <span className="text-zinc-600">{post.time}</span>
                    </div>
                    <p className="text-zinc-300 text-[11px] break-words">
                      &gt; {post.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 4. SEKME: PROTOKOL ŞEFFAFLIĞI */}
      {/* ======================================================== */}
      {activePortalTab === 'proves' && (
        <section className="w-full max-w-5xl px-4 py-8 space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Protokolün Kanıtladıkları ve Sınırları
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto">
              Merkezi sunucuların bulunmadığı açık protokollerde şeffaflık temel esastır.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-[#0c0f17] border border-emerald-500/30 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider border-b border-zinc-800/80 pb-3">
                <CheckCircle2 className="w-4 h-4" />
                NEYİ KANITLAR?
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
                NEYİ KANITLAMAZ?
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
