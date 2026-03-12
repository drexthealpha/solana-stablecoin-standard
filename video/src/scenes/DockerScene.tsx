import React from 'react';
import { Video, staticFile, spring, useCurrentFrame, useVideoConfig } from 'remotion';
const SERVICES = ['mint-service :3001', 'indexer :3002', 'compliance :3003'];
export const DockerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ background: '#0D1117', width: '100%', height: '100%', position: 'relative' }}>
      <Video src={staticFile('docker-up.mp4')} style={{ width: '100%', height: '70%', objectFit: 'contain' }} />
      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 40 }}>
        {SERVICES.map((svc, i) => {
          const scale = spring({ frame: frame - (30 + i * 20), fps, config: { damping: 10, stiffness: 200 } });
          return (
            <div key={i} style={{ transform: `scale(${scale})`, background: '#065F46', border: '3px solid #34D399', borderRadius: 12, padding: '16px 28px', color: '#D1FAE5', fontSize: 26 }}>
              ✅ {svc}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default DockerScene;
