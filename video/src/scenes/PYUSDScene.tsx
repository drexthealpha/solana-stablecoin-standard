import { AbsoluteFill, Text } from "remotion";

export const PYUSDScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", padding: 60 }}>
      <Text style={{ fontSize: 48, color: "#fbbf24", fontWeight: "bold", marginBottom: 20 }}>
        PYUSD Reference
      </Text>
      <Text style={{ fontSize: 24, color: "#94a3b8", marginBottom: 40 }}>
        Program ID: 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo
      </Text>
      <Text style={{ fontSize: 20, color: "#ffffff" }}>
        Our SSS-2 implementation follows the same patterns as{"\n"}
        PayPal's regulated stablecoin on Solana.
      </Text>
    </AbsoluteFill>
  );
};

export default PYUSDScene;
