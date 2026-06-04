import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";

export const sesClient = new SESClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

// On local, sender is a full address (e.g. amanbrarpro@gmail.com).
// On deployed stages, sender is a bare domain (e.g. amanbrar.pro).
export const FROM_ADDRESS = Resource.EmailIdentity.sender.includes("@")
  ? Resource.EmailIdentity.sender
  : `no-reply@${Resource.EmailIdentity.sender}`;

export async function sendEmail({
  to,
  subject,
  htmlBody,
}: {
  to: string;
  subject: string;
  htmlBody: string;
}): Promise<void> {
  await sesClient.send(
    new SendEmailCommand({
      Source: FROM_ADDRESS,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: htmlBody, Charset: "UTF-8" } },
      },
    }),
  );
}
