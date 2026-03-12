import React from 'react';
import { Video, Sequence, staticFile, useCurrentFrame } from 'remotion';
const CLIPS = [
  { src: 'cli-init.mp4', caption: 'sss-token init --preset sss-2 → SSS-2 preset initialized', startFrame: 0 },
  { src: 'cli-mint.mp4', caption: 'sss-token mint → 1,000,000 MYUSD minted', startFrame: 60 },
  { src: 'cli-blacklist.mp4', caption: 'sss-token blacklist add → OFAC match recorded', startFrame: 105 },
  { src: 'cli-transfer-fail.mp4', caption: '🔴 Transfer rejected → BlacklistedAddress hook fired', startFrame: 150 },
];
export const CLIScene: React.FC = () => (
  <div style={{ background: '#0D1117', width: '100%', height: '100%', position: 'relative' }}>
    {CLIPS.map(({ src, caption, startFrame }, i) => (
      <Sequence key={i} from={startFrame} durationInFrames={60}>
        <Video src={staticFile(src)} style={{ width: '100%', height: '85%', objectFit: 'contain' }} />
        <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', background: 'rgba(0,0,0,0.8)', padding: '16px 40px' }}>
          <span style={{ color: '#F0FFF4', fontSize: 32, fontFamily: 'monospace' }}>{caption}</span>
        </div>
      </Sequence>
    ))}
  </div>
);
export default CLIScene;
