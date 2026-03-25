const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function analyzeCompetitors(scrapedDataArray, category) {
  console.log(`🤖 Sending data to Claude for analysis...`);

  // Format all scraped data into one block of text for Claude
  const competitorText = scrapedDataArray.map((item, index) => `
=== COMPETITOR ${index + 1} (ASIN: ${item.asin}) ===
TITLE: ${item.title}
PRICE: ${item.price}
RATING: ${item.rating} (${item.reviewCount})

BULLET POINTS:
${item.bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}

A+ CONTENT:
${item.aplus}

TOP REVIEWS:
${item.reviews.map(r => `[${r.rating}] ${r.title}: ${r.body}`).join('\n\n')}
`).join('\n\n');

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4000,
    system: `You are an Amazon listing strategist. You analyze competitor product listings and customer reviews to extract conversion signals. Always respond in valid JSON only — no markdown, no preamble, no explanation. Just the raw JSON object.`,
    messages: [{
      role: 'user',
      content: `Analyze the following competitor listing data for the "${category}" category on Amazon.

${competitorText}

Extract and return a JSON object with these exact keys:
{
  "top_claims": ["array of 5 strongest product claims competitors make — be specific"],
  "emotional_triggers": ["array of 5 emotional hooks used (e.g. peace of mind, saves time, trusted by families)"],
  "common_objections": ["array of 5 objections or complaints mentioned in negative reviews"],
  "feature_gaps": ["array of 3 features customers want but NO competitor currently delivers well"],
  "power_words": ["array of 10 high-frequency persuasion words found in top listings"],
  "keyword_themes": [
    { "theme": "theme name", "keywords": ["kw1", "kw2"], "intent": "informational|transactional|navigational" }
  ],
  "competitor_summary": [
    { "asin": "B0...", "strength": "what they do best", "weakness": "biggest gap or complaint", "price": "$xx" }
  ],
  "recommended_positioning": "1 paragraph: how your client should position against these competitors"
}`
    }]
  });

  // Parse the JSON response
  const rawText =
    (Array.isArray(response.content)
      ? response.content
          .filter((part) => part?.type === "text" && typeof part?.text === "string")
          .map((part) => part.text)
          .join("\n")
      : "") || response?.content?.[0]?.text || "";
  
  try {
    // Claude sometimes wraps JSON in ```json ... ``` code fences.
    // Extract the first JSON object to make parsing resilient.
    const cleaned = rawText
      .trim()
      .replace(/^```[a-zA-Z0-9]*\s*/, "")
      .replace(/```$/s, "")
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI response did not contain valid JSON object");

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('✅ Claude analysis complete');
    return parsed;
  } catch (e) {
    console.error('❌ Claude returned invalid JSON. Raw response:', rawText);
    throw new Error('Claude JSON parse error');
  }
}

module.exports = { analyzeCompetitors };