import { ImageResponse } from 'next/og';

export const alt = 'JustAPI — a fast, mobile-first REST API client.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
          color: '#e6edf3',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg width="64" height="64" viewBox="0 0 128 128">
            <rect x="0" y="0" width="128" height="128" rx="28" fill="#0969da" />
            <path
              d="M 92 24 L 92 76 A 28 28 0 0 1 36 76 L 52 76 A 12 12 0 0 0 76 76 L 76 24 Z"
              fill="#ffffff"
            />
          </svg>
          <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>
            Just<span style={{ color: '#2f81f7' }}>API</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
            }}
          >
            REST testing
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
              color: '#2f81f7',
            }}
          >
            without the bloat.
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 28,
              color: '#8d96a0',
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            Compose, send, save, and replay HTTP requests in the browser.
            Capture live traffic with the companion extension.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: '#6e7681',
          }}
        >
          <span>justapi.kreativekorna.com</span>
          <span>by KreativeKorna</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
