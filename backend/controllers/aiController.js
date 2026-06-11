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
    const refDate = req.body.clientDate || new Date().toISOString().split('T')[0];
    const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
    const prompt = `Analyze this receipt image. Perform OCR to read it, then extract the following details in JSON format.
Reference today's date (date of scanning) is ${refDate}.
You must return only a valid JSON object matching this schema, without any markdown formatting:
{
  "merchant": "Name of the merchant/store (string)",
  "amount": total final grand total paid (number, e.g. 525.00 - ignore subtotal/tax breakdowns, look for the final net payment amount after any discounts/taxes)",
  "date": "Date of transaction in YYYY-MM-DD format (string, or null if not found/unclear. If the date is missing, not visible, or unclear on the receipt, return null)",
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
        date: extractedData.date || refDate,
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
    const { text, clientDate } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: "Voice text transcription is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        message: "Gemini API Key is missing. Please set GEMINI_API_KEY in your Vercel project settings or local .env file." 
      });
    }

    const refDate = clientDate || new Date().toISOString().split('T')[0];
    const prompt = `Analyze this spoken text describing an expense transaction: "${text}"
Extract the details and return them in JSON format.
You must return only a valid JSON object matching this schema, without any markdown formatting:
{
  "merchant": "Name of the merchant/store if explicitly mentioned (string, or null if not mentioned)",
  "amount": total final grand total amount paid (number, e.g., 1200 or 450 - extract digits only)",
  "date": "Date of transaction in YYYY-MM-DD format (string, use today's date ${refDate} if relative words like 'today', 'just now' are used; calculate relative date if 'yesterday' or days of the week are mentioned, otherwise null)",
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
        date: extractedData.date || refDate,
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

    const refDate = req.body.clientDate || new Date().toISOString().split('T')[0];
    // Process with Gemini 1.5 Flash
    const audioPart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
    const prompt = `Listen to this audio recording describing an expense transaction.
Extract the transaction details and return them in JSON format.
You must return only a valid JSON object matching this schema, without any markdown formatting:
{
  "merchant": "Name of the merchant/store if explicitly mentioned (string, or null if not mentioned)",
  "amount": total final grand total amount paid (number, e.g., 1200 or 450 - extract digits only)",
  "date": "Date of transaction in YYYY-MM-DD format (string, use today's date ${refDate} if relative words like 'today', 'just now' are used; calculate relative date if 'yesterday' or days of the week are mentioned, otherwise null)",
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
        date: extractedData.date || refDate,
        category: normalizeCategory(extractedData.category),
        confidence: Number(extractedData.confidence) || 0.7
      }
    });

  } catch (err) {
    console.error("Voice Audio Processing Controller Error:", err.message);
    res.status(500).json({ message: "Server error during voice audio processing." });
  }
};

/**
 * Chat with AI Financial Coach using user's real-time financial context
 */
exports.chatWithCoach = async (req, res) => {
  try {
    const { messages, finance } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Messages history array is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        message: "Gemini API Key is missing. Please set GEMINI_API_KEY in your env settings." 
      });
    }

    // 1. Construct the finance context payload
    const salary = finance?.monthlySalary || 0;
    const currency = finance?.currency || 'INR';
    const locale = finance?.locale || 'en-IN';
    const txs = finance?.transactions || [];
    const borrows = finance?.borrows || [];
    const monthlyReports = finance?.monthlyReports || [];
    
    // Sort and limit transactions context to recent 30 items for model token optimization
    const recentTxs = [...txs]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 30)
      .map(t => ({
        title: t.title,
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
        merchant: t.merchant || undefined
      }));

    const systemPrompt = `You are FinSage AI, a precision financial intelligence advisor and coach. Your mission is to help the user optimize their budget, analyze their expenses, guide their savings, and answer questions about their personal finance.

Below is the user's real-time financial profile:
- Base Monthly Salary: ${salary} ${currency}
- Active Currency: ${currency} (Format outputs using locale: ${locale})
- Total Transactions: ${txs.length} item(s)
- Recent 30 Transactions: ${JSON.stringify(recentTxs)}
- Debts / Borrows: ${JSON.stringify(borrows.map(b => ({ source: b.source, amount: b.amount, remainingAmount: b.remainingAmount, status: b.status })))}
- Past Monthly Performance Reports: ${JSON.stringify(monthlyReports.map(r => ({ month: r.month, year: r.year, spent: r.spent, earned: r.earned, savings: r.savings })))}

Guidelines:
1. Provide concise, direct, and actionable financial insights. Avoid generic long explanations unless requested.
2. Format your responses in clean Markdown (use bolding, lists, and tables when comparing numbers).
3. If the user asks a question about their transactions, savings rate, or categories, perform the calculation using the context above.
4. Politely refuse to answer topics that are completely unrelated to personal finance, budgeting, saving, or investing (e.g. general knowledge trivia or coding questions). Keep the discussion strictly focused on financial coaching.
5. Provide precise figures using their active currency (${currency}) and formatting.`;

    // 2. Hydrate the chat contents matching Gemini API requirements
    const formattedContents = [];
    
    messages.forEach(msg => {
      const role = msg.role === 'user' ? 'user' : 'model';
      formattedContents.push({
        role,
        parts: [{ text: msg.content }]
      });
    });

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite",
      systemInstruction: systemPrompt
    });

    const result = await model.generateContent({
      contents: formattedContents
    });

    const reply = result.response.text();
    res.json({
      success: true,
      reply
    });

  } catch (err) {
    console.error("AI Financial Coach Controller Error:", err.message);
    
    // Robust Fallback Mock Responses when Gemini API fails (e.g. Quota Exceeded 429)
    try {
      const { messages = [], finance = {} } = req.body;
      const salary = finance.monthlySalary || 0;
      const currency = finance.currency || 'INR';
      const txs = finance.transactions || [];
      const userMessage = messages[messages.length - 1]?.content || "";
      const lowerMsg = userMessage.toLowerCase();
      let reply = "";
      
      if (lowerMsg.includes("hello") || lowerMsg.includes("hi") || lowerMsg.includes("hey")) {
        reply = `Hello! I am your FinSage AI Coach (Offline Backup Mode). \n\nHow can I help you optimize your personal finances today?`;
      } else if (lowerMsg.includes("budget") || lowerMsg.includes("overview")) {
        reply = `Here is your budget overview (Offline Backup):\n- **Monthly Salary**: ${salary} ${currency}\n- **Recent Transactions**: ${txs.length} item(s) logged.\n\nSign in to get advanced AI analysis!`;
      } else if (lowerMsg.includes("spending") || lowerMsg.includes("expense") || lowerMsg.includes("category")) {
        reply = `Looking at your recent spending:\n- You have **${txs.length}** transactions.\n- Your monthly salary is set to **${salary} ${currency}**.\n\nPlease log in to visualize deep spending breakdowns!`;
      } else if (lowerMsg.includes("saving") || lowerMsg.includes("track")) {
        reply = `To analyze your savings rate and keep track of your goals over time, we recommend signing in to set up a permanent cloud-synchronized budget.`;
      } else {
        reply = `I am your FinSage AI Coach. (Note: Gemini API is currently offline or rate-limited, so I am answering using my backup rules engine.)\n\nYou asked: "${userMessage}"\n\nTo get full AI coaching insights, please consider signing in!`;
      }
      
      return res.json({
        success: true,
        reply
      });
    } catch (fallbackErr) {
      console.error("AI Coach Fallback Error:", fallbackErr.message);
      return res.status(500).json({ message: "Server error during coach chat generation." });
    }
  }
};
