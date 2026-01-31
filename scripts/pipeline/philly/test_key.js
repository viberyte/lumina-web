import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

console.log("ANTHROPIC_API_KEY from env:", process.env.ANTHROPIC_API_KEY);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
console.log("Anthropic SDK initialized successfully");

async function testAPI() {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hello" }],
    });
    console.log("✅ API call successful!");
  } catch (err) {
    console.error("❌ API call failed:", err.message);
  }
}

testAPI();
