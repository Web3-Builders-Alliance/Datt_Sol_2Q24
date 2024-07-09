import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createAndMintNft } from "./utils/createAndMintNft.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["X-Requested-With", "Content-Type"],
  })
);

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/generate-image", async (req, res) => {
  const { prompt, pubKey } = req.query;

  if (!prompt && prompt.length < 4000) {
    return res.status(400).json({
      detail: "Prompt is required & it should be less than 4000 characters",
    });
  }

  if (!pubKey) {
    return res.status(400).json({
      detail: "pubKey is required",
    });
  }

  try {
    console.log(`Processing with pubKey: ${pubKey}`);

    const isValidPubKey = pubKey.length > 0;
    if (!isValidPubKey) {
      return res.status(400).json({
        detail: "Invalid pubKey",
      });
    }
    const model = "dall-e-3";
    const response = await openai.images.generate({
      model: model,
      prompt: prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data[0].url;

    console.log(`Image generated, URL: ${imageUrl}`);

    (async () => {
      try {
        console.log(`Fetching image from URL: ${imageUrl}`);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok)
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        console.log(`Image fetched successfully`);

        const imageBuffer = await imageResponse.buffer();
        const timePng = `${Date.now()}.png`;
        const imagePath = path.join(__dirname, "images", timePng);

        fs.writeFileSync(imagePath, imageBuffer);
        console.log(`Image saved at ${imagePath}`);

        console.log(`Starting NFT creation and minting process`);
        await createAndMintNft(prompt, pubKey, timePng, model);
        console.log(`NFT creation and minting process completed`);
      } catch (error) {
        console.error("Error in background processing:", error);
      }
    })();

    return res.json({ image_url: imageUrl });
  } catch (e) {
    return res.status(e.response?.status || 500).json({ detail: e.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
