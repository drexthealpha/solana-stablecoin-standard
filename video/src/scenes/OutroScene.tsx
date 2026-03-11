import { AbsoluteFill, Text } from "remotion";

export const OutroScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0f23", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 48, color: "#ffffff", fontWeight: "bold", marginBottom: 20 }}>
        Get Started Today
      </Text>
      <Text style={{ fontSize: 24, color: "#a1a1aa", marginBottom: 40 }}>
        npm install @stbr/sss-token
      </Text>
      <Text style={{ fontSize: 18, color: "#71717a" }}>
        Solana Stablecoin Standard — Built for the future of regulated finance
      </Text>
    </AbsoluteFill>
  );
};

export default OutroScene;
