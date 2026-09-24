// api/quote.js  -  Vercel Serverless Function
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { image, mimeType } = req.body || {};
    if (!image) return res.status(400).json({ error: "Image missing" });

    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const prompt = `Ye ek e-waste / purani electronic item ki photo hai (India market).
Sirf JSON return karo, aur kuch nahi, is format mein:
{"device":"naam/type","brand":"brand ya unknown","condition":"working/damaged/dead",
"min_price_inr":number,"max_price_inr":number,"note":"1 line Hinglish mein"}
Price realistic scrap/resale value ke hisaab se INR mein do. Agar photo mein electronics nahi hai to device="unknown" aur prices 0.`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: "AI ne jawab nahi diya", details: data });

    return res.status(200).json(JSON.parse(text));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
