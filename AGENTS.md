<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# House rules for this site

*Added 8 September 2026 after the redesign research. Reasoning and sources: `ClaudeOS/projects/rossvincent-com/redesign-research-2026-09-08.md`.*

## What this site is for

Ross diagnoses where a founder-led business loses time and money, then fixes it. The order of fixes is: eliminate, simplify, standardise, clarify who owns what, clean the data, automate, and only then AI. **This is not an AI consultancy and the site must never read as one.** Ground every design and copy decision in that, not in a style.

## Five looks to never produce

These are the default aesthetics a language model reaches for when given no brief. Anthropic publishes them as things to avoid (`anthropics/skills`, `skills/frontend-design/SKILL.md`). This site fell into the first and fourth before the redesign.

1. Warm cream background (around `#F4F1EA`) with a terracotta accent (around `#D97757`).
2. Near-black background with bright acid green or vermilion.
3. A grid of identical rounded cards, each with the same soft shadow. **This is the specific trap for the board page.**
4. An all-caps small label sitting above every heading.
5. Labels shaped `WORD` then a spaced dash then a fragment.

Also banned on sight: a coloured stripe down the left edge of a card, a card nested inside a card inside a panel, any gradient, emoji as bullet points.

## Typography

- One typeface, or two that feel clearly different and have clearly different jobs.
- Never run the display face below heading size. A striking headline font in a table row reads as a mistake.
- **Do not use Inter or Plus Jakarta Sans.** Both are fonts Claude reaches for by default, so both make the page read as unchosen.
- Load one variable font file through `next/font`, not several weight files.
- Set a deliberate fallback stack. This page cannot afford to fall back to Arial.
- Line length under 80 characters. Serif body text gets slightly more line height than sans.

## Colour

- Near-monochrome, with exactly one accent colour that has exactly one job.
- The accent only ever appears where it means something (a task past its date, today's single headline number). Never as decoration.
- Define the accent in `oklch()`, not hex. Tailwind 4 stores colour that way already, so a dark variant is made by moving lightness alone and leaving hue and chroma untouched.
- Override or delete Tailwind's default palette. If `bg-indigo-500` is still reachable, a generated component will eventually reach for it.

## Structure and motion

- Borders, dividers and numbering must encode information about the content, not tidy the page. A border colour that changes with task status earns its place. A rule drawn because a section felt bare does not.
- Anything a visitor touches often (filters, tabs, task rows) feels instant. Motion is saved for rare, meaningful moments.
- **Never animate a chart on page load.** The viewer has no earlier value to compare against, so the movement is pure decoration. Animate on a real change only.
- Scroll reveals on marketing pages: native CSS scroll-driven animation, no library.
- In-app motion: `motion` (formerly Framer Motion). Widest real-world usage, so an assistant breaks it least.
- Respect `prefers-reduced-motion` everywhere. Note that Recharts only honours it while its animation prop is left alone; setting it explicitly to true silently disables that.

## Charts

Tufte, not dashboard trend articles. No gridlines, no boxes, no legends. Label each thing next to itself rather than in a key. Grey is the main colour; the accent appears only on what matters today. Prefer small charts inline beside a number over each chart in its own box. Right-align figures with `tabular-nums`.

## The board page and privacy

The board reads five files from the private `ClaudeOS` repo: `ACTIVE.md`, `consulting/pipeline.md`, `memory/decisions-log.md`, `SOCIAL.md`, `CHANGELOG.md`. **These contain client names, Ross's financial position, personal family matters, and the current state of the sales pipeline.**

Any public view of the board is generated from an explicit per-row publish flag in the source file. Never from a second copy of the data, which would drift and eventually leak. Publish the structure, withhold the contents. When in doubt, a row is private.

## Verification

No tool judges whether a design looks good. Playwright checks that a page works. Visual judgement is a manual step: build it, screenshot it, look at it, and check it against the five looks above before calling it done.

## Formatting

No em dash (U+2014) anywhere, including code comments and commit messages. Main headings and page titles do not end in a full stop. British English.
