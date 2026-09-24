// api/quote.js  -  Vercel Serverless Function
// Vercel Environment Variables:
//   GEMINI_API_KEY = aapki free key (https://aistudio.google.com/apikey)
//   GEMINI_MODEL   = (optional) agar kisi model ko force karna ho

const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("GEMINI_API_KEY missing in Vercel env variables");
    return res.status(500).json({ error: "GEMINI_API_KEY set nahi hai" });
  }

  try {
    const { image, mimeType } = req.body || {};
    if (!image) return res.status(400).json({ error: "Image missing" });

    const prompt = `Ye ek e-waste / purani electronic item ki photo hai (India market).
Sirf JSON return karo, aur kuch nahi, is format mein:
{"device":"naam/type","brand":"brand ya unknown","condition":"working/damaged/dead",
"min_price_inr":number,"max_price_inr":number,"note":"1 line Hinglish mein"}
Price realistic scrap/resale value ke hisaab se INR mein do. Agar photo mein electronics nahi hai to device="unknown" aur prices 0.`;

    const models = [process.env.GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean);
    let lastError = "unknown error";

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || "image/jpeg", data: image } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });

      const data = await r.json();

      if (!r.ok) {
        lastError = `${model}: ${data?.error?.message || r.status}`;
        console.error("Gemini error ->", lastError);
        continue; // agla model try karo
      }

      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts.filter(p => !p.thought).map(p => p.text || "").join("").trim();
      if (!text) {
        lastError = `${model}: khaali jawab`;
        console.error("Gemini empty ->", JSON.stringify(data).slice(0, 500));
        continue;
      }

      const clean = text.replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(clean));
    }

    return res.status(500).json({ error: lastError });
  } catch (e) {
    console.error("quote.js crash ->", e);
    return res.status(500).json({ error: e.message });
  }
}
