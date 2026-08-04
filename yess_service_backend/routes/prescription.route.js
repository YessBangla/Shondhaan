import express from "express";
import axios from "axios";

const router = express.Router();

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY;

router.post("/scan", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        message: "No image provided",
      });
    }

    if (!OCR_SPACE_API_KEY) {
      return res.status(500).json({
        message: "OCR.space API key not configured",
      });
    }

    const response = await axios.post(
      "https://api.ocr.space/parse/image",
      {
        base64Image: image,
        language: "eng",
        isOverlayRequired: false,
        OCREngine: 2,
      },
      {
        headers: {
          apikey: OCR_SPACE_API_KEY,
        },
      }
    );

    if (response.data.IsErroredOnProcessing) {
      console.error(response.data.ErrorMessage);

      return res.status(502).json({
        message: response.data.ErrorMessage?.join(", ") || "OCR failed",
      });
    }

    const parsedResults = response.data.ParsedResults;

    if (!parsedResults || parsedResults.length === 0) {
      return res.status(404).json({
        message: "No text found in image",
      });
    }

    const rawText = parsedResults[0].ParsedText || "";

    console.log("========== OCR RESULT ==========");
    console.log(rawText);
    console.log("================================");

    return res.json({
      success: true,
      text: rawText,
    });
  } catch (err) {
    console.error("OCR Error:", err.response?.data || err.message);

    return res.status(500).json({
      message: "OCR scan failed",
    });
  }
});

export default router;