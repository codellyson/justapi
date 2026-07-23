export const extractHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    const match = url.match(/^[a-z]+:\/\/([^/]+)/i);
    if (match) return match[1];
    return "(invalid url)";
  }
};

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

export interface HostAccent {
  hue: number;
  stripe: string;
  strip: string;
  text: string;
}

export const hostAccent = (host: string): HostAccent => {
  const hue = hash(host) % 360;
  return {
    hue,
    stripe: `hsl(${hue} 45% 62%)`,
    strip: `hsl(${hue} 40% 58% / 0.08)`,
    text: `hsl(${hue} 35% 50%)`,
  };
};
