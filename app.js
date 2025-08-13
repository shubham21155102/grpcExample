import { Router } from "express";
import express from "express";
import cors from "cors"
import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"
import * as path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const protoObject = protoLoader.loadSync(path.resolve(__dirname, "./server/proto/RiskScore.proto"));
const RiskScoreDefinition = grpc.loadPackageDefinition(protoObject);
const client = new RiskScoreDefinition.RiskScorePackage.RiskScore("0.0.0.0:50051", grpc.credentials.createInsecure());
const app = express();

// Configure Express for proper UTF-8 handling
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://fda.dev.rp360.io'],
    methods:['POST','PUT','UPDATE','DELETE','PATCH',"GET"],
    credentials:true
  })
);

const router = Router();
router.get("/", (req, res) => {
  res.send("Hello from Express!");
});

router.post("/riskScore", async (req, res) => {
  // Extract parameters with multiple possible names
  const manufacturer_name = req.body.manufacturer_name
  const device_name = req.body.device_name
  console.log("Request received:", { manufacturer_name, device_name });
  client.calculateRiskScore({
    manufacturer: manufacturer_name,
    device: device_name
  },(err,response)=>{
    if (err) {
      console.error("Error calculating risk score:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    console.log("Risk score calculated successfully");
    return res.status(200).json(response);
  });
});


// Streaming risk-score route
router.get("/risk-score", async (req, res) => {
  const { manufacturer_name, fda_name } = req.query;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  // Function to safely encode and stream text
  const streamText = async (text, delay = 50) => {
    const sanitizedText = Buffer.from(text, 'utf8').toString('utf8');
    for (const char of sanitizedText) {
      res.write(char, 'utf8');
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    res.write("\n", 'utf8');
  };
  await streamText(`Starting risk score calculation for device: ${fda_name} by manufacturer: ${manufacturer_name}`);
  try {
    const request = {
      manufacturer: manufacturer_name,
      device: fda_name 
    };
    const call = client.calculateRiskScore(request);

    call.on('data', async (response) => {
      const message = Buffer.from(response.message || '', 'utf8').toString('utf8');
      await streamText(message);
      if (response.completed) {
        await streamText(`\nFinal Result: ${JSON.stringify(response, null, 2)}`);
        res.end();
      }
    });

    call.on('error', async (error) => {
      await streamText(`Error: ${error.message}`);
      res.end();
    });

    call.on('end', () => {
      // Optionally handle end
    });

  } catch (error) {
    await streamText(`Error: ${error.message}`);
    res.end();
  }
});

app.use("/", router);
app.listen(3000, () => {
  console.log("Express server running on port 3000");
});

export default router;