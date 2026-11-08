import "dotenv/config";
import Fastify from "fastify";
import { streamSmerdyakov } from "./llm/smerdyakov.js";

const app = Fastify({ logger: true });
const SENTINEL = "NOT_A_BELIEF";

// true while the text so far could still turn out to be the sentinel
const couldBeSentinel = (s: string) => {
  const t = s.trimStart();
  return t.length <= SENTINEL.length && SENTINEL.startsWith(t);
};

app.post<{ Body: { belief?: string } }>("/api/stress-test", async (req, reply) => {
  const belief = req.body?.belief?.trim();
  if (!belief || belief.length > 500) {
    return reply.code(400).send({ error: "Belief must be 1 to 500 characters" });
  }

  // We write the raw response ourselves, so tell Fastify to step aside
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let clientGone = false;
  const send = (event: string, data: unknown) => {
    if (!clientGone) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const start = Date.now();
  const stream = await streamSmerdyakov(belief);

  // If the user closes the tab, stop paying for tokens nobody will read
  res.on("close", () => {
    if (!res.writableEnded) {
      clientGone = true;
      stream.abort();
      req.log.info("client disconnected, LLM stream aborted");
    }
  });

  let buffer = "";
  let flushed = false;

  stream.on("text", (delta) => {
    if (flushed) return send("delta", { text: delta });
    buffer += delta;
    if (!couldBeSentinel(buffer)) {
      flushed = true;
      send("delta", { text: buffer });
    }
  });

  try {
    const final = await stream.finalMessage();

    if (!flushed) {
      if (buffer.trim() === SENTINEL) send("not_a_belief", {});
      else send("delta", { text: buffer });
    }

    const usage = final.usage;
    req.log.info({ usage, ms: Date.now() - start, stop: final.stop_reason }, "llm call");

    send("done", {
      truncated: final.stop_reason === "max_tokens",
      outputTokens: usage.output_tokens,
      ms: Date.now() - start,
    });
  } catch (err) {
    if (!clientGone) {
      req.log.error(err);
      send("error", { message: "Smerdyakov fell silent. Try again." });
    }
  } finally {
    res.end();
  }
});

app.listen({ port: 3001 });