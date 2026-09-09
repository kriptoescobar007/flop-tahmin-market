export interface Market {
  id: string;
  category: string;
  title: string;
  description: string;
  endDate: string;
  initialYes: number;
  initialNo: number;
}

export const MARKETS: Market[] = [
  {
    id: "flop-mainnet-2027",
    category: "Flop Labs",
    title: "Flop Labs Mainnet ağı 31 Mart 2027 tarihine kadar resmen başlatılacak mı?",
    description: "Arthur Hayes ve Flop Labs duyurularına göre genesis bloğunun belirtilen tarihe kadar faaliyete geçmesi şarttır.",
    endDate: "31 Mart 2027",
    initialYes: 15000,
    initialNo: 5000
  },
  {
    id: "flop-tge-q4-2026",
    category: "Airdrop & TGE",
    title: "FLOP Token TGE ve Topluluk Airdrop dağıtımı 2026 Q4 içinde gerçekleşecek mi?",
    description: "Testnet ve Technocore katılımcılarına yönelik token dağıtımının 31 Aralık 2026'dan önce başlaması durumunda EVET olarak sonuçlanır.",
    endDate: "31 Aralık 2026",
    initialYes: 22000,
    initialNo: 8000
  },
  {
    id: "btc-ath-150k-2026",
    category: "Kripto / Makro",
    title: "Bitcoin (BTC) fiyatı 2026 yılı bitmeden 150.000$ seviyesine ulaşacak mı?",
    description: "Binance veya Coinbase spot tahtasında 2026 bitmeden 150.000 USDT/USD seviyesinin görülmesi halinde EVET kabul edilir.",
    endDate: "31 Aralık 2026",
    initialYes: 18000,
    initialNo: 12000
  },
  {
    id: "eth-new-ath-2026",
    category: "Ethereum",
    title: "Ethereum (ETH) 2026 yılı içerisinde tüm zamanların en yüksek seviyesini (4.891$+) aşacak mı?",
    description: "ETH spot piyasa fiyatının önceki döngü zirvesini yenileyip yenilemeyeceğine dair topluluk tahmini.",
    endDate: "31 Aralık 2026",
    initialYes: 14000,
    initialNo: 16000
  },
  {
    id: "sol-flipping-eth-2026",
    category: "Piyasa Sıralaması",
    title: "Solana (SOL) piyasa değeri, 2026 bitmeden Ethereum'u (ETH) geride bırakacak mı?",
    description: "CoinMarketCap veya CoinGecko verilerine göre SOL piyasa değerinin ETH'yi en az 1 saatliğine dahi olsa geçmesi yeterlidir.",
    endDate: "31 Aralık 2026",
    initialYes: 9000,
    initialNo: 21000
  }
];