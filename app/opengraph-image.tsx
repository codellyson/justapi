import { ImageResponse } from 'next/og';

export const alt =
  'JustAPI — Test APIs as a graph, not a folder of tabs. Open the canvas free, no account needed.';
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
          <svg width="56" height="56" viewBox="0 0 128 128">
            <rect x="0" y="0" width="128" height="128" rx="28" fill="#0969da" />
            <path
              d="M 92 24 L 92 76 A 28 28 0 0 1 36 76 L 52 76 A 12 12 0 0 0 76 76 L 76 24 Z"
              fill="#ffffff"
            />
          </svg>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>
            Just<span style={{ color: '#2f81f7' }}>API</span>
          </span>
          <span
            style={{
              marginLeft: 16,
              fontSize: 18,
              color: '#8d96a0',
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            Postman, as a graph
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
            }}
          >
            Test APIs as a graph,
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
              color: '#2f81f7',
            }}
          >
            not a folder of tabs.
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: 26,
              color: '#8d96a0',
              maxWidth: 1000,
              lineHeight: 1.4,
            }}
          >
            Drop requests on a canvas, wire a response value into the next
            call, and run the whole chain — or let an agent drive it.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              backgroundColor: '#2f81f7',
              color: '#ffffff',
              fontSize: 25,
              fontWeight: 600,
              padding: '15px 30px',
              borderRadius: 12,
            }}
          >
            Open the canvas — free, no account
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: '#6e7681' }}>
            justapi.kreativekorna.com · by KreativeKorna
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
