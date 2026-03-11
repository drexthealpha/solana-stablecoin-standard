import { AbsoluteFill, Text } from "remotion";

export const ArchitectureScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a2e", padding: 80 }}>
      <Text style={{ fontSize: 48, color: "#ffffff", fontWeight: "bold", marginBottom: 40 }}>
        Architecture
      </Text>
      <Text style={{ fontSize: 24, color: "#888888", fontFamily: "monospace" }}>
        ┌─────────────────────────────────────────────┐{"\n"}
        │         Solana Stablecoin Standard          │{"\n"}
        ├─────────────────────────────────────────────┤{"\n"}
        │  ┌─────────┐  ┌─────────┐  ┌──────────┐    │{"\n"}
        │  │   SDK   │  │   CLI   │  │ Backend │    │{"\n"}
        │  └────┬────┘  └────┬────┘  └────┬─────┘    │{"\n"}
        │       │            │            │          │{"\n"}
        │       └────────────┼────────────┘          │{"\n"}
        │                    ▼                       │{"\n"}
        │         ┌──────────────────┐              │{"\n"}
        │         │   Token-2022     │              │{"\n"}
        │         │ + Transfer Hook │              │{"\n"}
        │         └──────────────────┘              │{"\n"}
        └─────────────────────────────────────────────┘
      </Text>
    </AbsoluteFill>
  );
};

export default ArchitectureScene;
