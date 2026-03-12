import React from 'react';
import { spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleScale = spring({ frame, fps, config: { damping: 14 } });
  const fade = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const ctaOpacity = interpolate(frame, [30, 48], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #6B21A8)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#FFFFFF', fontSize: 96, fontWeight: 900, opacity: fade, transform: `scale(${titleScale})`, textAlign: 'center' }}>Fork it. Ship it.</div>
      <div style={{ opacity: ctaOpacity, marginTop: 48, textAlign: 'center' }}>
        <div style={{ color: '#C4B5FD', fontSize: 34 }}>github.com/solanabr/solana-stablecoin-standard</div>
        <div style={{ color: '#86EFAC', fontSize: 28, marginTop: 16 }}>npmjs.com/package/@stbr/sss-token</div>
        <div style={{ color: '#FCD34D', fontSize: 28, marginTop: 16 }}>@SuperteamBR @kauenet</div>
      </div>
    </div>
  );
};
export default OutroScene;
