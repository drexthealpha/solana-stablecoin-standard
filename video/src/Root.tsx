import React from 'react';
import { Composition, Series } from 'remotion';
import { TitleCard } from './scenes/TitleCard';
import { ArchitectureScene } from './scenes/ArchitectureScene';
import { CLIScene } from './scenes/CLIScene';
import { HookTXScene } from './scenes/HookTXScene';
import { PYUSDScene } from './scenes/PYUSDScene';
import { DockerScene } from './scenes/DockerScene';
import { GENIUSScene } from './scenes/GENIUSScene';
import { OutroScene } from './scenes/OutroScene';

export const DemoVideo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={24}>
      <TitleCard />
    </Series.Sequence>
    <Series.Sequence durationInFrames={66}>
      <ArchitectureScene />
    </Series.Sequence>
    <Series.Sequence durationInFrames={120}>
      <CLIScene />
    </Series.Sequence>
    <Series.Sequence durationInFrames={90}>
      <HookTXScene />
    </Series.Sequence>
    <Series.Sequence durationInFrames={90}>
      <PYUSDScene />
    </Series.Sequence>
    <Series.Sequence durationInFrames={90}>
      <DockerScene />
    </Series.Sequence>
    <Series.Sequence durationInFrames={90}>
      <GENIUSScene />
    </Series.Sequence>
    <Series.Sequence durationInFrames={60}>
      <OutroScene />
    </Series.Sequence>
  </Series>
);

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DemoVideo"
    component={DemoVideo}
    durationInFrames={630}
    fps={30}
    width={1920}
    height={1080}
  />
);
