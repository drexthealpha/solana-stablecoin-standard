import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
const ROWS = [
  ['Permanent Delegate', 'enable_permanent_delegate: true', '✅ Enabled at mint (on-chain verified)'],
  ['Freeze Authority', 'freeze_account instruction, master_authority only', '✅ Paxos-controlled keypair'],
  ['Blacklist', 'Transfer hook checks BlacklistEntry PDA every transfer', '✅ Transfer hook program'],
  ['Seizure', 'seize via permanent delegate CPI, freeze required first', '✅ Same Token-2022 mechanism'],
  ['Authority', 'Single keypair → Squads v4 multisig upgrade documented', '✅ Paxos custodied multisig'],
];
export const PYUSDScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ background: '#0F172A', width: '100%', height: '100%', padding: 60 }}>
      <div style={{ color: '#C4B5FD', fontSize: 42, marginBottom: 40, fontWeight: 800 }}>SSS-2 vs PYUSD (Production Reference)</div>
      <div style={{ color: '#6B7280', fontSize: 20, marginBottom: 32 }}>PYUSD Mainnet: 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo</div>
      {ROWS.map(([feature, sss2, pyusd], i) => {
        const delay = i * 15;
        const opacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: 'clamp' });
        const x = interpolate(frame, [delay, delay + 12], [-60, 0], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{ display: 'flex', opacity, transform: `translateX(${x}px)`, marginBottom: 20, gap: 20 }}>
            <div style={{ flex: 1, color: '#FCD34D', fontSize: 24 }}>{feature}</div>
            <div style={{ flex: 2, color: '#86EFAC', fontSize: 22, fontFamily: 'monospace' }}>{sss2}</div>
            <div style={{ flex: 2, color: '#93C5FD', fontSize: 22 }}>{pyusd}</div>
          </div>
        );
      })}
    </div>
  );
};
export default PYUSDScene;
