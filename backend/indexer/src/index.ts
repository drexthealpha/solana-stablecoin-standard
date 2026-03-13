import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "indexer",
    timestamp: new Date().toISOString(),
  });
});

app.get("/transactions/:mint", (req, res) => {
  const { mint } = req.params;
  res.json({
    mint,
    transactions: [],
    note: "Connect to Helius webhook for production indexing",
  });
});

app.get("/supply/:mint", (req, res) => {
  const { mint } = req.params;
  res.json({
    mint,
    supply: "0",
    note: "Query on-chain for live supply",
  });
});

app.listen(PORT, () => {
  console.log(`indexer running on port ${PORT}`);
});
