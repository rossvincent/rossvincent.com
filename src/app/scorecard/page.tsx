import ScorecardForm from "./ScorecardForm";

export const metadata = {
  title: "AI Readiness Assessment – Ross Vincent",
  description:
    "Answer 15 questions to discover your AI Readiness Score and get a personalised action plan for your business.",
};

export default function ScorecardPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
          How ready is your business for AI?
        </h1>
        <p className="mt-4 text-muted leading-relaxed">
          Answer 15 questions to get your AI Readiness Score and a personalised
          action plan. Takes less than 3 minutes.
        </p>
      </div>

      <ScorecardForm />
    </div>
  );
}
