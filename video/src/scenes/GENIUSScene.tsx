import { AbsoluteFill, Text } from "remotion";

export const GENIUSScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1c1917", padding: 60 }}>
      <Text style={{ fontSize: 44, color: "#f97316", fontWeight: "bold", marginBottom: 20 }}>
        GENIUS Act Compliance
      </Text>
      <Text style={{ fontSize: 22, color: "#d4d4d8" }}>
        SSS-2 meets all requirements:{"\n"}
        {"\n"}
        ✓ 1:1 Backing (off-chain){"\n"}
        ✓ Redemption via burn{"\n"}
        ✓ Blacklist enforcement{"\n"}
        ✓ Token seizure capability{"\n"}
        ✓ Full audit trail
      </Text>
    </AbsoluteFill>
  );
};

export default GENIUSScene;
