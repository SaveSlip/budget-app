// sst.config.ts
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "budget-app",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        cloudflare: { package: "@pulumi/cloudflare" },
      },
    };
  },
  async run() {
    const table = new sst.aws.Dynamo("BudgifyTable", {
      fields: {
        pk: "string",
        sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      transform: {
        table: {
          pointInTimeRecovery: { enabled: $app.stage === "production" },
        },
      },
    });

    // local: verify Gmail address; deployed: verify domain amanbrar.pro (bare domain → SES domain identity)
    const email = $dev
      ? new sst.aws.Email("EmailIdentity", {
          sender: "amanbrarpro@gmail.com",
        })
      : new sst.aws.Email("EmailIdentity", {
          sender: "amanbrar.pro",
          dns: sst.cloudflare.dns(),
        });

    const processRecurring = new sst.aws.Function("ProcessRecurring", {
      handler: "functions/processRecurring.handler",
      link: [table],
    });

    new sst.aws.CronV2("RecurringCron", {
      schedule: "rate(1 day)",
      job: processRecurring,
    });

    const web = new sst.aws.Nextjs("BudgifyWeb", {
      link: [table, email],
      domain: $dev
        ? undefined
        : {
            name: "amanbrar.pro",
            dns: sst.cloudflare.dns(),
          },
      environment: {
        AUTH_SECRET: process.env.AUTH_SECRET!,
        AUTH_URL: $dev ? "http://localhost:3000" : "https://amanbrar.pro",
      },
    });

    return {
      url: web.url,
    };
  },
});
