// sst.config.ts
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "budget-app",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile: "amanbrar-dev", // Required per your workflow standards
        },
      },
    };
  },
  async run() {
    // Enterprise Standard: Single-Table Design
    const table = new sst.aws.Dynamo("BudgifyTable", {
      fields: {
        pk: "string",
        sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      transform: {
        table: {
          pointInTimeRecovery: { enabled: $app.stage === "production" }, // Cost control mandate
        },
      },
    });

    // 1. Define the email resource (Added)
    const email = new sst.aws.Email("EmailIdentity", {
      sender: "noreply@amanbrar.pro",
    });

    // 2. Define the Next.js site and link BOTH resources (Added)
    new sst.aws.Nextjs("BudgifyWeb", {
      link: [table, email],
      // Keep any other Next.js configuration you might already have in here
    });

    const web = new sst.aws.Nextjs("BudgifyWeb", {
      link: [table], // This binds Resource.BudgifyTable
      domain: {
        name: "amanbrar.pro",
        dns: sst.cloudflare.dns(),
      },
      environment: {
        AUTH_SECRET: "supersecretkey", // In production, use AWS Secrets Manager or Parameter Store
      },
    });

    return {
      url: web.url,
    };
  },
});
