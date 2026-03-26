export type QuestionType = "scored" | "single" | "multi" | "text";

export interface Option {
  label: string;
  value: string;
  score?: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: Option[];
  placeholder?: string;
}

export const scoredQuestions: Question[] = [
  {
    id: "q1",
    type: "scored",
    text: "Have you identified specific tasks in your business that are repetitive and time-consuming?",
    options: [
      { label: "Yes, we have a clear list", value: "yes", score: 10 },
      { label: "Somewhat – we know some but haven't mapped them", value: "some", score: 5 },
      { label: "No, we haven't really looked", value: "no", score: 0 },
    ],
  },
  {
    id: "q2",
    type: "scored",
    text: "Does your team currently use any AI tools (e.g. ChatGPT, Copilot, automation tools) in their daily work?",
    options: [
      { label: "Yes, regularly", value: "yes", score: 10 },
      { label: "Occasionally, for personal use", value: "some", score: 5 },
      { label: "No", value: "no", score: 0 },
    ],
  },
  {
    id: "q3",
    type: "scored",
    text: "Do you have documented processes for your core operations (sales, marketing, fulfilment, customer service)?",
    options: [
      { label: "Yes, mostly documented", value: "yes", score: 10 },
      { label: "Partially – some are, some aren't", value: "some", score: 5 },
      { label: "No, it's mostly in people's heads", value: "no", score: 0 },
    ],
  },
  {
    id: "q4",
    type: "scored",
    text: "Is your business data organised and accessible (e.g. CRM, spreadsheets, databases) rather than scattered across emails and drives?",
    options: [
      { label: "Yes, centralised and accessible", value: "yes", score: 10 },
      { label: "Partially organised", value: "some", score: 5 },
      { label: "No, it's all over the place", value: "no", score: 0 },
    ],
  },
  {
    id: "q5",
    type: "scored",
    text: "Have you set a budget or allocated any resource specifically for AI adoption this year?",
    options: [
      { label: "Yes", value: "yes", score: 10 },
      { label: "We've discussed it but nothing committed", value: "some", score: 5 },
      { label: "No", value: "no", score: 0 },
    ],
  },
  {
    id: "q6",
    type: "scored",
    text: "Does your leadership team have a shared understanding of what AI can and can't do for your business?",
    options: [
      { label: "Yes, we've discussed it meaningfully", value: "yes", score: 10 },
      { label: "Somewhat – mixed understanding", value: "some", score: 5 },
      { label: "Not really – lots of opinions, no clarity", value: "no", score: 0 },
    ],
  },
  {
    id: "q7",
    type: "scored",
    text: "Are your team members open to changing how they work, or is there resistance to new tools and processes?",
    options: [
      { label: "Generally open and curious", value: "yes", score: 10 },
      { label: "Mixed – some keen, some resistant", value: "some", score: 5 },
      { label: "Significant resistance or fear", value: "no", score: 0 },
    ],
  },
  {
    id: "q8",
    type: "scored",
    text: "Do you currently measure the time and cost of key processes (e.g. how long onboarding takes, cost per customer acquired)?",
    options: [
      { label: "Yes, we track this", value: "yes", score: 10 },
      { label: "We track some things", value: "some", score: 5 },
      { label: "No, we don't really measure it", value: "no", score: 0 },
    ],
  },
  {
    id: "q9",
    type: "scored",
    text: "Have you experimented with automating any part of your business (even simple things like email sequences or scheduling)?",
    options: [
      { label: "Yes, we use some automation", value: "yes", score: 10 },
      { label: "We've tried a couple of things", value: "some", score: 5 },
      { label: "No, most things are manual", value: "no", score: 0 },
    ],
  },
  {
    id: "q10",
    type: "scored",
    text: "Do you have someone in the business (or externally) who stays across AI developments and flags what's relevant?",
    options: [
      { label: "Yes", value: "yes", score: 10 },
      { label: "Informally – someone keeps half an eye on it", value: "some", score: 5 },
      { label: "No – we're all too busy", value: "no", score: 0 },
    ],
  },
];

export const profileQuestions: Question[] = [
  {
    id: "q11",
    type: "single",
    text: "Which best describes your business right now?",
    options: [
      { label: "It's just me (solopreneur)", value: "solo" },
      { label: "Small team (2–10 people)", value: "small" },
      { label: "Growing business (11–50 people)", value: "growing" },
      { label: "Established business (51–200 people)", value: "established" },
      { label: "Larger organisation (200+)", value: "large" },
    ],
  },
  {
    id: "q12",
    type: "single",
    text: "Which best describes the outcome you're looking for from AI?",
    options: [
      { label: "Save time on repetitive tasks so I can focus on growth", value: "time" },
      { label: "Reduce costs and improve margins", value: "costs" },
      { label: "Scale without hiring proportionally more people", value: "scale" },
      { label: "Improve customer experience and responsiveness", value: "cx" },
      { label: "Get a competitive edge before my industry catches up", value: "competitive" },
      { label: "I'm not sure yet – I just know I need to do something", value: "unsure" },
    ],
  },
  {
    id: "q13",
    type: "multi",
    text: "What's held you back from making progress with AI so far? (Select all that apply)",
    options: [
      { label: "Don't know where to start", value: "start" },
      { label: "Tried tools but couldn't get them to work properly", value: "tried" },
      { label: "No one on the team has the skills", value: "skills" },
      { label: "Concerned about cost", value: "cost" },
      { label: "Worried about data security or privacy", value: "security" },
      { label: "Too busy running the business to stop and figure it out", value: "busy" },
      { label: "Overwhelmed by the options – too many tools, too much noise", value: "overwhelmed" },
      { label: "Tried working with a consultant/agency but it didn't deliver", value: "consultant" },
      { label: "Leadership isn't aligned on whether this is a priority", value: "alignment" },
    ],
  },
  {
    id: "q14",
    type: "single",
    text: "Which type of support would best suit your needs?",
    options: [
      { label: "A done-for-you implementation (someone builds it for us)", value: "done-for-you" },
      { label: "A guided approach (someone shows us and we implement together)", value: "guided" },
      { label: "Training and upskilling (teach our team to do it ourselves)", value: "training" },
      { label: "A strategic audit first (tell us what to prioritise before we do anything)", value: "audit" },
      { label: "Just a conversation to figure out what's possible", value: "conversation" },
    ],
  },
  {
    id: "q15",
    type: "text",
    text: "Is there anything else you'd like us to know?",
    placeholder: "Optional – anything about your business, challenges, or goals",
  },
];

export const allQuestions: Question[] = [...scoredQuestions, ...profileQuestions];
