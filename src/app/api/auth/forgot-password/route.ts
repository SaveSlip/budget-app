import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";
import { z } from "zod";
import crypto from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const sesClient = new SESClient({});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Check if user exists
    const { Item: user } = await docClient.send(
      new GetCommand({
        TableName: Resource.UsersTable.name,
        Key: {
          pk: `USER#${email}`,
          sk: `PROFILE#${email}`,
        },
      }),
    );

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    console.log("Generated reset token:", resetToken);
    console.log("Token expires at:", expiresAt);

    // Store reset token in database
    await docClient.send(
      new PutCommand({
        TableName: Resource.UsersTable.name,
        Item: {
          pk: `RESET#${resetToken}`,
          sk: `RESET#${resetToken}`,
          email,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
        },
      }),
    );

    console.log("Token stored in DB with key:", `RESET#${resetToken}`);

    // Send password reset email
    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

    let emailSent = false;
    try {
      const emailParams = {
        Source: Resource.EmailIdentity.sender,
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: "Password Reset - Budgify",
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Password Reset Request</h2>
                  <p>Hello,</p>
                  <p>You requested a password reset for your Budgify account. Click the link below to reset your password:</p>
                  <p style="margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
                  </p>
                  <p><strong>Important:</strong> This link will expire in 15 minutes for security reasons.</p>
                  <p>If you didn't request this password reset, please ignore this email.</p>
                  <p>Best regards,<br>The Budgify Team</p>
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                  <p style="font-size: 12px; color: #666;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${resetLink}">${resetLink}</a>
                  </p>
                </div>
              `,
              Charset: "UTF-8",
            },
            Text: {
              Data: `
Password Reset Request

Hello,

You requested a password reset for your Budgify account. Click the link below to reset your password:

${resetLink}

Important: This link will expire in 15 minutes for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
The Budgify Team

If the link doesn't work, copy and paste it into your browser.
              `,
              Charset: "UTF-8",
            },
          },
        },
      };

      await sesClient.send(new SendEmailCommand(emailParams));
      emailSent = true;
      console.log(`Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // In development, log the reset link for testing
      if (process.env.NODE_ENV !== "production") {
        console.log(`Password reset link (email failed): ${resetLink}`);
      }
    }

    return NextResponse.json({
      message: emailSent
        ? "Password reset link has been sent to your email."
        : "If an account with that email exists, a password reset link has been sent. (Check console for link in development)",
      resetLink: process.env.NODE_ENV !== "production" ? resetLink : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
