import { Title } from "@remotion/title";
import { AbsoluteFill, staticFile } from "remotion";

export const TitleCard: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0f23", justifyContent: "center", alignItems: "center" }}>
      <Title
        title="Solana Stablecoin Standard"
        subtitle="Building Regulated Stablecoins on Solana"
        logo={staticFile("logo.png")}
      />
    </AbsoluteFill>
  );
};

export default TitleCard;
