import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
const LAYERS = [
  { label: 'Layer 1 — Base SDK', sub: 'TypeScript + Anchor + CLI', color: '#3B82F6' },
  { label: 'Layer 2 — Modules', sub: 'Compliance · Privacy · Transfer Hook', color: '#8B5CF6' },
  { label: 'Layer 3 — Standard Presets', sub: 'SSS-1 (Minimal) · SSS-2 (Compliant)', color: '#EC4899' },
];
const PDAS = ['[b"config", mint]', '[b"blacklist", mint, addr]', '[b"minter", mint, minter]'];
export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ background: '#0F172A', width: '100%', height: '100%', padding: 80 }}>
      {LAYERS.map((layer, i) => {
        const delay = i * 22;
        const opacity = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateRight: 'clamp' });
        const y = interpolate(frame, [delay, delay + 18], [40, 0], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{ opacity, transform: `translateY(${y}px)`, marginBottom: 48, background: layer.color + '20', border: `3px solid ${layer.color}`, borderRadius: 16, padding: '24px 40px' }}>
            <div style={{ fontSize: 42, color: layer.color, fontWeight: 800 }}>{layer.label}</div>
            <div style={{ fontSize: 28, color: '#94A3B8', marginTop: 8 }}>{layer.sub}</div>
          </div>
        );
      })}
      {interpolate(frame, [78, 95], [0, 1], { extrapolateRight: 'clamp' }) > 0.1 && (
        <div style={{ position: 'absolute', right: 80, top: 200, opacity: interpolate(frame, [78, 95], [0, 1], { extrapolateRight: 'clamp' }) }}>
          {PDAS.map((s, i) => <div key={i} style={{ color: '#86EFAC', fontFamily: 'monospace', fontSize: 22, marginBottom: 12 }}>{s}</div>)}
        </div>
      )}
    </div>
  );
};
export default ArchitectureScene;
