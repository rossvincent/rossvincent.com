import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="bg-surface border-b border-border">
        <div className="mx-auto max-w-[1120px] px-[clamp(1.25rem,4vw,3rem)] py-[clamp(3rem,8vw,5.5rem)] grid grid-cols-1 md:grid-cols-[1fr_0.42fr] gap-[clamp(2rem,5vw,4rem)] items-center">
          <div>
            <div className="text-[0.78rem] font-semibold tracking-[0.08em] uppercase text-accent mb-4">
              AI consulting for small businesses
            </div>
            <h1 className="font-serif font-normal text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.12] text-ink tracking-[-0.015em] mb-5">
              I help business owners build AI systems that work
            </h1>
            <p className="text-[1.05rem] text-body max-w-[520px] mb-3 leading-[1.7]">
              Most small businesses know they should be doing something with AI –
              but they&apos;re overwhelmed by the noise, unsure where to start, and
              worried about wasting money on the wrong tools.
            </p>
            <p className="text-[1.05rem] text-body max-w-[520px] leading-[1.7]">
              I cut through that. I find where AI fits, build it, and make it
              stick.
            </p>
            <div className="flex flex-wrap gap-3.5 mt-7">
              <Link
                href="/scorecard"
                className="inline-flex items-center gap-2 text-[0.9rem] font-medium text-white bg-ink px-6 py-3 rounded-md no-underline border border-ink hover:bg-[#333] transition-all"
              >
                Take the free AI Assessment
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
              <a
                href="#services"
                className="inline-flex items-center gap-2 text-[0.9rem] font-medium text-ink bg-white px-6 py-3 rounded-md no-underline border border-border hover:bg-surface transition-all"
              >
                See how I can help
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-4 md:order-none order-first max-w-[280px] md:max-w-none">
            <div className="w-full aspect-[3/3.5] md:aspect-[3/3.5] aspect-square bg-warm-bg rounded-[10px] border border-border flex items-center justify-center overflow-hidden">
              <div className="text-muted text-[0.8rem] text-center px-4 leading-relaxed">
                <svg
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-16 h-16 opacity-25 mx-auto"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="32" cy="24" r="12" />
                  <path d="M10 56c0-12.15 9.85-22 22-22s22 9.85 22 22" />
                </svg>
                <div className="mt-2">
                  Your headshot here
                  <br />
                  <span className="text-[0.7rem] opacity-70">
                    Professional, approachable, natural light
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[0.8rem] text-muted">
              <span className="w-[7px] h-[7px] bg-[#5cb176] rounded-full shrink-0" />
              Based in East Sussex, UK · Working with businesses across the UK &amp;
              NZ
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <div className="bg-white border-b border-border py-8 px-[clamp(1.25rem,4vw,3rem)]">
        <div className="mx-auto max-w-[1120px] flex items-center justify-center gap-[clamp(2rem,5vw,4rem)] flex-wrap">
          <div className="text-center">
            <div className="font-serif text-[1.75rem] text-ink leading-[1.2]">
              15+
            </div>
            <div className="text-[0.78rem] text-muted mt-1">
              Years building businesses
            </div>
          </div>
          <div className="w-px h-10 bg-border max-md:w-[60px] max-md:h-px" />
          <div className="text-center">
            <div className="font-serif text-[1.75rem] text-ink leading-[1.2]">
              Founder
            </div>
            <div className="text-[0.78rem] text-muted mt-1">
              Not just a consultant
            </div>
          </div>
          <div className="w-px h-10 bg-border max-md:w-[60px] max-md:h-px" />
          <div className="text-center">
            <div className="font-serif text-[1.75rem] text-ink leading-[1.2]">
              UK &amp; NZ
            </div>
            <div className="text-[0.78rem] text-muted mt-1">
              Working across two markets
            </div>
          </div>
        </div>
      </div>

      {/* THE REALITY */}
      <section className="py-[clamp(3rem,6vw,5rem)] px-[clamp(1.25rem,4vw,3rem)] mx-auto max-w-[1120px]">
        <div className="grid grid-cols-1 md:grid-cols-[0.45fr_1fr] gap-[clamp(2rem,4vw,4rem)] items-start">
          <div>
            <div className="text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-accent mb-4">
              The reality
            </div>
            <div className="font-serif text-[clamp(2rem,4vw,2.8rem)] leading-[1.15] text-ink">
              72% of businesses are using AI. Fewer than{" "}
              <em className="text-accent italic">20%</em> have captured meaningful
              value.
            </div>
            <div className="text-[0.78rem] text-muted mt-3">
              McKinsey Global AI Survey, 2024
            </div>
          </div>
          <div className="md:pt-9">
            <p className="text-[1.05rem] text-body max-w-[520px] leading-[1.7]">
              The gap isn&apos;t technology. It&apos;s knowing where to start, what
              to prioritise, and how to implement without burning through budget on
              tools that don&apos;t fit.
            </p>
            <p className="text-[1.05rem] text-body max-w-[520px] leading-[1.7] mt-3">
              That&apos;s where I come in. I&apos;ve spent 15 years in the trenches
              of small business operations – growth marketing, automation, financial
              modelling – and now I apply that experience to AI implementation that
              actually sticks.
            </p>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section
        id="services"
        className="bg-surface border-y border-border py-[clamp(3rem,6vw,5rem)] px-[clamp(1.25rem,4vw,3rem)]"
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-[clamp(2rem,4vw,3rem)]">
            <div className="text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-accent">
              How I help
            </div>
            <h2 className="font-serif text-[clamp(1.8rem,3.5vw,2.4rem)] text-ink mt-3 leading-[1.2]">
              Practical AI for small businesses
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="bg-white border border-border rounded-[10px] p-[clamp(1.5rem,3vw,2rem)] hover:border-[#c9c7c2] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
              <div className="w-11 h-11 bg-accent-soft rounded-lg flex items-center justify-center mb-5">
                <svg
                  viewBox="0 0 24 24"
                  className="w-[22px] h-[22px] stroke-accent fill-none"
                  strokeWidth="1.75"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <div className="text-[0.7rem] font-semibold tracking-[0.08em] uppercase text-muted mb-2">
                Step 1
              </div>
              <h3 className="font-serif text-[1.35rem] text-ink mb-3 leading-[1.25]">
                AI Readiness Audit
              </h3>
              <p className="text-[0.9rem] text-body leading-[1.65]">
                I look at your operations, tools, and team – and tell you honestly
                where AI would save you time and money. No jargon, no fluff. You
                get a clear, prioritised roadmap.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-border rounded-[10px] p-[clamp(1.5rem,3vw,2rem)] hover:border-[#c9c7c2] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
              <div className="w-11 h-11 bg-accent-soft rounded-lg flex items-center justify-center mb-5">
                <svg
                  viewBox="0 0 24 24"
                  className="w-[22px] h-[22px] stroke-accent fill-none"
                  strokeWidth="1.75"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="text-[0.7rem] font-semibold tracking-[0.08em] uppercase text-muted mb-2">
                Step 2
              </div>
              <h3 className="font-serif text-[1.35rem] text-ink mb-3 leading-[1.25]">
                Done-For-You Automation
              </h3>
              <p className="text-[0.9rem] text-body leading-[1.65]">
                I build and manage AI-powered automations for your business –
                reminders, customer comms, scheduling, data entry. You pay a flat
                monthly fee. I handle everything.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-border rounded-[10px] p-[clamp(1.5rem,3vw,2rem)] hover:border-[#c9c7c2] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
              <div className="w-11 h-11 bg-accent-soft rounded-lg flex items-center justify-center mb-5">
                <svg
                  viewBox="0 0 24 24"
                  className="w-[22px] h-[22px] stroke-accent fill-none"
                  strokeWidth="1.75"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className="text-[0.7rem] font-semibold tracking-[0.08em] uppercase text-muted mb-2">
                Step 3
              </div>
              <h3 className="font-serif text-[1.35rem] text-ink mb-3 leading-[1.25]">
                Implementation &amp; Training
              </h3>
              <p className="text-[0.9rem] text-body leading-[1.65]">
                For larger teams: I design the AI strategy, implement the tools,
                train your people, and hand over a system that runs without me.
                Full documentation included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="bg-white border-t border-border py-[clamp(3rem,6vw,5rem)] px-[clamp(1.25rem,4vw,3rem)]"
      >
        <div className="mx-auto max-w-[1120px]">
          <div>
            <div className="text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-accent">
              About
            </div>
            <h2 className="font-serif text-[clamp(1.8rem,3.5vw,2.4rem)] text-ink mt-3 mb-5 leading-[1.2]">
              I build things that work
            </h2>
            <p className="text-[1rem] text-body max-w-[540px] mb-4 leading-[1.7]">
              I&apos;m Ross Vincent. I&apos;ve spent 15+ years building and
              scaling direct-to-consumer brands – growth marketing, operational
              automation, financial modelling, and team building.
            </p>
            <p className="text-[1rem] text-body max-w-[540px] mb-4 leading-[1.7]">
              Now I help small business owners cut through the AI noise and get
              practical results. Not theory – working tools and systems. I build
              AI that saves real time and money.
            </p>
            <div className="flex flex-wrap gap-8 mt-6 pt-6 border-t border-border">
              <div className="flex items-start gap-2">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 stroke-accent fill-none shrink-0 mt-0.5"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-[0.85rem] text-muted">
                  East Sussex, UK
                </span>
              </div>
              <div className="flex items-start gap-2">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 stroke-accent fill-none shrink-0 mt-0.5"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
                <span className="text-[0.85rem] text-muted">
                  UK &amp; New Zealand
                </span>
              </div>
              <div className="flex items-start gap-2">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 stroke-accent fill-none shrink-0 mt-0.5"
                  strokeWidth="2"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="text-[0.85rem] text-muted">
                  ross@rossvincent.com
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="bg-ink py-[clamp(3rem,6vw,4.5rem)] px-[clamp(1.25rem,4vw,3rem)] text-center">
        <div className="max-w-[560px] mx-auto">
          <h2 className="font-serif text-[clamp(1.6rem,3.5vw,2.2rem)] text-white mb-3 leading-[1.2]">
            Not sure where AI fits in your business?
          </h2>
          <p className="text-[0.95rem] text-white/65 mb-7 leading-[1.65]">
            Take the free AI Readiness Assessment. 15 questions, less than 3
            minutes. You&apos;ll get a personalised score and action plan
            immediately.
          </p>
          <Link
            href="/scorecard"
            className="inline-flex items-center gap-2 text-[0.9rem] font-medium text-ink bg-white px-7 py-3.5 rounded-md no-underline hover:bg-surface transition-all"
          >
            Take the free AI Assessment
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
