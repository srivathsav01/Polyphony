# Polyphony

> A belief stress-tester inspired by Dostoevsky's *The Brothers Karamazov*.

You write down a belief, principle or decision you hold. Characters from the novel respond to it. The first voice, **Smerdyakov**, doesn't argue with your belief. He obeys it completely, and writes a short second-person story showing where it leads one week, one year and ten years later.

In the novel, Ivan argues that "everything is permitted," and Smerdyakov is the one who quietly acts on it. Polyphony is built around that gap between holding an idea and living with what follows from it.

## Status

**Week 1 complete:** Smerdyakov voice, streaming API, React client.

Planned: four voices (Ivan, Dmitri, Alyosha, Smerdyakov) running as jobs on [MiniQueue](https://github.com/srivathsav01/MiniQueue), a resumable orchestration engine, an eval harness for prompt regressions, cost and latency engineering, and belief history with embeddings.

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js, TypeScript, Fastify |
| LLM | Anthropic TypeScript SDK 1.x, Claude Haiku 5.5 |
| Streaming | Server-Sent Events over `POST` + `fetch` |
| Frontend | React, Vite, react-markdown |

## Running locally

```bash
# 1. API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# 2. Install
npm install
cd web && npm install && cd ..

# 3. Run (two terminals)
npm run dev              # API on :3001
cd web && npm run dev    # client on :5173
```

Try a prompt version directly from the CLI:

```bash
npx tsx scripts/smerdyakov.ts "<belief>" <promptVersion> <effort>
# e.g.
npx tsx scripts/smerdyakov.ts "I should quit my job and go all in on my startup." v4 medium
```

## Prompt engineering log

All prompts live in versioned files under `prompts/`, never inline in code. Each version was tested on the same belief at `medium` effort.

| Version | Change | Output tokens | Latency |
|---|---|---|---|
| v1 | Baseline, "80 to 120 words per part" | 3,491 | 16.1s |
| v2 | Removed word count, added name and setting rules | 1,772 | 12.0s |
| v3 | "At most five sentences per part" | 1,985 | 11.9s |
| v4 | Few-shot style example, names injected from code | 1,152 | 7.7s |

**v1 → v4: 67% fewer output tokens, 52% lower latency, with no loss in story quality.**

What each step taught:

- **v1:** reading the model's thinking showed most of it was spent *counting words*. Precise numeric constraints cost tokens, because the model keeps verifying them.
- **v2:** removing the word count halved the cost, but the model filled the freed space with longer parts.
- **v3:** the model met the five-sentence rule exactly by writing longer, comma-chained sentences. Goodhart's law in action: models optimise for exactly what you write.
- **v4:** one short example controlled length and rhythm better than any rule. Varying names are injected from code, because prompt rules alone didn't stop the model reusing favourite names.

See [`prompts/smerdyakov/NOTES.md`](prompts/smerdyakov/NOTES.md) for parked issues.

## Engineering notes

### Anthropic API 2026-10-21 removed `temperature`

The first API call failed to compile with `TS2769`: `temperature` no longer exists on the request type. API version `2026-10-21` and TypeScript SDK 1.0.0 removed `temperature`, `top_p` and `top_k` across all models; sending them returns a 400.

Takeaways:
- Pin SDK versions and read changelogs before major upgrades.
- Get consistency from tighter prompts and structured output, not sampling parameters.
- The planned `LLMProvider` interface treats sampling parameters as optional and provider-specific (OpenAI and local models still accept them).

### Adaptive thinking can consume the whole `max_tokens` budget

Claude Haiku 5.5 thinks by default, and thinking tokens count toward `max_tokens`. An early request returned an empty story: all 1,200 tokens went to thinking, `stop_reason` was `max_tokens`, and no text block was produced. Fixed by raising `max_tokens`, choosing an `effort` level explicitly, and logging every content block type.

Effort comparison on the same belief (v1 prompt):

| Effort | Output tokens | Latency | Result |
|---|---|---|---|
| low | 1,973 | 12.2s | decent story |
| medium | 3,491 | 16.1s | best story |
| high | 4,000 (cap) | 21.4s | truncated, no story |

### Streaming design

- **`POST` + `fetch`, not `EventSource`:** `EventSource` auto-reconnects, which would silently trigger a new, paid LLM call.
- **Sentinel buffering:** non-beliefs return the sentinel `NOT_A_BELIEF`. The server holds back text only while it could still become the sentinel, so the raw string never flashes in the UI.
- **Abort on disconnect:** if the client closes the connection, the server aborts the LLM stream so unread tokens aren't generated and billed.
- **Terminal states are never overwritten:** a later `done` event must not replace a `not_a_belief` state (an early bug, fixed with a functional state update).
