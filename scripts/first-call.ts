import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// usage: npx tsx scripts/first-call.ts "<prompt>" [system]
const [prompt = "Is honesty always good?", system = ""] = process.argv.slice(2);

const start = Date.now();

const res = await client.messages.create({
  model: "claude-haiku-5-5",
  max_tokens: 400,
  ...(system && { system }),
  messages: [{ role: "user", content: prompt }],
});

const text = res.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("");

console.log(text);
console.log("\n---");
console.log("stop_reason:", res.stop_reason);
console.log("tokens in/out:", res.usage.input_tokens, res.usage.output_tokens);
console.log("latency ms:", Date.now() - start);