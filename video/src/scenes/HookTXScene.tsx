import { AbsoluteFill, Text } from "remotion";

export const HookTXScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1e1e3f", padding: 60 }}>
      <Text style={{ fontSize: 40, color: "#f472b6", fontWeight: "bold", marginBottom: 30 }}>
        Transfer Hook Flow
      </Text>
      <Text style={{ fontSize: 22, color: "#ffffff", fontFamily: "monospace" }}>
        1. User initiates transfer{"\n"}
        2. Token-2022 calls hook program{"\n"}
        3. Hook checks source blacklist PDA{"\n"}
        4. Hook checks destination blacklist PDA{"\n"}
        5. If blacklisted → REJECT{"\n"}
        6. Otherwise → APPROVE
      </Text>
    </AbsoluteFill>
  );
};

export default HookTXScene;
