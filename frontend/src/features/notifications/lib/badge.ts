export const BADGE_MAX = 9;

/** Bell badge text: nothing when 0, the count up to 9, then "9+" (AC-NOTIF-01). */
export const badgeText = (count: number): string | null => (count <= 0 ? null : count > BADGE_MAX ? `${BADGE_MAX}+` : String(count));
