# Smerdyakov prompt notes

## v4 (frozen)
- Few-shot example controls length better than rules
- Name injection from code works

## Parked
- Recurring specifics across runs: "eleven" people/employees, laundromat, clinic
- Option: inject a random number/setting from code like names
- Measure repetition in Week 4 evals (same belief x10)
- Input cost: even "hello" costs ~771 input tokens, nearly all system prompt. Every request repays it. Fix with prompt caching
- Unsympathetic beliefs ("People who don't work hard deserve less") use the most tokens (2,027 out) and drift into cautionary tales, weak on "show gains"
- Format drift: closing line varies ("and you never asked me to stop", "I'm sorry about the cost sheet", italics); one part had 6 sentences. Fix with structured JSON output
- More recurring tropes: "corner office", child asking "what you do all day" at Christmas