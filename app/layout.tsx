import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';
import { BUILT_IN_THEMES, DEFAULT_THEME_ID } from '../src/utils/theme-plugins';

export const metadata: Metadata = {
  title: 'JUSTAPI — REST API client',
  description: 'A simple REST API client.',
  applicationName: 'JUSTAPI',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JUSTAPI',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
  colorScheme: 'light dark',
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
  acc[t.id] = {
    light: t.light as unknown as Record<string, string>,
    dark: t.dark as unknown as Record<string, string>,
  };
  return acc;
}, {});

// Runs synchronously before React hydrates so the correct mode + palette is
// applied to <html> on first paint. Otherwise the page flashes the default
// light theme before ThemeProvider's useEffect can read localStorage.
//
// Also migrates legacy `quickrest-*` localStorage keys to `justapi-*` once,
// so users with existing data don't lose their theme / saved state during
// the rename.
const themeBootScript = `(function(){try{
var THEMES=${JSON.stringify(themePayload)};
var VAR=${JSON.stringify(VAR_MAP)};
var MIGRATE=[
  ['quickrest-mode','justapi-mode'],
  ['quickrest-theme','justapi-theme'],
  ['quickrest-intro-seen','justapi-intro-seen'],
  ['quickrest-sidebar-width','justapi-sidebar-width'],
  ['quickrest-split-request-response','justapi-split-request-response']
];
for(var i=0;i<MIGRATE.length;i++){
  var o=MIGRATE[i][0],n=MIGRATE[i][1];
  var v=localStorage.getItem(n);
  if(v===null){var old=localStorage.getItem(o);if(old!==null){localStorage.setItem(n,old);localStorage.removeItem(o);}}
}
var m=localStorage.getItem('justapi-mode');
if(!m){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
var t=localStorage.getItem('justapi-theme')||'${DEFAULT_THEME_ID}';
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
