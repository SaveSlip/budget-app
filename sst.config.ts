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
    const table = new sst.aws.Dynamo("BudgifyUsersTable", {
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

    // Provision Next.js and securely bind the DynamoDB resource
    new sst.aws.Nextjs("BudgifyWeb", {
      link: [table],
      // Future implementation: Custom domain routing via Cloudflare DNS
      // domain: isProduction ? "amanbrar.pro" : undefined,
    });
  },
});
