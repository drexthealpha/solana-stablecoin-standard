import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
const MAPPINGS = [
  { section: '§3 Reserve Backing', code: 'mint + burn', color: '#3B82F6' },
  { section: '§6 Redemption Rights', code: 'burn + /burn API', color: '#8B5CF6' },
  { section: '§9 AML Obligations', code: 'transfer_hook program', color: '#EF4444' },
  { section: '§11 Audit Trail', code: 'SQLite chain + /audit-log/verify', color: '#F59E0B' },
  { section: '§14 Enforcement', code: 'freeze + seize (permanent delegate)', color: '#10B981' },
];
export const GENIUSScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ background: '#1E1B4B', width: '100%', height: '100%', padding: 60 }}>
      <div style={{ color: '#FCD34D', fontSize: 46, fontWeight: 900, marginBottom: 40 }}>GENIUS Act — SSS-2 Compliance Map</div>
      {MAPPINGS.map(({ section, code: codeLabel, color }, i) => {
        const delay = i * 18;
        const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', opacity, marginBottom: 28, gap: 40 }}>
            <div style={{ background: color + '20', border: `3px solid ${color}`, borderRadius: 10, padding: '14px 24px', minWidth: 360, color, fontSize: 26, fontWeight: 700 }}>{section}</div>
            <div style={{ color: '#94A3B8', fontSize: 32 }}>→</div>
            <div style={{ background: '#0F172A', padding: '14px 24px', borderRadius: 10, color: '#86EFAC', fontFamily: 'monospace', fontSize: 24 }}>{codeLabel}</div>
          </div>
        );
      })}
    </div>
  );
};
export default GENIUSScene;
