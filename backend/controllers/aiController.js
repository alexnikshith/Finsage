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
      return reject(new Error("Cloudinary cloud name is not configured."));
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

// Helper to clean and extract numeric amounts from Gemini output strings
function cleanAmount(amt) {
  if (amt === undefined || amt === null) return 0;
  if (typeof amt === 'number') return amt;
  
  // Strip out commas and trim whitespace
  const str = String(amt).replace(/,/g, '').trim();
  // Find first decimal/digit sequence
  const match = str.match(/[\d\.]+/);
  if (match) {
    const val = Number(match[0]);
    return isNaN(val) ? 0 : val;
  }
  return 0;
}

// Helper to normalize the category to one of the strict IDs supported by the frontend
function normalizeCategory(cat) {
  if (!cat) return 'other';
  const clean = cat.toLowerCase().trim();

  // 1. Food
  if (['food', 'dining', 'dinner', 'lunch', 'breakfast', 'restaurant', 'cafe', 'eat', 'eating', 'beverage', 'drinks', 'pizza', 'burger', 'swiggy', 'zomato', 'starbucks'].some(k => clean.includes(k))) {
    return 'food';
  }
  // 2. Groceries
  if (['grocery', 'groceries', 'supermarket', 'mart', 'market', 'vegetables', 'fruits', 'milk', 'provisions', 'blinkit', 'zepto', 'instamart'].some(k => clean.includes(k))) {
    return 'groceries';
  }
  // 3. Transport
  if (['transport', 'transportation', 'travel', 'cab', 'taxi', 'uber', 'ola', 'auto', 'metro', 'bus', 'train', 'flight', 'ticket', 'petrol', 'fuel', 'diesel', 'gasoline', 'toll', 'parking'].some(k => clean.includes(k))) {
    return 'transport';
  }
  // 4. Shopping
  if (['shopping', 'clothing', 'clothes', 'shoes', 'apparel', 'amazon', 'flipkart', 'myntra', 'electronic', 'device', 'gadget', 'accessory'].some(k => clean.includes(k))) {
    return 'shopping';
  }
  // 5. Bills
  if (['bill', 'bills', 'rent', 'electricity', 'power', 'water', 'gas', 'utility', 'utilities', 'recharge', 'phone', 'mobile', 'wifi', 'internet', 'broadband', 'subscription', 'netflix', 'spotify', 'youtube', 'prime'].some(k => clean.includes(k))) {
    return 'bills';
  }
  // 6. Entertainment
  if (['entertainment', 'movie', 'cinema', 'theatre', 'show', 'concert', 'game', 'gaming', 'bowling', 'park', 'club', 'bar', 'pub', 'party'].some(k => clean.includes(k))) {
    return 'entertainment';
  }
  // 7. Health
  if (['health', 'healthcare', 'medical', 'medicine', 'medicines', 'pharmacy', 'doctor', 'clinic', 'hospital', 'dentist'].some(k => clean.includes(k))) {
    return 'health';
  }
  // 8. Education
  if (['education', 'school', 'college', 'course', 'class', 'book', 'books', 'stationery', 'fee', 'fees', 'tuition', 'tutorial'].some(k => clean.includes(k))) {
    return 'education';
  }
  
  const VALID_CATEGORIES = ['food', 'groceries', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
  if (VALID_CATEGORIES.includes(clean)) return clean;
  return 'other';
}

/**
 * Perform OCR and categorization on uploaded receipt image using Gemini AI
 */
exports.scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No receipt image uploaded." });
    }

    // Check configuration variables
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        message: "Gemini API Key is missing. Please set GEMINI_API_KEY in your Vercel project settings or local .env file." 
      });
    }

    // 1. Upload to Cloudinary (optional fallback to base64 Data URI)
    let receiptImageUrl;
    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
    
    if (isCloudinaryConfigured) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        receiptImageUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        console.warn("⚠️ Cloudinary Upload failed, falling back to base64:", uploadErr.message);
        receiptImageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }
    } else {
      console.info("ℹ️ Cloudinary not configured. Storing receipt image as base64 Data URI.");
      receiptImageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // 3. Process with Gemini
    const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
    const prompt = `Analyze this receipt image. Perform OCR to read it, then extract the following details in JSON format.
You must return only a valid JSON object matching this schema, without any markdown formatting:
{
  "merchant": "Name of the merchant/store (string)",
  "amount": total final grand total paid (number, e.g. 525.00 - ignore subtotal/tax breakdowns, look for the final net payment amount after any discounts/taxes)",
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
- food: Restaurants, fast food, coffee shops, pizza, cafés, dinner, lunch, breakfast, beverages
- groceries: Supermarkets, grocery stores, grocery supplies, fresh food ingredients, fruits/vegetables, milk
- transport: Fuel, petrol, diesel, taxi, Uber, Ola, bus, train, flights, parking, tolls
- shopping: Apparel, clothes, shoes, electronics, books, retail items, online shopping (e.g. Amazon)
- bills: Utilities, rent, electricity, water, internet, phone bill, online subscriptions (Netflix, Spotify)
- entertainment: Movie theatres, concert tickets, bowling, games, parks, bars, pubs
- health: Pharmacy, medicines, doctor visits, healthcare bills, dentist
- education: School fees, tuition, online courses, textbooks, tutorials
- other: Miscellaneous expenses that do not fit the above categories

Return only the raw JSON. Do not write any explanations. Do not include markdown code block syntax.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
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
      receiptImageUrl: receiptImageUrl,
      data: {
        merchant: extractedData.merchant || "Unknown Merchant",
        amount: cleanAmount(extractedData.amount),
        date: extractedData.date || new Date().toISOString().split('T')[0],
        category: normalizeCategory(extractedData.category),
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
      return res.status(400).json({ 
        message: "Gemini API Key is missing. Please set GEMINI_API_KEY in your Vercel project settings or local .env file." 
      });
    }

    const prompt = `Analyze this spoken text describing an expense transaction: "${text}"
Extract the details and return them in JSON format.
You must return only a valid JSON object matching this schema, without any markdown formatting:
{
  "merchant": "Name of the merchant/store if explicitly mentioned (string, or null if not mentioned)",
  "amount": total final grand total amount paid (number, e.g., 1200 or 450 - extract digits only)",
  "date": "Date of transaction in YYYY-MM-DD format (string, use today's date ${new Date().toISOString().split('T')[0]} if relative words like 'today', 'just now' are used; calculate relative date if 'yesterday' or days of the week are mentioned, otherwise null)",
  "category": "one of: food, groceries, transport, shopping, bills, entertainment, health, education, other",
  "confidence": confidence score between 0.0 and 1.0 based on clarity and categorization certainty (number)"
}

Guidelines for assigning categories:
- food: Eating out, dinner, dinner with friends, lunch, breakfast, burger, pizza, cafe, food delivery (Swiggy, Zomato)
- groceries: Supermarkets, grocery items, milk, vegetables, grocery stores, Blinkit, Zepto
- transport: Petrol, diesel, fuel, Uber, cab, taxi, metro, bus, parking, auto, flight
- shopping: Clothing, shoes, retail shop, electronics, shopping on Amazon/Flipkart
- bills: Electricity bill, rent, water, internet/broadband bill, mobile recharge, subscriptions (Netflix, Spotify)
- entertainment: Movie, cinema, show, concert, gaming, bowling, pub, bar, party
- health: Pharmacy, medicines, doctor, clinic, hospital
- education: Course, books, tuition fee, school/college fees, tutorial
- other: Any miscellaneous expenses that do not fit the above categories

Return only the raw JSON. Do not write any explanations. Do not include markdown code block syntax.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
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
        amount: cleanAmount(extractedData.amount),
        date: extractedData.date || new Date().toISOString().split('T')[0],
        category: normalizeCategory(extractedData.category),
        confidence: Number(extractedData.confidence) || 0.7
      }
    });

  } catch (err) {
    console.error("Voice Processing Controller Error:", err.message);
    res.status(500).json({ message: "Server error during voice input processing." });
  }
};

/**
 * Parse an uploaded voice audio file and extract amount, category, merchant, and date using Gemini AI
 */
exports.processVoiceFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file uploaded." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        message: "Gemini API Key is missing. Please set GEMINI_API_KEY in your Vercel project settings or local .env file." 
      });
    }

    // Process with Gemini 1.5 Flash
    const audioPart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
    const prompt = `Listen to this audio recording describing an expense transaction.
Extract the transaction details and return them in JSON format.
You must return only a valid JSON object matching this schema, without any markdown formatting:
{
  "merchant": "Name of the merchant/store if explicitly mentioned (string, or null if not mentioned)",
  "amount": total final grand total amount paid (number, e.g., 1200 or 450 - extract digits only)",
  "date": "Date of transaction in YYYY-MM-DD format (string, use today's date ${new Date().toISOString().split('T')[0]} if relative words like 'today', 'just now' are used; calculate relative date if 'yesterday' or days of the week are mentioned, otherwise null)",
  "category": "one of: food, groceries, transport, shopping, bills, entertainment, health, education, other",
  "confidence": confidence score between 0.0 and 1.0 based on clarity and categorization certainty (number)"
}

Guidelines for assigning categories:
- food: Eating out, dinner, dinner with friends, lunch, breakfast, burger, pizza, cafe, food delivery (Swiggy, Zomato)
- groceries: Supermarkets, grocery items, milk, vegetables, grocery stores, Blinkit, Zepto
- transport: Petrol, diesel, fuel, Uber, cab, taxi, metro, bus, parking, auto, flight
- shopping: Clothing, shoes, retail shop, electronics, shopping on Amazon/Flipkart
- bills: Electricity bill, rent, water, internet/broadband bill, mobile recharge, subscriptions (Netflix, Spotify)
- entertainment: Movie, cinema, show, concert, gaming, bowling, pub, bar, party
- health: Pharmacy, medicines, doctor, clinic, hospital
- education: Course, books, tuition fee, school/college fees, tutorial
- other: Any miscellaneous expenses that do not fit the above categories

Return only the raw JSON. Do not write any explanations. Do not include markdown code block syntax.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();

    let extractedData;
    try {
      extractedData = extractJSON(responseText);
    } catch (parseErr) {
      console.error("Gemini Audio Voice Parse Error:", parseErr.message, "Response:", responseText);
      return res.status(500).json({ message: "AI voice parsing completed, but response was in an invalid format." });
    }

    res.json({
      success: true,
      data: {
        merchant: extractedData.merchant || null,
        amount: cleanAmount(extractedData.amount),
        date: extractedData.date || new Date().toISOString().split('T')[0],
        category: normalizeCategory(extractedData.category),
        confidence: Number(extractedData.confidence) || 0.7
      }
    });

  } catch (err) {
    console.error("Voice Audio Processing Controller Error:", err.message);
    res.status(500).json({ message: "Server error during voice audio processing." });
  }
};
