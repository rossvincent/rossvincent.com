export type Band = "red" | "amber" | "green";

export function getBand(score: number): Band {
  if (score <= 40) return "red";
  if (score <= 70) return "amber";
  return "green";
}

export function getBandLabel(band: Band): string {
  switch (band) {
    case "red":
      return "Not AI-Ready";
    case "amber":
      return "Getting There";
    case "green":
      return "AI-Ready";
  }
}

export function getBandDescription(band: Band): string {
  switch (band) {
    case "red":
      return "Significant gaps to address before AI can deliver meaningful results.";
    case "amber":
      return "Foundations exist but key gaps remain. You're closer than you think.";
    case "green":
      return "Well positioned to implement AI and see real results.";
  }
}

export function getInsights(band: Band): string[] {
  switch (band) {
    case "red":
      return [
        "Your business is doing what most are doing – talking about AI without the foundations in place. The good news: the foundations aren't complex, they just need to be put in place deliberately.",
        "The biggest risk right now isn't falling behind on AI – it's wasting money on AI tools before your processes and data are ready for them.",
        "A short, focused diagnostic of your operations would likely reveal 2–3 quick wins that could save significant time within weeks.",
      ];
    case "amber":
      return [
        "You've got some foundations in place, which puts you ahead of most businesses your size. The gaps that remain are likely specific and fixable.",
        "The danger zone for businesses at your stage is \"tool sprawl\" – adopting AI tools without a clear plan for how they connect to each other and to your processes.",
        "A prioritised implementation plan – what to do first, second, third – would likely unlock more value than any single tool.",
      ];
    case "green":
      return [
        "You're in a strong position. Your foundations are solid and your team is engaged. The question now is: where do you go next for maximum leverage?",
        "Businesses at your stage typically benefit most from custom AI workflows built specifically for their operations – not off-the-shelf tools.",
        "The competitive advantage window is narrowing. The sooner you move from \"ready\" to \"implemented\", the harder it becomes for competitors to catch up.",
      ];
  }
}

export function getIntro(
  band: Band,
  businessSize: string | undefined
): string {
  const isQualified =
    (band === "amber" || band === "green") &&
    businessSize &&
    !["solo", "small"].includes(businessSize);

  if (isQualified) {
    return "I'm Ross. I help businesses like yours cut through the AI noise and implement what actually works. I've seen your results and I think a conversation would be genuinely valuable – not a sales pitch, just a clear-eyed look at where AI could move the needle for you.";
  }

  return "I'm Ross. Thanks for taking the assessment – knowing where you stand is the first step. I've put together some resources below that'll help you start building the foundations. When you're ready for hands-on help, I'm here.";
}
