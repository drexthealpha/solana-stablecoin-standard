import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

const LOGS = [
  { t: 0,  text: 'docker compose up --build', color: '#60A5FA' },
  { t: 8,  text: '[+] Building mint-service...', color: '#94A3B8' },
  { t: 14, text: '[+] Building indexer...', color: '#94A3B8' },
  { t: 20, text: '[+] Building compliance-service...', color: '#94A3B8' },
  { t: 28, text: '[+] Building webhook-service...', color: '#94A3B8' },
  { t: 36, text: 'mint-service     | Listening on :3001', color: '#86EFAC' },
  { t: 42, text: 'indexer          | WebSocket connected to devnet', color: '#86EFAC' },
  { t: 48, text: 'compliance       | Listening on :3003', color: '#86EFAC' },
  { t: 54, text: 'webhook-service  | Retry queue ready', color: '#86EFAC' },
  { t: 62, text: '✔ All 4 services healthy', color: '#FCD34D' },
];

const SERVICES = ['mint-service :3001', 'indexer :3002', 'compliance :3003', 'webhook :3004'];

export const DockerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ background: '#0D1117', width: '100%', height: '100%', padding: 60 }}>
      <div style={{ color: '#60A5FA', fontSize: 36, fontWeight: 800, marginBottom: 24 }}>docker compose up — Backend Stack</div>
      <div style={{ background: '#010409', border: '2px solid #30363D', borderRadius: 12, padding: '24px 32px', fontFamily: 'monospace', fontSize: 24, marginBottom: 40, height: 380, overflow: 'hidden' }}>
        {LOGS.map(({ t, text, color }, i) => (
          <div key={i} style={{ color, opacity: interpolate(frame, [t, t + 6], [0, 1], { extrapolateRight: 'clamp' }), marginBottom: 8 }}>
            {text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
        {SERVICES.map((svc, i) => {
          const scale = spring({ frame: frame - (50 + i * 14), fps, config: { damping: 10, stiffness: 200 } });
          return (
            <div key={i} style={{ transform: `scale(${scale})`, background: '#065F46', border: '3px solid #34D399', borderRadius: 12, padding: '16px 28px', color: '#D1FAE5', fontSize: 24 }}>
              ✅ {svc}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default DockerScene;
