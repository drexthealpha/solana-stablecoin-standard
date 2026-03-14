import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const HookTXScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const arrowProgress = interpolate(frame, [10, 40], [0, 1], { extrapolateRight: 'clamp' });
  const hookOpacity = interpolate(frame, [38, 52], [0, 1], { extrapolateRight: 'clamp' });
  const rejectScale = spring({ frame: frame - 52, fps, config: { damping: 10 } });
  const logOpacity = interpolate(frame, [65, 78], [0, 1], { extrapolateRight: 'clamp' });

  const Box: React.FC<{ label: string; sub: string; color: string; opacity?: number }> = ({ label, sub, color, opacity = 1 }) => (
    <div style={{ opacity, background: color + '18', border: `3px solid ${color}`, borderRadius: 14, padding: '20px 32px', textAlign: 'center', minWidth: 280 }}>
      <div style={{ color, fontSize: 28, fontWeight: 800 }}>{label}</div>
      <div style={{ color: '#94A3B8', fontSize: 20, marginTop: 6 }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ background: '#0D1117', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ color: '#8B5CF6', fontSize: 38, fontWeight: 900, marginBottom: 48 }}>Transfer Hook — Blacklist Enforcement</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 48 }}>
        <Box label="Sender" sub="3Fd...bad (blacklisted)" color="#F59E0B" />
        <div style={{ width: 120, height: 4, background: `linear-gradient(to right, #F59E0B ${arrowProgress * 100}%, #1E293B ${arrowProgress * 100}%)`, margin: '0 8px', position: 'relative' }}>
          <div style={{ position: 'absolute', right: -10, top: -8, color: '#F59E0B', fontSize: 24, opacity: arrowProgress }}>▶</div>
        </div>
        <Box label="Transfer Hook" sub="BlacklistEntry PDA check" color="#8B5CF6" opacity={hookOpacity} />
        <div style={{ width: 120, height: 4, background: '#1E293B', margin: '0 8px', position: 'relative' }}>
          <div style={{ position: 'absolute', right: -10, top: -8, color: '#475569', fontSize: 24 }}>▶</div>
        </div>
        <Box label="Recipient" sub="Blocked" color="#475569" opacity={0.4} />
      </div>
      {frame > 52 && (
        <div style={{ transform: `scale(${rejectScale})`, background: '#7F1D1D', border: '3px solid #EF4444', borderRadius: 12, padding: '18px 48px', color: '#FEE2E2', fontFamily: 'monospace', fontSize: 32, fontWeight: 800 }}>
          ❌ Error: BlacklistedAddress
        </div>
      )}
      <div style={{ opacity: logOpacity, marginTop: 32, fontFamily: 'monospace', color: '#64748B', fontSize: 22 }}>
        AuditLog → action: "blocked_transfer" · slot: 312841 · reason: "OFAC match"
      </div>
    </div>
  );
};
export default HookTXScene;
