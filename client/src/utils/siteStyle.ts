export interface SiteStyleConfig {
  sitePrimaryColor?: string;
  siteAccentColor?: string;
  siteBackgroundStart?: string;
  siteBackgroundMid?: string;
  siteBackgroundEnd?: string;
  siteTextColor?: string;
  siteFontBody?: string;
  siteFontDisplay?: string;
  siteFontHand?: string;
  enableSiteAurora?: string;
  enableCardSpotlight?: string;
  siteMotionIntensity?: string;
}

export const FONT_OPTIONS = [
  { label: 'DM Sans — hiện đại, gọn', value: "'DM Sans', system-ui, sans-serif" },
  { label: 'Playfair Display — sang, editorial', value: "'Playfair Display', Georgia, serif" },
  { label: 'Caveat — viết tay dễ thương', value: "'Caveat', cursive" },
  { label: 'Dancing Script — chữ tay mềm', value: "'Dancing Script', cursive" },
  { label: 'Pacifico — ngọt kiểu quà tặng', value: "'Pacifico', cursive" },
  { label: 'Quicksand — tròn, mềm', value: "'Quicksand', system-ui, sans-serif" },
  { label: 'System UI — nhanh, rõ', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { label: 'Georgia — cổ điển', value: 'Georgia, "Times New Roman", serif' },
];

export const SITE_STYLE_DEFAULTS: Required<SiteStyleConfig> = {
  sitePrimaryColor: '#c97b8a',
  siteAccentColor: '#e8a0b0',
  siteBackgroundStart: '#fff5ee',
  siteBackgroundMid: '#ffd3cf',
  siteBackgroundEnd: '#cbb7ff',
  siteTextColor: '#3d1a26',
  siteFontBody: "'DM Sans', system-ui, sans-serif",
  siteFontDisplay: "'Playfair Display', Georgia, serif",
  siteFontHand: "'Caveat', cursive",
  enableSiteAurora: 'true',
  enableCardSpotlight: 'true',
  siteMotionIntensity: '1',
};

function isColor(value?: string) {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function hexToRgb(hex: string) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map(ch => ch + ch).join('');
  const num = parseInt(clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function mix(hexA: string, hexB: string, amount: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount,
  );
}

export function applySiteStyleConfig(config: SiteStyleConfig = {}) {
  if (typeof document === 'undefined') return;

  const cfg = { ...SITE_STYLE_DEFAULTS, ...config };
  const root = document.documentElement;
  const body = document.body;
  root.dataset.adminStyle = 'true';
  root.dataset.siteAurora = cfg.enableSiteAurora === 'false' ? 'off' : 'on';
  root.dataset.cardSpotlight = cfg.enableCardSpotlight === 'false' ? 'off' : 'on';
  const motion = Math.max(0, Math.min(2, Number(cfg.siteMotionIntensity || 1) || 1));
  const safeMotion = Math.max(0.2, motion);
  root.style.setProperty('--motion-scale', String(motion));
  root.style.setProperty('--motion-duration-slow', `${(16 / safeMotion).toFixed(2)}s`);
  root.style.setProperty('--motion-duration-fast', `${(10 / safeMotion).toFixed(2)}s`);

  const primary = isColor(cfg.sitePrimaryColor) ? cfg.sitePrimaryColor : SITE_STYLE_DEFAULTS.sitePrimaryColor;
  const accent = isColor(cfg.siteAccentColor) ? cfg.siteAccentColor : SITE_STYLE_DEFAULTS.siteAccentColor;
  const start = isColor(cfg.siteBackgroundStart) ? cfg.siteBackgroundStart : SITE_STYLE_DEFAULTS.siteBackgroundStart;
  const mid = isColor(cfg.siteBackgroundMid) ? cfg.siteBackgroundMid : SITE_STYLE_DEFAULTS.siteBackgroundMid;
  const end = isColor(cfg.siteBackgroundEnd) ? cfg.siteBackgroundEnd : SITE_STYLE_DEFAULTS.siteBackgroundEnd;
  const text = isColor(cfg.siteTextColor) ? cfg.siteTextColor : SITE_STYLE_DEFAULTS.siteTextColor;

  root.style.setProperty('--rose', primary);
  root.style.setProperty('--rose-light', accent);
  root.style.setProperty('--rose-pale', mix(accent, '#ffffff', 0.55));
  root.style.setProperty('--rose-blush', mix(accent, '#ffffff', 0.78));
  root.style.setProperty('--rose-deep', mix(primary, '#000000', 0.26));
  root.style.setProperty('--plum', text);
  root.style.setProperty('--plum-mid', mix(text, primary, 0.28));
  root.style.setProperty('--plum-soft', mix(text, accent, 0.45));
  root.style.setProperty('--cream', mix(start, '#ffffff', 0.28));
  root.style.setProperty('--cream-warm', mix(mid, '#ffffff', 0.38));
  root.style.setProperty('--site-bg-start', start);
  root.style.setProperty('--site-bg-mid', mid);
  root.style.setProperty('--site-bg-end', end);
  root.style.setProperty('--font-body', cfg.siteFontBody || SITE_STYLE_DEFAULTS.siteFontBody);
  root.style.setProperty('--font-display', cfg.siteFontDisplay || SITE_STYLE_DEFAULTS.siteFontDisplay);
  root.style.setProperty('--font-hand', cfg.siteFontHand || SITE_STYLE_DEFAULTS.siteFontHand);

  body.style.background = `radial-gradient(circle at 14% 8%, rgba(255,255,255,0.72), transparent 28%), radial-gradient(circle at 82% 16%, ${mix(accent, '#ffffff', 0.35)} 0%, transparent 34%), linear-gradient(135deg, ${start} 0%, ${mid} 45%, ${end} 100%)`;
  body.style.backgroundAttachment = 'fixed';
  body.style.fontFamily = cfg.siteFontBody || SITE_STYLE_DEFAULTS.siteFontBody;
}
