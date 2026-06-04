"use server";

import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";

export async function sendImportSuccessEmail(count: number): Promise<void> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return;
  const plural = count !== 1;
  await sendEmail({
    to: email,
    subject: `Budgify — ${count} transaction${plural ? "s" : ""} imported`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1c1a18;">Import Complete</h2>
        <p>Your CSV import was successful.</p>
        <p><strong>${count}</strong> transaction${plural ? "s were" : " was"} added to Budgify.</p>
        <p style="color: #888; font-size: 12px;">If you did not initiate this import, please review your account.</p>
      </div>
    `,
  });
}

export async function sendImportFailureEmail(errorMessage: string): Promise<void> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "Budgify — CSV import failed",
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c0392b;">Import Failed</h2>
        <p>Your CSV import could not be completed.</p>
        <p><strong>Error:</strong> ${errorMessage}</p>
        <p>Please try re-uploading your CSV or contact support if the issue persists.</p>
      </div>
    `,
  });
}
