/** Coin avatar: first letter of the base asset on a neutral circle (no logos). */
export function CoinAvatar({ baseAsset, size = 'md' }: { baseAsset: string; size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-3 font-semibold text-text ${
        size === 'lg' ? 'h-8 w-8 text-body' : 'h-6 w-6 text-meta'
      }`}
    >
      {baseAsset.charAt(0).toUpperCase()}
    </span>
  );
}
