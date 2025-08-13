import { Router } from "express";
import express from "express";
import cors from "cors"
import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"
import * as path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const protoObject = protoLoader.loadSync(path.resolve(__dirname, "./proto/RiskScore.proto"));
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
  
  try {
    client.calculateRiskScore({
      manufacturer: manufacturer_name,
      device: device_name
    }, (err, response) => {
      if (err) {
        console.error("Error calculating risk score:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      console.log("Risk score calculated successfully");
      return res.status(200).json(response);
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// Streaming risk-score route
router.get("/risk-score", async (req, res) => {
  const { manufacturer_name, fda_name } = req.query;
  
  // Set headers for streaming
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  // Use a mutex-like approach to prevent concurrent writes
  let isWriting = false;
  const writeQueue = [];

  const safeWrite = async (text) => {
    return new Promise((resolve) => {
      writeQueue.push({ text, resolve });
      processQueue();
    });
  };

  const processQueue = async () => {
    if (isWriting || writeQueue.length === 0) return;
    
    isWriting = true;
    const { text, resolve } = writeQueue.shift();
    
    try {
      const sanitizedText = Buffer.from(text, 'utf8').toString('utf8');
      res.write(sanitizedText + "\n", 'utf8');
      await new Promise(r => setTimeout(r, 50)); // Small delay to prevent race conditions
      resolve();
    } catch (error) {
      console.error('Write error:', error);
      resolve();
    } finally {
      isWriting = false;
      if (writeQueue.length > 0) {
        setImmediate(processQueue);
      }
    }
  };

  await safeWrite(`Starting risk score calculation for device: ${fda_name} by manufacturer: ${manufacturer_name}`);
  
  try {
    const request = {
      manufacturer: manufacturer_name,
      device: fda_name 
    };
    const call = client.calculateRiskScore(request);

    call.on('data', async (response) => {
      const message = response.message || '';
      // await safeWrite(message);
     
      
      if (response.completed) {
        await safeWrite(`\nFinal Result: ${JSON.stringify(response, null, 2)}`);
        res.end();
      }
      else {
        await safeWrite(`\nResponse: ${JSON.stringify(response, null, 2)}`);
      }
    });

    call.on('error', async (error) => {
      await safeWrite(`Error: ${error.message}`);
      res.end();
    });

    call.on('end', () => {
      // Handle stream end gracefully
      if (!res.headersSent) {
        res.end();
      }
    });

  } catch (error) {
    await safeWrite(`Error: ${error.message}`);
    res.end();
  }
});

app.use("/", router);
app.listen(3000, () => {
  console.log("Express server running on port 3000");
});

export default router;