import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Status = "idle" | "streaming" | "done" | "error" | "not_a_belief";

export default function App() {
  const [belief, setBelief] = useState("");
  const [story, setStory] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [meta, setMeta] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  function handleEvent(raw: string) {
    const event = raw.match(/^event: (.*)$/m)?.[1];
    const data = JSON.parse(raw.match(/^data: (.*)$/m)?.[1] ?? "{}");

    if (event === "delta") setStory((s) => s + data.text);
    else if (event === "not_a_belief") setStatus("not_a_belief");
    else if (event === "error") setStatus("error");
    else if (event === "done") {
  setStatus((s) =>
    s === "not_a_belief" ? s : data.truncated ? "error" : "done"
  );
  setMeta(`${data.outputTokens} tokens · ${(data.ms / 1000).toFixed(1)}s`);
}
  }

  async function run() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStory("");
    setMeta("");
    setStatus("streaming");

    try {
      const res = await fetch("/api/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ belief }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        // network chunks don't line up with events, so split on the
        // blank line that ends each event and keep the incomplete tail
        const events = buf.split("\n\n");
        buf = events.pop()!;
        events.forEach(handleEvent);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("error");
    }
  }

  function stop() {
    abortRef.current?.abort();
    setStatus("idle");
  }

  return (
    <main style={{ maxWidth: 680, margin: "40px auto", padding: "0 16px", fontFamily: "Georgia, serif" }}>
      <h1>Smerdyakov</h1>
      <p style={{ opacity: 0.7 }}>Tell me what you believe. I will simply obey it.</p>

      <textarea
        value={belief}
        onChange={(e) => setBelief(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="I should quit my job and go all in on my startup."
        style={{ width: "100%", fontSize: 16, padding: 8 }}
      />

      <div style={{ display: "flex", gap: 8, margin: "8px 0 24px" }}>
        <button onClick={run} disabled={!belief.trim() || status === "streaming"}>
          {status === "streaming" ? "He is writing..." : "Obey it"}
        </button>
        {status === "streaming" && <button onClick={stop}>Stop</button>}
      </div>

      {status === "not_a_belief" && <p>That is not a belief. Give me something you hold to be true.</p>}
      {status === "error" && <p style={{ color: "crimson" }}>Something went wrong. Try again.</p>}

      <ReactMarkdown>{story}</ReactMarkdown>

      {meta && <p style={{ opacity: 0.5, fontSize: 13 }}>{meta}</p>}
    </main>
  );
}