// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "budget-app",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile: "amanbrar-dev",
        },
      },
    };
  },
  async run() {
    // Stage evaluation for strict cost control
    const isProduction = $app.stage === "production";

    // Provision the Serverless DynamoDB Table
    const table = new sst.aws.Dynamo("UsersTable", {
      fields: {
        pk: "string",
        sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      transform: {
        table: {
          pointInTimeRecovery: {
            enabled: isProduction, // Enable PII only in production for cost efficiency
          },
        },
      },
    });

    // Provision SES for email functionality
    const emailIdentity = new sst.aws.Email("EmailIdentity", {
      sender: "amanbrarpro@gmail.com", // Replace with your verified domain
    });

    // Add SES permissions to the Next.js app
    const web = new sst.aws.Nextjs("Web", {
      link: [table, emailIdentity],
      environment: {
        AUTH_SECRET: "supersecretkey", // In production, use a secure secrets manager
      },
      // Future implementation: Custom domain routing via Cloudflare DNS
      // domain: isProduction ? "amanbrar.pro" : undefined,
    });

    return {
      web,
    };
  },
});
