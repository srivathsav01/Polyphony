import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const NAMES = ["Anaya", "Tomasz", "Ines", "Kwame", "Mirela", "Joon", "Farah", "Luca", "Thandi", "Ravi", "Elif", "Mateo"];
export const PROMPT_VERSION = "v4";

const promptCache = new Map<string, string>();

async function loadPrompt(version: string) {
  if (!promptCache.has(version)) {
    promptCache.set(version, await readFile(`prompts/smerdyakov/${version}.md`, "utf8"));
  }
  return promptCache.get(version)!;
}

export async function streamSmerdyakov(belief: string, version = PROMPT_VERSION) {
  const system = await loadPrompt(version);
  const names = [...NAMES].sort(() => Math.random() - 0.5).slice(0, 3);

  return client.messages.stream({
    model: "claude-haiku-5-5",
    max_tokens: 4000,
    output_config: { effort: "medium" },
    system,
    messages: [
      {
        role: "user",
        content: `${belief}\n\n(Names you may use for people in the story: ${names.join(", ")})`,
      },
    ],
  });
}