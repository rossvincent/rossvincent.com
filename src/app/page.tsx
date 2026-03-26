import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-20">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight max-w-2xl">
          AI that actually works for your business
        </h1>
        <p className="mt-6 text-lg text-muted max-w-xl leading-relaxed">
          Most small businesses know they should be doing something with AI –
          but they&apos;re overwhelmed by the noise, unsure where to start, and
          worried about wasting money on the wrong tools.
        </p>
        <p className="mt-4 text-lg text-muted max-w-xl leading-relaxed">
          I cut through that. I help you find where AI fits, build it, and make
          it work.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/scorecard"
            className="bg-accent text-background px-6 py-3 rounded-md text-sm font-medium hover:bg-accent-hover transition-colors text-center"
          >
            Take the free AI Readiness Assessment
          </Link>
          <a
            href="#services"
            className="border border-border px-6 py-3 rounded-md text-sm font-medium hover:bg-surface transition-colors text-center"
          >
            See how I can help
          </a>
        </div>
      </section>

      {/* The problem */}
      <section className="bg-surface border-y border-border">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <p className="text-sm font-medium text-muted uppercase tracking-wide mb-4">
            The reality
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-2xl">
            72% of businesses are using AI. Fewer than 20% have captured
            meaningful value.
          </h2>
          <p className="mt-4 text-muted text-sm">
            McKinsey Global AI Survey, 2024
          </p>
          <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
            The gap isn&apos;t technology. It&apos;s knowing where to start,
            what to prioritise, and how to implement without burning through
            budget on tools that don&apos;t fit.
          </p>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-sm font-medium text-muted uppercase tracking-wide mb-4">
          How I help
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-12">
          Practical AI for businesses under &pound;5M revenue
        </h2>

        <div className="grid sm:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-foreground/5 rounded-md flex items-center justify-center text-lg">
              1
            </div>
            <h3 className="font-semibold text-lg">AI Readiness Audit</h3>
            <p className="text-muted text-sm leading-relaxed">
              I look at your operations, tools, and team – and tell you exactly
              where AI would save you time, money, and headcount pressure. No
              jargon, no fluff.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-10 h-10 bg-foreground/5 rounded-md flex items-center justify-center text-lg">
              2
            </div>
            <h3 className="font-semibold text-lg">Done-For-You Automation</h3>
            <p className="text-muted text-sm leading-relaxed">
              I build and manage AI-powered automations for your business –
              reminders, customer comms, scheduling, data entry. You pay a flat
              monthly fee. I handle everything.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-10 h-10 bg-foreground/5 rounded-md flex items-center justify-center text-lg">
              3
            </div>
            <h3 className="font-semibold text-lg">
              Implementation &amp; Training
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              For larger teams: I design the AI strategy, implement the tools,
              train your people, and hand over a system that runs without me.
            </p>
          </div>
        </div>
      </section>

      {/* About / credibility */}
      <section className="bg-surface border-y border-border">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <p className="text-sm font-medium text-muted uppercase tracking-wide mb-4">
            About
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">
            I build things that work
          </h2>
          <div className="max-w-xl space-y-4 text-muted leading-relaxed">
            <p>
              I&apos;m Ross Vincent. I&apos;ve spent 15+ years building and
              scaling direct-to-consumer brands – growth marketing, operational
              automation, financial modelling, and team building.
            </p>
            <p>
              Now I help small business owners cut through the AI noise and get
              practical results. Not strategy decks – working tools. I build AI
              systems, automations, and workflows that save real time and money.
            </p>
            <p>
              Based in East Sussex, UK. Working with businesses across the UK and
              New Zealand.
            </p>
          </div>
          <a
            href="mailto:ross@rossvincent.com?subject=AI%20Consulting%20Enquiry"
            className="mt-6 inline-block text-sm font-medium underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Get in touch &rarr;
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
            Not sure where AI fits in your business?
          </h2>
          <p className="text-muted leading-relaxed mb-8">
            Take the free AI Readiness Assessment. 15 questions, less than 3
            minutes. You&apos;ll get a personalised score and action plan
            immediately.
          </p>
          <Link
            href="/scorecard"
            className="bg-accent text-background px-6 py-3 rounded-md text-sm font-medium hover:bg-accent-hover transition-colors inline-block"
          >
            Get my free AI Readiness Score
          </Link>
        </div>
      </section>
    </div>
  );
}
