import { NextResponse } from "next/server";
import { Resend } from "resend";

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
          <pre style="font-size:13px;background:#f5f5f5;padding:12px;border-radius:4px;">${JSON.stringify(answers, null, 2)}</pre>
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
