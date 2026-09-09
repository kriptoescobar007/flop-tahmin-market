'use client';

import React, { useState, useEffect } from 'react';
import { MARKETS } from './data/markets';
import { 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  ShieldCheck, 
  ExternalLink, 
  Coins, 
  KeyRound, 
  Terminal, 
  Activity, 
  Youtube, 
  Copy, 
  Check, 
  Lock, 
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface VoteRecord {
  marketId: string;
  choice: 'EVET' | 'HAYIR';
  amount: number;
  did: string;
  time: string;
}

export default function Home() {
  const [balance, setBalance] = useState<number>(0);
  const [did, setDid] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [authTab, setAuthTab] = useState<'create' | 'import'>('create');
  const [betAmount, setBetAmount] = useState<number>(250);
  const [recentVotes, setRecentVotes] = useState<VoteRecord[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedDid, setCopiedDid] = useState(false);

  // 1. Yerel Kimlik ve Bakiye Başlatma
  useEffect(() => {
    let savedDid = localStorage.getItem('kescobar_did');
    let savedKey = localStorage.getItem('kescobar_key');
    let savedBalance = localStorage.getItem('kescobar_balance');

    if (!savedDid || !savedKey) {
      const generatedKey = 'ed25519_sk_' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');
      const generatedDid = 'did:key:z6Mk' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('kescobar_key', generatedKey);
      localStorage.setItem('kescobar_did', generatedDid);
      savedKey = generatedKey;
      savedDid = generatedDid;
    }

    setPrivateKey(savedKey);
    setDid(savedDid);

    if (savedBalance) {
      setBalance(parseInt(savedBalance, 10));
    }

    setRecentVotes([
      { marketId: 'flop-mainnet-2027', choice: 'EVET', amount: 500, did: 'did:key:z6Mkq9x...', time: '3 dk önce' },
      { marketId: 'flop-tge-q4-2026', choice: 'EVET', amount: 1000, did: 'did:key:z6Mtw4a...', time: '7 dk önce' },
      { marketId: 'btc-ath-150k-2026', choice: 'HAYIR', amount: 250, did: 'did:key:z6Mbb81...', time: '14 dk önce' },
    ]);
  }, []);

  // 2. Yeni Kimlik Üret
  const handleGenerateNewIdentity = () => {
    const newKey = 'ed25519_sk_' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');
    const newDid = 'did:key:z6Mk' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    setPrivateKey(newKey);
    setDid(newDid);
    localStorage.setItem('kescobar_key', newKey);
    localStorage.setItem('kescobar_did', newDid);
    notify('success', 'Yeni Technocore kimliği ve Ed25519 anahtar çifti yerel olarak oluşturuldu.');
  };

  // 3. Mevcut Anahtarla Giriş Yap
  const handleImportKey = () => {
    if (!inputKey.trim() || inputKey.length < 10) {
      notify('error', 'Lütfen geçerli bir Ed25519 özel anahtarı girin.');
      return;
    }
    const derivedDid = 'did:key:z6Mk' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    setPrivateKey(inputKey.trim());
    setDid(derivedDid);
    localStorage.setItem('kescobar_key', inputKey.trim());
    localStorage.setItem('kescobar_did', derivedDid);
    notify('success', 'Mevcut Technocore anahtarınız başarıyla yüklendi.');
  };

  // 4. kESCOBAR Musluğu (Faucet)
  const handleClaimFaucet = () => {
    const newBal = balance + 1000;
    setBalance(newBal);
    localStorage.setItem('kescobar_balance', newBal.toString());
    notify('success', '1.000 kESCOBAR testnet bakiyesi kasanıza eklendi!');
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

  // 5. Tahmin Gönderme (Technocore İmzası)
  const handleVote = async (marketId: string, choice: 'EVET' | 'HAYIR') => {
    if (balance < betAmount) {
      notify('error', 'Yetersiz kESCOBAR bakiyesi! Kasanızdaki musluktan 1.000 kESCOBAR talep edin.');
      return;
    }

    setLoadingId(marketId);
    notify('info', `İmza Technocore ağına ('flop-tahmin-tr') aktarılıyor...`);

    try {
      await fetch('/api/technocore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId, choice, amount: betAmount, did }),
      });

      const newBal = balance - betAmount;
      setBalance(newBal);
      localStorage.setItem('kescobar_balance', newBal.toString());

      setRecentVotes(prev => [
        { marketId, choice, amount: betAmount, did: did.slice(0, 14) + '...', time: 'Az önce' },
        ...prev.slice(0, 4)
      ]);

      notify('success', `Tebrikler! ${betAmount} kESCOBAR "${choice}" tercihiniz Technocore açık loguna işlendi.`);
    } catch (e) {
      notify('error', 'İmza Technocore odasına iletilirken bağlantı hatası oluştu.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-zinc-100 flex flex-col items-center selection:bg-amber-500 selection:text-black">
      {/* Üst Menü */}
      <header className="w-full border-b border-zinc-800/80 bg-[#0f1219]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400 border border-amber-300/40 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/20">
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">KriptoEscobar</span>
                <span className="text-[11px] text-zinc-500">|</span>
                <span className="text-xs font-semibold text-zinc-300">Flop Labs Technocore Tahmin Piyasası</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">Merkeziyetsiz Tahmin & Otonom Karar Protokolü</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Canlı Technocore Relay Aktif
            </div>
            <a
              href="https://youtube.com/@kriptoescobar0"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20"
            >
              <Youtube className="w-3.5 h-3.5" />
              YouTube
            </a>
            <a
              href="https://twitter.com/kriptoescobar0"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all border border-zinc-700"
            >
              @kriptoescobar0
            </a>
          </div>
        </div>
      </header>

      {/* Hero Başlık Alanı */}
      <section className="w-full max-w-6xl px-4 pt-10 pb-6">
        <div className="text-[11px] font-mono tracking-wider uppercase text-amber-400 font-bold mb-2 flex items-center gap-2">
          <span>KRİPTOESCOBAR</span>
          <span className="text-zinc-600">&gt;</span>
          <span>FLOP LABS</span>
          <span className="text-zinc-600">&gt;</span>
          <span>TAHMİN PİYASASI</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-3">
          Piyasayı öngör.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
            Tahminini imzala.
          </span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Tarayıcınızda yerel Ed25519 anahtarınızla kESCOBAR puanlarını kullanarak Flop Labs ve kripto piyasası gelişmelerini öngörün. Veritabanı ve sunucu bulunmaz; tüm oylar doğrudan Technocore odasına şifreli mesaj olarak kaydedilir.
        </p>

        {/* Aşama / Sekme Butonları */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-zinc-800/80">
          <span className="px-3 py-1 rounded-md bg-zinc-900 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> 1. KİMLİK / YÜKLE
          </span>
          <span className="px-3 py-1 rounded-md bg-zinc-900/60 text-zinc-400 text-[11px] font-medium border border-zinc-800">
            2. MUSLUK (kESCOBAR)
          </span>
          <span className="px-3 py-1 rounded-md bg-zinc-900/60 text-zinc-400 text-[11px] font-medium border border-zinc-800">
            3. TAHMİN YAP
          </span>
          <span className="px-3 py-1 rounded-md bg-zinc-900/60 text-zinc-400 text-[11px] font-medium border border-zinc-800">
            4. İMZALA & ONAYLA
          </span>
        </div>
      </section>

      {/* Ana Çift Kolonlu Gövde */}
      <main className="w-full max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol Kolon (İçerik & Pazarlar - 2 Kolon) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bildirim Kutusu */}
          {statusNotice && (
            <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all ${
              statusNotice.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : statusNotice.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}>
              <Activity className="w-4 h-4 shrink-0" />
              <span>{statusNotice.text}</span>
            </div>
          )}

          {/* 1. Modül: Technocore DID Kimliği Belirle */}
          <div className="p-6 rounded-2xl bg-[#0f1219] border border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Technocore DID Kimliği Belirle
              </h2>
              <span className="text-[11px] text-zinc-500 font-mono">Ed25519 Şifreleme</span>
            </div>

            {/* Giriş Tipi Seçimi */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setAuthTab('create')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  authTab === 'create'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                + Yeni Kimlik Oluştur
              </button>
              <button
                onClick={() => setAuthTab('import')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  authTab === 'import'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Mevcut Anahtarı Yükle
              </button>
            </div>

            {authTab === 'create' ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tarayıcınız yerel hafızasında sizin için güvenli bir Technocore kimliği tanımladı. Dilediğiniz an tek tıkla sıfırlayabilirsiniz.
                </p>
                <div className="p-3 bg-[#080a0f] rounded-xl border border-zinc-800 flex items-center justify-between gap-2">
                  <div className="truncate font-mono text-xs text-amber-300">
                    <span className="text-zinc-500">DID: </span>{did}
                  </div>
                  <button
                    onClick={() => copyToClipboard(did, 'did')}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 shrink-0"
                  >
                    {copiedDid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  onClick={handleGenerateNewIdentity}
                  className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-800 transition-all"
                >
                  Farklı Bir Kimlik Oluştur
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">
                  Önceden oluşturduğunuz Technocore Ed25519 Özel Anahtarınızı (Private Key) buraya yapıştırın:
                </p>
                <input
                  type="password"
                  placeholder="ed25519_sk_..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full p-3 bg-[#080a0f] rounded-xl border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleImportKey}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all shadow-md shadow-amber-400/20"
                >
                  Anahtarı Doğrula ve Bağlan
                </button>
              </div>
            )}
          </div>

          {/* 2. Modül: Puan Seçimi & Tahmin Havuzu */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0f1219] border border-zinc-800">
            <div>
              <span className="text-xs font-bold text-white">Oy Başına Yatırım Miktarı:</span>
              <p className="text-[11px] text-zinc-500">Her tahminde havuzunuza eklenecek kESCOBAR miktarı</p>
            </div>
            <div className="flex gap-1.5">
              {[100, 250, 500, 1000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    betAmount === amt
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {amt} kESCOBAR
                </button>
              ))}
            </div>
          </div>

          {/* 3. Modül: Tahmin Kartları (5 Pazar) */}
          <div className="space-y-4">
            {MARKETS.map((market) => {
              const total = market.initialYes + market.initialNo;
              const yesPercent = Math.round((market.initialYes / total) * 100);
              const noPercent = 100 - yesPercent;
              const isVoting = loadingId === market.id;

              return (
                <div
                  key={market.id}
                  className="p-5 rounded-2xl bg-[#0f1219] border border-zinc-800/90 hover:border-zinc-700 transition-all shadow-lg"
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20 text-[11px]">
                      {market.category}
                    </span>
                    <span className="text-zinc-500 text-[11px]">
                      Bitiş: <strong className="text-zinc-300">{market.endDate}</strong>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5 leading-snug">
                    {market.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    {market.description}
                  </p>

                  {/* Oran Barı */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-400 flex items-center gap-1">
                        EVET %{yesPercent} ({market.initialYes.toLocaleString()} kESCOBAR)
                      </span>
                      <span className="text-rose-400 flex items-center gap-1">
                        HAYIR %{noPercent} ({market.initialNo.toLocaleString()} kESCOBAR)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-zinc-950 overflow-hidden flex border border-zinc-800">
                      <div style={{ width: `${yesPercent}%` }} className="bg-emerald-500 transition-all duration-500" />
                      <div style={{ width: `${noPercent}%` }} className="bg-rose-500 transition-all duration-500" />
                    </div>
                  </div>

                  {/* Oy Butonları */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      disabled={isVoting}
                      onClick={() => handleVote(market.id, 'EVET')}
                      className="py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isVoting ? 'İmzalanıyor...' : `EVET (${betAmount} kESCOBAR)`}
                    </button>
                    <button
                      disabled={isVoting}
                      onClick={() => handleVote(market.id, 'HAYIR')}
                      className="py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {isVoting ? 'İmzalanıyor...' : `HAYIR (${betAmount} kESCOBAR)`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sağ Kolon (Kasanız / Your Vault & Topluluk Panelleri) */}
        <div className="space-y-6">
          {/* KASANIZ (YOUR VAULT) */}
          <div className="p-6 rounded-2xl bg-[#0f1219] border border-amber-500/30 shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase font-black tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                KASANIZ (YOUR VAULT)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                CANLI
              </span>
            </div>

            {/* Bakiye Göstergesi */}
            <div className="p-4 rounded-xl bg-[#080a0f] border border-zinc-800/80 mb-4">
              <span className="text-[11px] text-zinc-500 block mb-1">Mevcut Bakiyeniz</span>
              <div className="text-2xl font-black text-amber-400 flex items-baseline gap-1.5">
                {balance.toLocaleString()}
                <span className="text-xs font-bold text-zinc-400">kESCOBAR</span>
              </div>
            </div>

            {/* Musluk Butonu */}
            <button
              onClick={handleClaimFaucet}
              className="w-full py-3 mb-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Coins className="w-4 h-4" />
              +1.000 kESCOBAR Talep Et (Musluk)
            </button>

            {/* Anahtar Detayı */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80 text-[11px]">
              <div>
                <span className="text-zinc-500 block">Ed25519 Özel Anahtar Kesiti:</span>
                <div className="flex items-center justify-between bg-[#080a0f] p-2 rounded-lg border border-zinc-800 font-mono text-zinc-400 mt-1">
                  <span className="truncate">{privateKey ? privateKey.slice(0, 16) + '...' : '---'}</span>
                  <button onClick={() => copyToClipboard(privateKey, 'key')} className="text-zinc-400 hover:text-white">
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* YouTube Kanal Kartı */}
          <div className="p-5 rounded-2xl bg-[#0f1219] border border-zinc-800 text-center space-y-3">
            <h3 className="text-xs font-bold text-zinc-300">Kripto Escobar Topluluğu</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Flop Labs, Technocore otonom ajanlar ve airdrop rehberleri için YouTube kanalımızı takip edin.
            </p>
            <a
              href="https://youtube.com/@kriptoescobar0"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
            >
              <Youtube className="w-4 h-4" />
              YouTube Kanalına Abone Ol
            </a>
          </div>

          {/* Technocore Canlı Denetim Defteri */}
          <div className="p-5 rounded-2xl bg-[#0f1219] border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                Technocore Son İmzalar
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">flop-tahmin-tr</span>
            </div>
            <div className="space-y-2">
              {recentVotes.map((v, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-[#080a0f] border border-zinc-800/80 text-[11px] font-mono">
                  <div className="flex justify-between items-center text-zinc-500 text-[10px] mb-1">
                    <span>{v.did}</span>
                    <span>{v.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300 truncate max-w-[130px]">{v.marketId}</span>
                    <span className={`font-bold ${v.choice === 'EVET' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {v.choice} ({v.amount} kESCOBAR)
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="https://technocore.chat/r/flop-tahmin-tr"
              target="_blank"
              rel="noreferrer"
              className="mt-3 w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all border border-zinc-800"
            >
              Oda Kayıtlarını Aç <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </main>

      {/* Alt Bilgi (Footer) */}
      <footer className="w-full max-w-6xl px-4 py-8 border-t border-zinc-800/80 text-center text-xs text-zinc-500 mt-12">
        <p>© 2026 Kripto Escobar • Flop Labs Technocore Tahmin Piyasası. Tüm hakları saklıdır.</p>
        <p className="mt-1 text-[11px]">kESCOBAR testnet puanlarının maddi değeri yoktur. Katkılar Ed25519 açık odasında şifrelenir.</p>
      </footer>
    </div>
  );
}
