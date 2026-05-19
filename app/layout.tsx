import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';
import { BUILT_IN_THEMES, DEFAULT_THEME_ID } from '../src/utils/theme-plugins';

export const metadata: Metadata = {
  title: 'QuickRest — REST API client',
  description: 'A simple REST API client.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

const VAR_MAP: Record<string, string> = {
  bg: '--bg',
  bgSecondary: '--bg-secondary',
  border: '--border',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textMuted: '--text-muted',
  accent: '--accent',
  accentHover: '--accent-hover',
  accentText: '--accent-text',
  danger: '--danger',
  success: '--success',
  warning: '--warning',
};

// Build a compact lookup of theme variants for the boot script.
const themePayload = BUILT_IN_THEMES.reduce<
  Record<string, { light: Record<string, string>; dark: Record<string, string> }>
>((acc, t) => {
  acc[t.id] = { light: t.light, dark: t.dark };
  return acc;
}, {});

// Runs synchronously before React hydrates so the correct mode + palette is
// applied to <html> on first paint. Otherwise the page flashes the default
// light theme before ThemeProvider's useEffect can read localStorage.
const themeBootScript = `(function(){try{
var THEMES=${JSON.stringify(themePayload)};
var VAR=${JSON.stringify(VAR_MAP)};
var m=localStorage.getItem('quickrest-mode');
if(!m){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
var t=localStorage.getItem('quickrest-theme')||'${DEFAULT_THEME_ID}';
if(m==='dark'){document.documentElement.classList.add('dark');}
document.documentElement.dataset.theme=t;
var theme=THEMES[t]||THEMES['${DEFAULT_THEME_ID}'];
var variant=theme[m]||theme.light;
for(var k in variant){if(VAR[k]){document.documentElement.style.setProperty(VAR[k],variant[k]);}}
}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
