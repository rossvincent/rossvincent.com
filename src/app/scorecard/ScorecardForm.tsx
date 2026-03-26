"use client";

import { useState } from "react";
import { allQuestions, scoredQuestions, Question } from "./questions";
import {
  getBand,
  getBandLabel,
  getBandDescription,
  getInsights,
  getIntro,
} from "./results";

type Answers = Record<string, string | string[]>;

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full bg-border rounded-full h-1.5">
      <div
        className="bg-foreground h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function QuestionCard({
  question,
  answer,
  onAnswer,
}: {
  question: Question;
  answer: string | string[] | undefined;
  onAnswer: (value: string | string[]) => void;
}) {
  if (question.type === "text") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug">
          {question.text}
        </h2>
        <textarea
          className="w-full border border-border rounded-md px-4 py-3 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
          rows={4}
          placeholder={question.placeholder}
          value={(answer as string) || ""}
          onChange={(e) => onAnswer(e.target.value)}
        />
      </div>
    );
  }

  if (question.type === "multi") {
    const selected = (answer as string[]) || [];
    return (
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug">
          {question.text}
        </h2>
        <div className="space-y-2">
          {question.options!.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onAnswer(selected.filter((v) => v !== opt.value));
                  } else {
                    onAnswer([...selected, opt.value]);
                  }
                }}
                className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-colors ${
                  isSelected
                    ? "border-foreground bg-foreground/5 font-medium"
                    : "border-border hover:border-foreground/30"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // scored or single
  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug">
        {question.text}
      </h2>
      <div className="space-y-2">
        {question.options!.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onAnswer(opt.value)}
            className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-colors ${
              answer === opt.value
                ? "border-foreground bg-foreground/5 font-medium"
                : "border-border hover:border-foreground/30"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const band = getBand(score);
  const colorClass =
    band === "red"
      ? "text-score-red"
      : band === "amber"
        ? "text-score-amber"
        : "text-score-green";
  const bgClass =
    band === "red"
      ? "bg-score-red"
      : band === "amber"
        ? "bg-score-amber"
        : "bg-score-green";

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`w-32 h-32 rounded-full border-8 flex items-center justify-center ${
          band === "red"
            ? "border-score-red"
            : band === "amber"
              ? "border-score-amber"
              : "border-score-green"
        }`}
      >
        <span className={`text-4xl font-bold ${colorClass}`}>{score}%</span>
      </div>
      <div className="text-center">
        <span
          className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${bgClass}`}
        >
          {getBandLabel(band)}
        </span>
        <p className="mt-2 text-muted text-sm">{getBandDescription(band)}</p>
      </div>
    </div>
  );
}

function EmailCapture({
  onSubmit,
  submitting,
}: {
  onSubmit: (details: {
    name: string;
    email: string;
    businessName: string;
  }) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");

  const canSubmit = name.trim() && email.trim() && email.includes("@");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug">
          Almost there – where should we send your results?
        </h2>
        <p className="mt-2 text-muted text-sm leading-relaxed">
          Your personalised AI Readiness Score and action plan will appear on the
          next screen. We&apos;ll also email you a copy.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-1.5"
          >
            Your name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-border rounded-md px-4 py-3 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="Jane Smith"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-md px-4 py-3 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="jane@company.com"
          />
        </div>

        <div>
          <label
            htmlFor="businessName"
            className="block text-sm font-medium mb-1.5"
          >
            Business name{" "}
            <span className="text-muted font-normal">(optional)</span>
          </label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full border border-border rounded-md px-4 py-3 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="Acme Ltd"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={() => onSubmit({ name, email, businessName })}
        className={`w-full px-5 py-3 rounded-md text-sm font-medium transition-colors ${
          canSubmit && !submitting
            ? "bg-accent text-background hover:bg-accent-hover"
            : "bg-border text-muted cursor-not-allowed"
        }`}
      >
        {submitting ? "Loading your results..." : "See my AI Readiness Score"}
      </button>

      <p className="text-xs text-muted text-center">
        No spam. Your data stays between us.
      </p>
    </div>
  );
}

function Results({
  answers,
  contactName,
}: {
  answers: Answers;
  contactName: string;
}) {
  const score = scoredQuestions.reduce((total, q) => {
    const selected = answers[q.id] as string;
    const option = q.options?.find((o) => o.value === selected);
    return total + (option?.score || 0);
  }, 0);

  const band = getBand(score);
  const insights = getInsights(band);
  const businessSize = answers.q11 as string | undefined;
  const intro = getIntro(band, businessSize);
  const firstName = contactName.split(" ")[0];

  return (
    <div className="space-y-12">
      <div className="text-center">
        <p className="text-sm font-medium text-muted uppercase tracking-wide mb-6">
          {firstName}&apos;s AI Readiness Score
        </p>
        <ScoreGauge score={score} />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">What this means</h3>
        {insights.map((insight, i) => (
          <p key={i} className="text-muted leading-relaxed text-sm">
            {insight}
          </p>
        ))}
      </div>

      <div className="border-t border-border pt-8 space-y-4">
        <p className="text-muted leading-relaxed">{intro}</p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <a
            href="mailto:ross@rossvincent.com?subject=AI%20Readiness%20–%20Let's%20talk"
            className="bg-accent text-background px-6 py-3 rounded-md text-sm font-medium hover:bg-accent-hover transition-colors text-center"
          >
            Book a free 30-minute call
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ScorecardForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contactName, setContactName] = useState("");

  const totalQuestions = allQuestions.length;
  const currentQuestion = allQuestions[step];

  function handleAnswer(value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));

    // Auto-advance for single-select and scored questions
    if (
      currentQuestion.type === "scored" ||
      currentQuestion.type === "single"
    ) {
      if (step < totalQuestions - 1) {
        setTimeout(() => setStep((s) => s + 1), 200);
      }
    }
  }

  function handleNext() {
    if (step < totalQuestions - 1) {
      setStep((s) => s + 1);
    } else {
      setShowEmailCapture(true);
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function handleEmailSubmit(details: {
    name: string;
    email: string;
    businessName: string;
  }) {
    setSubmitting(true);
    setContactName(details.name);

    const score = scoredQuestions.reduce((total, q) => {
      const selected = answers[q.id] as string;
      const option = q.options?.find((o) => o.value === selected);
      return total + (option?.score || 0);
    }, 0);

    try {
      await fetch("/api/scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...details,
          score,
          band: getBand(score),
          businessSize: answers.q11,
          answers,
        }),
      });
    } catch {
      // Don't block results if submission fails
    }

    setSubmitting(false);
    setShowResults(true);
  }

  const canProceed =
    currentQuestion?.type === "text" ||
    currentQuestion?.type === "multi" ||
    answers[currentQuestion?.id] !== undefined;

  if (showResults) {
    return <Results answers={answers} contactName={contactName} />;
  }

  if (showEmailCapture) {
    return (
      <EmailCapture onSubmit={handleEmailSubmit} submitting={submitting} />
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted">
          <span>
            Question {step + 1} of {totalQuestions}
          </span>
          <span>{Math.round(((step + 1) / totalQuestions) * 100)}%</span>
        </div>
        <ProgressBar current={step + 1} total={totalQuestions} />
      </div>

      <QuestionCard
        question={currentQuestion}
        answer={answers[currentQuestion.id]}
        onAnswer={handleAnswer}
      />

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 0}
          className="text-sm text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>

        {(currentQuestion.type === "multi" ||
          currentQuestion.type === "text") && (
          <button
            type="button"
            onClick={handleNext}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              canProceed
                ? "bg-accent text-background hover:bg-accent-hover"
                : "bg-border text-muted cursor-not-allowed"
            }`}
          >
            {step === totalQuestions - 1 ? "See my results" : "Next"}
          </button>
        )}

        {currentQuestion.type !== "multi" &&
          currentQuestion.type !== "text" &&
          step === totalQuestions - 1 &&
          canProceed && (
            <button
              type="button"
              onClick={handleNext}
              className="bg-accent text-background px-5 py-2 rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              See my results
            </button>
          )}
      </div>
    </div>
  );
}
