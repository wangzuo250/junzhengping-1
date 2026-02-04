import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: null,
    username: "testuser",
    email: "test@example.com",
    name: "测试用户",
    password: null,
    loginMethod: null,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("submissions.submit", () => {
  it("应该成功提交包含选题和项目的表单", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.submissions.submit({
      longTermPlan: "长期策划内容",
      workSuggestion: "工作建议内容",
      riskWarning: "风险提示内容",
      topics: [
        {
          content: "选题内容1",
          suggestedFormat: ["钧评", "长文"],
          creativeIdea: "创作思路1",
          creator: "创作者1",
          relatedLink: "https://example.com/1",
        },
        {
          content: "选题内容2",
          suggestedFormat: ["短视频"],
        },
      ],
      projects: [
        {
          projectName: "项目1",
          progress: "已开始",
          note: "备注1",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.topicCount).toBe(2);
    expect(result.projectCount).toBe(1);
    expect(result.submissionId).toBeTypeOf("number");
  });

  it("应该允许提交只有必填字段的表单", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.submissions.submit({
      topics: [{}],
      projects: [{}],
    });

    expect(result.success).toBe(true);
    expect(result.topicCount).toBe(1);
    expect(result.projectCount).toBe(1);
  });

  it("应该拒绝没有选题的提交", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.submissions.submit({
        topics: [],
        projects: [{}],
      })
    ).rejects.toThrow();
  });

  it("应该拒绝没有项目的提交", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.submissions.submit({
        topics: [{}],
        projects: [],
      })
    ).rejects.toThrow();
  });
});

describe("submissions.getByDate", () => {
  it("应该能够查询指定日期的提交", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.submissions.getByDate({
      date: "2026-02-04",
    });

    expect(result).toHaveProperty("form");
    expect(result).toHaveProperty("submissions");
    expect(Array.isArray(result.submissions)).toBe(true);
  });
});

describe("submissions.todayStats", () => {
  it("应该返回今日统计信息", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.submissions.todayStats();

    expect(result).toHaveProperty("submissionCount");
    expect(result).toHaveProperty("topicCount");
    expect(result).toHaveProperty("userCount");
    expect(typeof result.submissionCount).toBe("number");
    expect(typeof result.topicCount).toBe("number");
    expect(typeof result.userCount).toBe("number");
  });
});

describe("submissions.myHistory", () => {
  it("应该返回用户的提交历史", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.submissions.myHistory();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("submissions.myStats", () => {
  it("应该返回用户的累计统计", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.submissions.myStats();

    expect(result).toHaveProperty("totalSubmissions");
    expect(result).toHaveProperty("totalTopics");
    expect(result).toHaveProperty("totalSelected");
    expect(typeof result.totalSubmissions).toBe("number");
    expect(typeof result.totalTopics).toBe("number");
    expect(typeof result.totalSelected).toBe("number");
  });
});
