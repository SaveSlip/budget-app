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
          profile: "amanbrar-dev",
        },
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

    const email = new sst.aws.Email("EmailIdentity", {
      sender: "amanbrarpro@gmail.com",
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
      environment: {
        AUTH_SECRET: process.env.AUTH_SECRET!,
      },
    });

    return {
      url: web.url,
    };
  },
});
