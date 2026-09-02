import { NextResponse } from "next/server";
import { Resend } from "resend";
import { allQuestions } from "../../(marketing)/scorecard/questions";

function formatAnswers(answers: Record<string, string | string[]>): string {
  return allQuestions
    .map((q) => {
      const answer = answers[q.id];
      if (answer === undefined || answer === "") return "";

      let displayAnswer: string;
      if (Array.isArray(answer)) {
        // Multi-select: map values back to labels
        displayAnswer = answer
          .map((v) => q.options?.find((o) => o.value === v)?.label ?? v)
          .join(", ");
      } else if (q.type === "text") {
        displayAnswer = answer;
      } else {
        // Single/scored: map value back to label
        displayAnswer =
          q.options?.find((o) => o.value === answer)?.label ?? answer;
      }

      return `
        <tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;font-weight:bold;color:#555;white-space:nowrap;">${q.id.toUpperCase()}</td>
          <td style="padding:8px 12px 8px 0;vertical-align:top;">${q.text}</td>
          <td style="padding:8px 0;vertical-align:top;">${displayAnswer}</td>
        </tr>`;
    })
    .filter(Boolean)
    .join("");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, businessName, score, band, businessSize, answers } =
      body;

    // Send notification to Ross
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "AI Scorecard <onboarding@resend.dev>",
        to: "ross@rossvincent.com",
        subject: `New AI Readiness Submission – ${name} (${score}%)`,
        html: `
          <h2>New Scorecard Submission</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;">
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name</td><td>${name}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Business</td><td>${businessName || "Not provided"}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Score</td><td>${score}% (${band})</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Business Size</td><td>${businessSize || "Not provided"}</td></tr>
          </table>
          <h3 style="margin-top:24px;">Answers</h3>
          <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
            <tr style="border-bottom:2px solid #ddd;">
              <th style="padding:8px 12px 8px 0;text-align:left;">#</th>
              <th style="padding:8px 12px 8px 0;text-align:left;">Question</th>
              <th style="padding:8px 0;text-align:left;">Answer</th>
            </tr>
            ${formatAnswers(answers)}
          </table>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Scorecard submission error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
