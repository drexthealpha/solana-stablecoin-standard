import { AbsoluteFill } from "remotion";
import React from "react";

export const TitleCard: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f0f23",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: 64,
          color: "#ffffff",
          fontWeight: "bold",
          marginBottom: 24,
          fontFamily: "sans-serif",
        }}
      >
        Solana Stablecoin Standard
      </div>
      <div
        style={{
          fontSize: 32,
          color: "#a1a1aa",
          fontFamily: "sans-serif",
        }}
      >
        Building Regulated Stablecoins on Solana
      </div>
    </AbsoluteFill>
  );
};

export default TitleCard;
