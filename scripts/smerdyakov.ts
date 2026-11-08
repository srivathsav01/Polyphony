import "dotenv/config";
import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// usage: npx tsx scripts/smerdyakov.ts "<belief>" [promptVersion] [effort]
const [belief, version = "v1", effort = "low"] = process.argv.slice(2);
if (!belief) throw new Error("Pass a belief as the first argument");

const system = await readFile(`prompts/smerdyakov/${version}.md`, "utf8");

const NAMES = ["Anaya", "Tomasz", "Ines", "Kwame", "Mirela", "Joon", "Farah", "Luca", "Thandi", "Ravi", "Elif", "Mateo"];
const pick = [...NAMES].sort(() => Math.random() - 0.5).slice(0, 3);

const start = Date.now();
const res = await client.messages.create({
  model: "claude-haiku-5-5",
  max_tokens: 4000,
  output_config: { effort: effort as "low" | "medium" | "high" },
  thinking: { type: "adaptive", display: "summarized" },
  system,
  messages: [{ role: "user", content: `${belief}\n\n(Names you may use for people in the story: ${pick.join(", ")})` }],
});

// See every block the model returned, not just text
for (const block of res.content) {
  if (block.type === "thinking") {
    console.log("💭 THINKING:\n" + block.thinking + "\n");
  } else if (block.type === "text") {
    console.log("\n---");
    console.log(block.text);
  }
}

if (res.stop_reason === "max_tokens") console.warn("\n⚠ TRUNCATED");
console.log("\n---");
console.log(
  `prompt: ${version} | effort: ${effort} | blocks: ${res.content.map((b) => b.type).join(",")} | tokens in/out: ${res.usage.input_tokens}/${res.usage.output_tokens} | ${Date.now() - start}ms`
);