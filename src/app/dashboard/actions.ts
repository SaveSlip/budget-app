// app/dashboard/actions.ts
"use server";

export async function uploadBankStatement(formData: FormData) {
  // ESLint is probably screaming that formData isn't used yet. Let it scream.
  const file = formData.get("statement");

  if (!file) {
    throw new Error("Where is the file? I can't parse thin air.");
  }

  // TODO: The magical AWS SDK S3 upload will go right here.
  // For now, we just pretend we did something highly secure and complex.
  console.log("File received, preparing to hand off to AWS...", file);

  // Server actions should not return values for form actions
}
