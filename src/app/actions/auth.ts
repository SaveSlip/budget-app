// src/app/actions/auth.ts
"use server";

import bcrypt from "bcryptjs";
import {
  signupSchema,
  SignupInput,
  resetPasswordSchema,
  ResetPasswordInput,
  forgotPasswordSchema,
  ForgotPasswordInput,
  changePasswordSchema,
  ChangePasswordInput,
} from "@/lib/validations/auth";
import {
  createUserRecord,
  deletePartition,
  docClient,
  TABLE_NAME,
} from "@/lib/db";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import {
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";
import { formatDuration, intervalToDuration } from "date-fns";

const sesClient = new SESClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function registerUser(
  data: SignupInput,
): Promise<{ success?: true; error?: string; needsVerification?: true }> {
  try {
    const parsed = signupSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid input data" };
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const userId = crypto.randomUUID();

    const dbResult = await createUserRecord({
      id: userId,
      email: parsed.data.email,
      hashedPassword: hashedPassword,
    });

    if (dbResult.error) {
      // Check if the existing account is unverified so we can offer resend
      const { Item: existing } = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: `USER#${parsed.data.email}`,
            sk: `PROFILE#${parsed.data.email}`,
          },
        }),
      );
      if (existing && !existing.emailVerified) {
        return {
          error:
            "An account with this email already exists but hasn't been verified yet.",
          needsVerification: true,
        };
      }
      return { error: dbResult.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to register user:", error);
    return { error: "Internal Server Error" };
  }
}

export async function logout() {
  await signOut();
  redirect("/signin");
}

export async function deleteAccount(): Promise<{ error?: string; success?: boolean }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email)
      return { error: "Unauthorized" };

    const { id: userId, email } = session.user;

    await deletePartition(`USER#${userId}`);

    const { Item: profile } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );

    if (profile?.latestVerifyToken) {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: `VERIFY#${profile.latestVerifyToken}`,
            sk: `VERIFY#${profile.latestVerifyToken}`,
          },
        }),
      );
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );

    await signOut({ redirect: false });
    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return { error: "Failed to delete account. Please try again." };
  }
}

export async function changePasswordAction(
  data: ChangePasswordInput,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const parsed = changePasswordSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
      return { error: firstError };
    }

    const session = await auth();
    if (!session?.user?.email) return { error: "Unauthorized" };

    const email = session.user.email;

    const { Item: user } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );

    if (!user?.passwordHash) return { error: "User not found." };

    const isMatch = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) return { error: "Current password is incorrect." };

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
        UpdateExpression:
          "SET passwordHash = :password, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":password": hashedPassword,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );

    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return { error: "Internal server error" };
  }
}

export async function forgotPasswordAction(data: ForgotPasswordInput) {
  try {
    const parsed = forgotPasswordSchema.safeParse(data);
    if (!parsed.success) return { error: "Invalid email provided." };

    const email = parsed.data.email;

    const { Item: user } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );

    if (!user) {
      return {
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      };
    }

    if (!user.emailVerified) {
      return { error: "unverified" };
    }

    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    const expiresInLabel = formatDuration(
      intervalToDuration({ start: 0, end: RESET_TOKEN_TTL_MS }),
    );

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `RESET#${resetToken}`,
          sk: `RESET#${resetToken}`,
          email,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
        },
      }),
    );

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
        UpdateExpression: "SET latestResetToken = :token",
        ExpressionAttributeValues: { ":token": resetToken },
      }),
    );

    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

    try {
      await sesClient.send(
        new SendEmailCommand({
          Source: Resource.EmailIdentity.sender,
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: { Data: "Password Reset - Budgify", Charset: "UTF-8" },
            Body: {
              Html: {
                Data: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Password Reset Request</h2>
                  <p>Hello,</p>
                  <p>You requested a password reset for your Budgify account. Click the link below to reset your password:</p>
                  <p style="margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #a8471f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
                  </p>
                  <p><strong>Important:</strong> This link will expire in ${expiresInLabel} for security reasons.</p>
                  <p>If you did not request this password reset, please ignore this email.</p>
                </div>
              `,
                Charset: "UTF-8",
              },
            },
          },
        }),
      );
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      return { error: "Failed to dispatch email." };
    }

    return { success: true };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { error: "Internal server error" };
  }
}

export async function validateResetTokenAction(token: string): Promise<{
  success?: true;
  error?: string;
  reason?: "invalid" | "expired" | "superseded";
  email?: string;
}> {
  try {
    const tokensToTry = [...new Set([token, decodeURIComponent(token)])];

    for (const tokenToTry of tokensToTry) {
      const { Item: resetToken } = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { pk: `RESET#${tokenToTry}`, sk: `RESET#${tokenToTry}` },
        }),
      );

      if (resetToken) {
        const email = resetToken.email as string;
        const expiresAt = new Date(resetToken.expiresAt as string);
        if (expiresAt < new Date()) {
          await docClient.send(
            new DeleteCommand({
              TableName: TABLE_NAME,
              Key: { pk: `RESET#${tokenToTry}`, sk: `RESET#${tokenToTry}` },
            }),
          );
          return {
            error: "Reset token has expired.",
            reason: "expired",
            email,
          };
        }

        const { Item: user } = await docClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
          }),
        );

        if (!user) return { error: "Account not found.", reason: "invalid" };

        if (user.latestResetToken !== tokenToTry) {
          return {
            error:
              "This reset link has been superseded. Please use the most recent email.",
            reason: "superseded",
            email,
          };
        }

        return { success: true };
      }
    }
    return { error: "Invalid or expired reset token.", reason: "invalid" };
  } catch (error) {
    console.error("Token validation error:", error);
    return { error: "Internal server error" };
  }
}

export async function resetPasswordAction(
  token: string,
  data: ResetPasswordInput,
) {
  try {
    const parsed = resetPasswordSchema.safeParse(data);
    if (!parsed.success) return { error: "Invalid input data" };

    const tokensToTry = [...new Set([token, decodeURIComponent(token)])];
    let resolvedToken: string | null = null;
    let resetToken: Record<string, unknown> | undefined;

    for (const tokenToTry of tokensToTry) {
      const { Item } = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { pk: `RESET#${tokenToTry}`, sk: `RESET#${tokenToTry}` },
        }),
      );
      if (Item) {
        resolvedToken = tokenToTry;
        resetToken = Item as Record<string, unknown>;
        break;
      }
    }

    if (!resetToken || !resolvedToken)
      return { error: "Invalid or expired reset token" };

    if (new Date(resetToken.expiresAt as string) < new Date()) {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: `RESET#${resolvedToken}`,
            sk: `RESET#${resolvedToken}`,
          },
        }),
      );
      return { error: "Reset token has expired" };
    }

    const email = resetToken.email as string;

    const { Item: user } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );

    if (!user) return { error: "Account not found." };

    if (user.latestResetToken !== resolvedToken) {
      return {
        error:
          "This reset link has been superseded. Please use the most recent email.",
      };
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
        UpdateExpression:
          "SET passwordHash = :password, updatedAt = :updatedAt REMOVE latestResetToken",
        ExpressionAttributeValues: {
          ":password": hashedPassword,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `RESET#${resolvedToken}`,
          sk: `RESET#${resolvedToken}`,
        },
      }),
    );

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { error: "Internal server error" };
  }
}

export async function sendVerificationEmail(
  email: string,
): Promise<{ success?: true; error?: string }> {
  try {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
    const expiresInLabel = formatDuration(
      intervalToDuration({ start: 0, end: VERIFY_TOKEN_TTL_MS }),
    );
    const baseUrl =
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const verifyLink = `${baseUrl}/verify-email/${token}`;

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `VERIFY#${token}`,
          sk: `VERIFY#${token}`,
          email,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
        },
      }),
    );

    // Store the latest token on the user profile so old links are invalidated on resend
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
        UpdateExpression: "SET latestVerifyToken = :token",
        ExpressionAttributeValues: { ":token": token },
      }),
    );

    try {
      await sesClient.send(
        new SendEmailCommand({
          Source: Resource.EmailIdentity.sender,
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: {
              Data: "Verify your email — Budgify",
              Charset: "UTF-8",
            },
            Body: {
              Html: {
                Data: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Welcome to Budgify!</h2>
                  <p>Hello,</p>
                  <p>Thanks for signing up. Please verify your email address to activate your account:</p>
                  <p style="margin: 30px 0;">
                    <a href="${verifyLink}" style="background-color: #a8471f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
                  </p>
                  <p><strong>This link expires in ${expiresInLabel}.</strong></p>
                  <p>If you did not create a Budgify account, you can safely ignore this email.</p>
                </div>
              `,
                Charset: "UTF-8",
              },
            },
          },
        }),
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return { error: "Failed to send verification email. Please try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("Send verification email error:", error);
    return { error: "Internal server error" };
  }
}

export async function resendVerificationEmail(
  email: string,
): Promise<{ success?: true; error?: string }> {
  try {
    const { Item: user } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );
    if (!user) return { error: "No account found with that email address." };
    if (user.emailVerified)
      return { error: "This email is already verified. Please sign in." };

    return sendVerificationEmail(email);
  } catch (error) {
    console.error("Resend verification email error:", error);
    return { error: "Internal server error" };
  }
}

export async function verifyEmailToken(token: string): Promise<{
  success?: true;
  autoLoginToken?: string;
  error?: string;
  reason?: "invalid" | "expired" | "superseded";
  email?: string;
}> {
  try {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `VERIFY#${token}`, sk: `VERIFY#${token}` },
      }),
    );

    if (!Item)
      return {
        error:
          "Verification link not found. It may have expired or already been used.",
        reason: "invalid",
      };

    const email = Item.email as string;

    if (new Date(Item.expiresAt) < new Date()) {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { pk: `VERIFY#${token}`, sk: `VERIFY#${token}` },
        }),
      );
      return {
        error: "Verification link has expired. Please request a new one.",
        reason: "expired",
        email,
      };
    }

    // Reject stale links — only the most recently issued token is valid
    const { Item: user } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );

    if (!user) return { error: "Account not found.", email };

    if (user.latestVerifyToken !== token) {
      return {
        error:
          "This verification link has been superseded. Please use the most recent email.",
        reason: "superseded",
        email,
      };
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
        UpdateExpression:
          "SET emailVerified = :verified, updatedAt = :now REMOVE latestVerifyToken",
        ExpressionAttributeValues: {
          ":verified": true,
          ":now": new Date().toISOString(),
        },
      }),
    );

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `VERIFY#${token}`, sk: `VERIFY#${token}` },
      }),
    );

    const autoLoginToken = crypto.randomUUID();
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `AUTOLOGIN#${autoLoginToken}`,
          sk: `AUTOLOGIN#${autoLoginToken}`,
          email,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      }),
    );

    return { success: true, autoLoginToken };
  } catch (error) {
    console.error("Verify email token error:", error);
    return { error: "Internal server error" };
  }
}
