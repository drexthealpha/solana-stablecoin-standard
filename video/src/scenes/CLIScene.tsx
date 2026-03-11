import { AbsoluteFill, Text } from "remotion";

export const CLIScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1117", padding: 60 }}>
      <Text style={{ fontSize: 40, color: "#58a6ff", fontWeight: "bold", marginBottom: 30 }}>
        CLI Commands
      </Text>
      <Text style={{ fontSize: 20, color: "#7ee787", fontFamily: "monospace" }}>
        $ sss-token init --preset sss-2{"\n"}
        $ sss-token mint --amount 1000000{"\n"}
        $ sss-token freeze --address 7xKX...{"\n"}
        $ sss-token blacklist add --reason "OFAC"{"\n"}
        $ sss-token seize --to treasury...
      </Text>
    </AbsoluteFill>
  );
};

export default CLIScene;
