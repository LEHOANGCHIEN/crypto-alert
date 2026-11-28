/** The owner's social links — the ONLY place these URLs live (footer and /contact both read this list). */
export type SocialId = 'facebook' | 'github' | 'linkedin' | 'instagram' | 'x' | 'reddit' | 'threads';

export type SocialLink = { id: SocialId; label: string; url: string };

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/hoangchien.le.7777/' },
  { id: 'github', label: 'GitHub', url: 'https://github.com/LEHOANGCHIEN' },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/l%C3%AA-chi%E1%BA%BFn-b42a6522a/' },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/le_hoang_chien/' },
  { id: 'x', label: 'X', url: 'https://x.com/le_hoang_chienn' },
  { id: 'reddit', label: 'Reddit', url: 'https://www.reddit.com/user/lehoangchien/' },
  { id: 'threads', label: 'Threads', url: 'https://www.threads.com/@le_hoang_chien' },
];
