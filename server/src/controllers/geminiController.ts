import type { Request, Response } from 'express';

const PROMPT = `You are a nutrition analysis assistant. Analyze this food photo and estimate the nutritional content.

Return ONLY a valid JSON object — no markdown, no explanation, no code fences — in exactly this shape:
{
  "dishName": "short descriptive name of the dish",
  "gramsPerServing": <number: estimated grams for one typical serving>,
  "calories": <number: estimated kcal for that serving>,
  "carbs": <number: grams of carbohydrates>,
  "protein": <number: grams of protein>,
  "fat": <number: grams of fat>,
  "isCooked": <boolean: true if the food appears cooked>,
  "confidence": "low" | "medium" | "high",
  "notes": "one short sentence about the dish or any assumptions made"
}

Rules:
- All numeric values must be whole numbers (no decimals).
- If you cannot identify the food clearly, set confidence to "low" and provide your best estimate.
- Never refuse — always return the JSON shape above.`;

export async function analyzeFoodPhoto(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { imageBase64, mimeType } = req.body as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64 || !mimeType) {
      res.status(400).json({ message: 'imageBase64 and mimeType are required' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      res.status(503).json({ message: 'Gemini API key not set. Get a free key at aistudio.google.com and add it to server/.env as GEMINI_API_KEY=...' });
      return;
    }

    // Dynamic import so missing package won't crash the server on startup
    let GoogleGenerativeAI: typeof import('@google/generative-ai').GoogleGenerativeAI;
    try {
      ({ GoogleGenerativeAI } = await import('@google/generative-ai'));
    } catch {
      res.status(503).json({ message: 'Gemini package not installed. Run: npm install in the server folder.' });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
        },
      },
    ]);

    const raw = result.response.text().trim();

    // Strip any accidental markdown code fences Gemini sometimes adds
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed: {
      dishName: string;
      gramsPerServing: number;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
      isCooked: boolean;
      confidence: string;
      notes: string;
    };

    try {
      parsed = JSON.parse(cleaned) as typeof parsed;
    } catch {
      console.error('Gemini returned non-JSON:', raw);
      res.status(502).json({ message: 'Gemini returned an unexpected response. Try a clearer photo.' });
      return;
    }

    // Coerce all numeric fields to integers and sanitise
    res.status(200).json({
      dishName: String(parsed.dishName ?? 'Unknown dish'),
      gramsPerServing: Math.round(Number(parsed.gramsPerServing) || 200),
      calories: Math.round(Number(parsed.calories) || 0),
      carbs: Math.round(Number(parsed.carbs) || 0),
      protein: Math.round(Number(parsed.protein) || 0),
      fat: Math.round(Number(parsed.fat) || 0),
      isCooked: Boolean(parsed.isCooked ?? true),
      confidence: parsed.confidence ?? 'medium',
      notes: String(parsed.notes ?? ''),
    });
  } catch (error) {
    console.error('Gemini analyze failed:', error);
    res.status(500).json({ message: 'Gemini analysis failed. Check your API key and try again.' });
  }
}
