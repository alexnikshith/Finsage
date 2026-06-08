const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Configure Cloudinary if credentials are provided
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
} else {
  console.warn("⚠️ Cloudinary configuration missing. Receipt uploads will fall back to simulation mode.");
}

// Helper to convert multer buffer to generative part format
function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    }
  };
}

// Helper to extract clean JSON from Gemini text
function extractJSON(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    // Attempt cleaning markdown fences
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  }
}

// Helper to upload buffer stream to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Return simulated URL if credentials are not configured
      return resolve({ secure_url: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=600&q=80" });
    }
    const stream = cloudinary.uploader.upload_stream(
      { folder: "finsage_receipts" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.write(buffer);
    stream.end();
  });
};

/**
 * Perform OCR and categorization on uploaded receipt image using Gemini AI
 */
exports.scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No receipt image uploaded." });
    }

    // 1. Upload to Cloudinary
    let uploadResult;
    try {
      uploadResult = await uploadToCloudinary(req.file.buffer);
    } catch (uploadErr) {
      console.error("Cloudinary Upload Error:", uploadErr.message);
      return res.status(500).json({ message: "Failed to upload receipt image." });
    }

    // 2. Check if Gemini API key is missing
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY missing. Simulating OCR extraction.");
      return res.json({
        success: true,
        receiptImageUrl: uploadResult.secure_url,
        data: {
          merchant: "Domino's Pizza",
          amount: 525,
          date: new Date().toISOString().split('T')[0],
          category: "food",
          confidence: 0.95,
          items: [
            { name: "Pizza", price: 450 },
            { name: "Coke", price: 50 },
            { name: "Tax", price: 25 }
          ]
        }
      });
    }

    // 3. Process with Gemini
    const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
    const prompt = `Analyze this receipt image. Perform OCR to read it, then extract the following details in JSON format.
You must return only a valid JSON object matching this schema, without any markdown formatting:
{
  "merchant": "Name of the merchant/store (string)",
  "amount": total amount paid (number),
  "date": "Date of transaction in YYYY-MM-DD format (string, or null if not found/unclear)",
  "category": "one of: food, groceries, transport, shopping, bills, entertainment, health, education, other",
  "confidence": confidence score between 0.0 and 1.0 based on readability and categorization certainty (number)",
  "items": [
    {
      "name": "item or service name",
      "price": item price
    }
  ]
}

Guidelines for assigning categories:
- food: Restaurants, fast food, coffee shops, pizza, cafés
- groceries: Supermarkets, convenience stores, grocery supplies, fresh food ingredients
- transport: Fuel, petrol, diesel, taxi, Uber, bus, train, flight, parking
- shopping: Apparel, clothes, shoes, electronics, books, accessories
- bills: Utilities, rent, internet, electricity, mobile bills, online subscriptions (e.g., Netflix, Spotify)
- entertainment: Movie theatres, concert tickets, bowling, games, parks
- health: Pharmacy, medicines, doctor visits, hospital bills
- education: School fees, textbooks, online courses, tutorials
- other: Miscellaneous expenses that do not fit the above categories

Return only the raw JSON. Do not write any explanations. Do not include markdown code block syntax.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    let extractedData;
    try {
      extractedData = extractJSON(responseText);
    } catch (parseErr) {
      console.error("Gemini Response Parse Error:", parseErr.message, "Response:", responseText);
      return res.status(500).json({ message: "AI extraction completed, but response was in an invalid format." });
    }

    res.json({
      success: true,
      receiptImageUrl: uploadResult.secure_url,
      data: {
        merchant: extractedData.merchant || "Unknown Merchant",
        amount: Number(extractedData.amount) || 0,
        date: extractedData.date || new Date().toISOString().split('T')[0],
        category: extractedData.category || "other",
        confidence: Number(extractedData.confidence) || 0.7,
        items: extractedData.items || []
      }
    });

  } catch (err) {
    console.error("Receipt Scan Controller Error:", err.message);
    res.status(500).json({ message: "Server error during receipt scanning." });
  }
};

/**
 * Parse a voice input transcript and extract amount, category, merchant, and date using Gemini AI
 */
exports.processVoice = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: "Voice text transcription is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY missing. Simulating voice parsing.");
      return res.json({
        success: true,
        data: {
          merchant: text.toLowerCase().includes("petrol") ? "Petrol Station" : null,
          amount: Number((text.match(/\d+/) || [0])[0]) || 450,
          date: new Date().toISOString().split('T')[0],
          category: text.toLowerCase().includes("groceries") ? "groceries" : text.toLowerCase().includes("petrol") ? "transport" : "other",
          confidence: 0.9
        }
      });
    }

    const prompt = `Analyze this spoken text describing an expense transaction: "${text}"
Extract the details and return them in JSON format.
You must return only a valid JSON object matching this schema, without any markdown formatting:
{
  "merchant": "Name of the merchant/store if explicitly mentioned (string, or null if not mentioned)",
  "amount": total amount paid (number, or null if not mentioned)",
  "date": "relative date described, e.g., 'today', 'yesterday' (string, or null if not mentioned)",
  "category": "one of: food, groceries, transport, shopping, bills, entertainment, health, education, other",
  "confidence": confidence score between 0.0 and 1.0 based on clarity and categorization certainty (number)"
}

Use the same categorization rules:
- food: Restaurants, fast food, coffee shops, pizza, cafés, food delivery
- groceries: Supermarkets, convenience stores, grocery supplies, fresh food ingredients
- transport: Fuel, petrol, diesel, taxi, Uber, bus, train, flight, parking
- shopping: Apparel, clothes, shoes, electronics, books, accessories
- bills: Utilities, rent, internet, electricity, mobile bills, online subscriptions (e.g., Netflix, Spotify)
- entertainment: Movie theatres, concert tickets, bowling, games, parks
- health: Pharmacy, medicines, doctor visits, hospital bills
- education: School fees, textbooks, online courses, tutorials
- other: Miscellaneous expenses that do not fit the above categories

Return only the raw JSON. Do not write any explanations. Do not include markdown code block syntax.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let extractedData;
    try {
      extractedData = extractJSON(responseText);
    } catch (parseErr) {
      console.error("Gemini Voice Parse Error:", parseErr.message, "Response:", responseText);
      return res.status(500).json({ message: "AI voice parsing completed, but response was in an invalid format." });
    }

    res.json({
      success: true,
      data: {
        merchant: extractedData.merchant || null,
        amount: Number(extractedData.amount) || 0,
        date: extractedData.date || new Date().toISOString().split('T')[0],
        category: extractedData.category || "other",
        confidence: Number(extractedData.confidence) || 0.7
      }
    });

  } catch (err) {
    console.error("Voice Processing Controller Error:", err.message);
    res.status(500).json({ message: "Server error during voice input processing." });
  }
};
