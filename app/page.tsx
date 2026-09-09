'use client';

import React, { useState, useEffect } from 'react';
import { MARKETS } from './data/markets';
import { CheckCircle2, XCircle, Trophy, ShieldCheck } from 'lucide-react';

interface VoteState {
  [marketId: string]: {
    yes: number;
    no: number;
    userVoted?: 'EVET' | 'HAYIR';
  };
}

export default function Home() {
  const [balance, setBalance] = useState<number>(1000);
  const [did, setDid] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(250);
  const [marketStats, setMarketStats] = useState<VoteState>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string>('');

  useEffect(() => {
    let savedDid = localStorage.getItem('flop_user_did');
    if (!savedDid) {
      savedDid = 'did:key:z6Mk' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('flop_user_did', savedDid);
    }
    setDid(savedDid);

    const savedBalance = localStorage.getItem('flop_user_balance');
    if (savedBalance) {
      setBalance(parseInt(savedBalance, 10));
    } else {
      localStorage.setItem('flop_user_balance', '1000');
    }

    const initialStats: VoteState = {};
    MARKETS.forEach(m => {
      initialStats[m.id] = { yes: m.initialYes, no: m.initialNo };
    });
    setMarketStats(initialStats);
  }, []);

  const handleVote = async (marketId: string, choice: 'EVET' | 'HAYIR') => {
    if (balance < betAmount) {
      setStatusNotice('Yetersiz bakiye! Tahmin yapmak için yeterli PAPER puanınız yok.');
      setTimeout(() => setStatusNotice(''), 4000);
      return;
    }

    setLoadingId(marketId);
    setStatusNotice('Tahmininiz Technocore ağına kaydediliyor...');

    try {
      await fetch('/api/technocore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          choice,
          amount: betAmount,
          did
        }),
      });

      const newBal = balance - betAmount;
      setBalance(newBal);
      localStorage.setItem('flop_user_balance', newBal.toString());

      setMarketStats(prev => {
        const cur = prev[marketId] || { yes: 0, no: 0 };
        return {
          ...prev,
          [marketId]: {
            yes: choice === 'EVET' ? cur.yes + betAmount : cur.yes,
            no: choice === 'HAYIR' ? cur.no + betAmount : cur.no,
            userVoted: choice
          }
        };
      });

      setStatusNotice(`Başarılı! ${betAmount} PAPER ile "${choice}" tercihiniz Technocore odasına işlendi.`);
    } catch (e) {
      setStatusNotice('Tahmin kaydedilirken bir hata oluştu.');
    } finally {
      setLoadingId(null);
      setTimeout(() => setStatusNotice(''), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex flex-col items-center">
      <header className="w-full max-w-5xl px-4 py-6 border-b border-surfaceBorder flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-black text-xl">
            F
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Flop Tahmin Piyasası
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Technocore Testnet
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Veritabanı yok. Tüm oylar Technocore açık odasında tutulur.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-surface border border-surfaceBorder px-4 py-2 rounded-2xl">
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">Puan:</span>
            <span className="font-bold text-white tracking-wide">{balance.toLocaleString()} PAPER</span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {did ? did.slice(0, 12) + '...' + did.slice(-4) : 'Yükleniyor...'}
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl px-4 py-8 flex-1">
        {statusNotice && (
          <div className="mb-6 p-4 rounded-xl bg-zinc-800/80 border border-zinc-700 text-sm text-center font-medium text-emerald-300">
            {statusNotice}
          </div>
        )}

        <div className="mb-8 p-4 rounded-2xl bg-surface border border-surfaceBorder flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm">
            <span className="font-semibold text-white">Oy Başına Yatırılacak Puan:</span>
            <p className="text-xs text-zinc-400">Her tahmin için havuzunuza eklemek istediğiniz PAPER miktarını seçin.</p>
          </div>
          <div className="flex gap-2">
            {[100, 250, 500, 1000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  betAmount === amt
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {amt} PAPER
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          {MARKETS.map((market) => {
            const stats = marketStats[market.id] || { yes: 1, no: 1 };
            const total = stats.yes + stats.no;
            const yesPercent = Math.round((stats.yes / total) * 100);
            const noPercent = 100 - yesPercent;
            const isVoting = loadingId === market.id;

            return (
              <div
                key={market.id}
                className="p-6 rounded-2xl bg-surface border border-surfaceBorder hover:border-zinc-700 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {market.category}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Bitiş: <strong className="text-zinc-300">{market.endDate}</strong>
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                  {market.title}
                </h3>
                <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
                  {market.description}
                </p>

                <div className="space-y-1.5 mb-5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-emerald-400 flex items-center gap-1">
                      EVET {yesPercent}% ({stats.yes.toLocaleString()} PAPER)
                    </span>
                    <span className="text-rose-400 flex items-center gap-1">
                      HAYIR {noPercent}% ({stats.no.toLocaleString()} PAPER)
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                    <div
                      style={{ width: `${yesPercent}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                    />
                    <div
                      style={{ width: `${noPercent}%` }}
                      className="bg-rose-500 transition-all duration-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={isVoting}
                    onClick={() => handleVote(market.id, 'EVET')}
                    className="py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isVoting ? 'Kaydediliyor...' : `EVET (${betAmount} Puan)`}
                  </button>
                  <button
                    disabled={isVoting}
                    onClick={() => handleVote(market.id, 'HAYIR')}
                    className="py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {isVoting ? 'Kaydediliyor...' : `HAYIR (${betAmount} Puan)`}
                  </button>
                </div>

                {stats.userVoted && (
                  <div className="mt-3 text-center text-xs font-medium text-zinc-400">
                    Bu piyasadaki tercihiniz: <strong className="text-white">{stats.userVoted}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <footer className="w-full max-w-5xl px-4 py-8 border-t border-surfaceBorder text-center text-xs text-zinc-500">
        <p>Bu platform bağımsız bir topluluk projesidir. PAPER puanlarının maddi değeri yoktur.</p>
        <p className="mt-1">Tüm tahmin verileri Flop Labs Technocore açık odasında tutulmaktadır.</p>
      </footer>
    </div>
  );
}