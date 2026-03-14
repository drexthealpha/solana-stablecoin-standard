import React from 'react';
import { useCurrentFrame, interpolate, Sequence } from 'remotion';

const STEPS = [
  { cmd: '$ sss-token init --preset sss-2', out: ['✔ Program deployed: SSSxyz...', '✔ SSS-2 preset initialized', '✔ Transfer hook registered'], color: '#86EFAC' },
  { cmd: '$ sss-token mint 9xK...abc 1000000', out: ['✔ 1,000,000 MYUSD minted', '✔ Minter quota updated', '✔ MintEvent emitted'], color: '#93C5FD' },
  { cmd: '$ sss-token blacklist add 3Fd...bad --reason "OFAC match"', out: ['✔ BlacklistEntry PDA created', '✔ Reason: OFAC match', '✔ AuditLog written'], color: '#FCD34D' },
  { cmd: '$ sss-token transfer 3Fd...bad myWallet 500', out: ['✖ Transfer rejected', '✖ Error: BlacklistedAddress', '✖ Hook program fired at slot 312'], color: '#FCA5A5' },
];

const Terminal: React.FC<{ step: typeof STEPS[0]; frame: number }> = ({ step, frame }) => {
  const cmdLen = Math.floor(interpolate(frame, [0, 30], [0, step.cmd.length], { extrapolateRight: 'clamp' }));
  return (
    <div style={{ background: '#0D1117', border: '2px solid #30363D', borderRadius: 12, padding: '32px 40px', fontFamily: 'monospace', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['#FF5F57','#FFBD2E','#28C840'].map((c,i) => <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: c }} />)}
      </div>
      <div style={{ color: step.color, fontSize: 30, marginBottom: 24 }}>{step.cmd.slice(0, cmdLen)}<span style={{ opacity: frame % 18 < 9 ? 1 : 0 }}>▋</span></div>
      {step.out.map((line, i) => {
        const opacity = interpolate(frame, [32 + i * 10, 44 + i * 10], [0, 1], { extrapolateRight: 'clamp' });
        return <div key={i} style={{ color: '#E6EDF3', fontSize: 26, opacity, marginBottom: 10 }}>{line}</div>;
      })}
    </div>
  );
};

export const CLIScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ background: '#010409', width: '100%', height: '100%', padding: 60 }}>
      <div style={{ color: '#8B5CF6', fontSize: 36, fontWeight: 800, marginBottom: 32 }}>SSS-2 CLI — Live Operations</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, height: 'calc(100% - 100px)' }}>
        {STEPS.map((step, i) => (
          <Terminal key={i} step={step} frame={frame} />
        ))}
      </div>
    </div>
  );
};
export default CLIScene;
