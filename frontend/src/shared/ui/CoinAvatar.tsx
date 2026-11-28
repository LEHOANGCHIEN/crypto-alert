/** Coin avatar: first letter of the base asset on a neutral circle (no logos). */
export function CoinAvatar({ baseAsset, size = 'md', testId }: { baseAsset: string; size?: 'md' | 'lg'; testId?: string }) {
  return (
    <span
      data-testid={testId}
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-3 font-semibold text-text ${
        size === 'lg' ? 'h-8 w-8 text-body' : 'h-6 w-6 text-meta'
      }`}
    >
      {baseAsset.charAt(0).toUpperCase()}
    </span>
  );
}
