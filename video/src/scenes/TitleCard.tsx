import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #6B21A8 100%)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity, transform: `scale(${scale})` }}>
      <div style={{ fontSize: 72, fontWeight: 900, color: '#FFFFFF' }}>Solana Stablecoin Standard</div>
      <div style={{ fontSize: 32, color: '#C4B5FD', marginTop: 24 }}>SSS-1 · SSS-2 · Production-Ready · Open Source</div>
      <div style={{ fontSize: 22, color: '#FCD34D', marginTop: 16 }}>Built for the GENIUS Act · PYUSD-class compliance</div>
    </div>
  );
};
export default TitleCard;
