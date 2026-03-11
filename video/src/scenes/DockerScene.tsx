import { AbsoluteFill, Text } from "remotion";

export const DockerScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c1222", padding: 60 }}>
      <Text style={{ fontSize: 40, color: "#2496ed", fontWeight: "bold", marginBottom: 30 }}>
        Docker Services
      </Text>
      <Text style={{ fontSize: 22, color: "#7ee787", fontFamily: "monospace" }}>
        $ docker-compose up{"\n"}
        {"\n"}
        Services:{"\n"}
        • mint-service      :3001{"\n"}
        • indexer          :3002{"\n"}
        • compliance       :3003{"\n"}
        • webhook-service :3004
      </Text>
    </AbsoluteFill>
  );
};

export default DockerScene;
