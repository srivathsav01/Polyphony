import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "My name is Sri. Remember it." },
  { role: "assistant", content: "Got it, Sri." },
  { role: "user", content: "What's my name?" },
];

const res = await client.messages.create({
  model: "claude-haiku-5-5",
  max_tokens: 100,
  messages,
});

console.log(res.content[0]?.type === "text" ? res.content[0].text : "");
console.log("input tokens:", res.usage.input_tokens);