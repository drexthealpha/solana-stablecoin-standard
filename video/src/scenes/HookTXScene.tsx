import React from 'react';
import { Video, staticFile, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
export const HookTXScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const zoomScale = interpolate(zoom, [0, 1], [1, 1.4]);
  return (
    <div style={{ background: '#0D1117', width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Video src={staticFile('hook-tx.mp4')} style={{ width: '100%', height: '80%', objectFit: 'contain', transform: `scale(${zoomScale})`, transformOrigin: 'center center' }} />
      {frame > 50 && (
        <div style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', background: '#7F1D1D', color: '#FEE2E2', padding: '12px 24px', borderRadius: 8, fontFamily: 'monospace', fontSize: 28, opacity: spring({ frame: frame - 50, fps, config: { damping: 12 } }) }}>
          ❌ BlacklistedAddress
        </div>
      )}
    </div>
  );
};
export default HookTXScene;
