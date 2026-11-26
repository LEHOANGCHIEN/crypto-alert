/** Full names of well-known base assets (static; unknown assets show no name). Proper nouns, not translated. */
export const COIN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  BNB: 'BNB',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
  TRX: 'TRON',
  AVAX: 'Avalanche',
  LINK: 'Chainlink',
  DOT: 'Polkadot',
  LTC: 'Litecoin',
  TON: 'Toncoin',
  SHIB: 'Shiba Inu',
  NEAR: 'NEAR Protocol',
  UNI: 'Uniswap',
  PEPE: 'Pepe',
  SUI: 'Sui',
};

export const coinName = (baseAsset: string): string | undefined => COIN_NAMES[baseAsset.toUpperCase()];
