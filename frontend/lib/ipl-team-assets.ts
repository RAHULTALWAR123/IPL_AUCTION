/** Static team logos in /public (short_name → path). */
const LOGO_BY_SHORT: Record<string, string> = {
  MI: "/MIoutline.avif",
  CSK: "/CSKoutline.avif",
  RCB: "/RCBoutline.avif",
  KKR: "/KKRoutline.avif",
  DC: "/DCoutline.avif",
  PBKS: "/PBKSoutline.avif",
  RR: "/RR_Logo.webp",
  SRH: "/SRHoutline.avif",
  GT: "/GToutline.avif",
  LSG: "/LSGoutline.avif",
};

export function getIplTeamLogoSrc(shortName: string): string | null {
  const path = LOGO_BY_SHORT[shortName.trim()];
  return path ?? null;
}
