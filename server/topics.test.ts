import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("submissions router", () => {
  it("should allow authenticated users to submit topics", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.submissions.submit({
      topics: [
        { content: "测试选题1", suggestedFormat: ["钧评"] },
        { content: "测试选题2", suggestedFormat: ["快评", "视频"] },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });

  it("should return today stats", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.submissions.getTodayStats();

    expect(stats).toHaveProperty("userCount");
    expect(stats).toHaveProperty("topicCount");
    expect(typeof stats.userCount).toBe("number");
    expect(typeof stats.topicCount).toBe("number");
  });
});

describe("selectedTopics router", () => {
  it("should allow users to list selected topics", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const topics = await caller.selectedTopics.list({});

    expect(Array.isArray(topics)).toBe(true);
  });

  it("should allow users to add selected topics", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.selectedTopics.add({
      content: "测试入选选题",
      suggestion: "钧评",
      submitters: "Test User",
      selectedDate: "2026-02-04",
    });

    expect(result.success).toBe(true);
    expect(result).toHaveProperty("id");
  });

  it("should detect duplicate topics and merge submitters", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 第一次添加
    await caller.selectedTopics.add({
      content: "重复测试选题",
      suggestion: "钧评",
      submitters: "User A",
      selectedDate: "2026-02-04",
    });

    // 第二次添加相同内容
    const result = await caller.selectedTopics.add({
      content: "重复测试选题",
      suggestion: "钧评",
      submitters: "User B",
      selectedDate: "2026-02-04",
    });

    expect(result.merged).toBe(true);
    expect(result.message).toContain("已合并提报人");
  });

  it("should allow users to update progress fields", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建一个选题
    const addResult = await caller.selectedTopics.add({
      content: "待更新选题",
      suggestion: "钧评",
      submitters: "Test User",
      selectedDate: "2026-02-04",
    });

    // 更新进度字段
    const updateResult = await caller.selectedTopics.update({
      id: addResult.id!,
      progress: "进行中",
      status: "已发布",
      leaderComment: "很好的选题",
    });

    expect(updateResult.success).toBe(true);
  });

  it("should prevent non-admin users from editing content", async () => {
    const ctx = createTestContext("user");
    const caller = appRouter.createCaller(ctx);

    // 先创建一个选题
    const addResult = await caller.selectedTopics.add({
      content: "测试权限选题",
      suggestion: "钧评",
      submitters: "Test User",
      selectedDate: "2026-02-04",
    });

    // 尝试更新内容字段（普通用户不允许）
    await expect(
      caller.selectedTopics.update({
        id: addResult.id!,
        content: "修改后的内容",
      })
    ).rejects.toThrow("普通用户只能编辑进度相关字段");
  });

  it("should allow admin to delete topics", async () => {
    const ctx = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 先创建一个选题
    const addResult = await caller.selectedTopics.add({
      content: "待删除选题",
      suggestion: "钧评",
      submitters: "Test User",
      selectedDate: "2026-02-04",
    });

    // 删除
    const deleteResult = await caller.selectedTopics.delete({
      id: addResult.id!,
    });

    expect(deleteResult.success).toBe(true);
  });
});

describe("stats router", () => {
  it("should allow admin to view overview stats", async () => {
    const ctx = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.stats.overview();

    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("notStarted");
    expect(stats).toHaveProperty("inProgress");
    expect(stats).toHaveProperty("completed");
    expect(stats).toHaveProperty("published");
  });

  it("should limit contribution data for regular users", async () => {
    const ctx = createTestContext("user");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.monthlyContribution({
      monthKeys: ["2026-02"],
    });

    if (result.data.length > 5) {
      expect(result.isLimited).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(5);
    }
  });

  it("should show full contribution data for admin", async () => {
    const ctx = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.monthlyContribution({
      monthKeys: ["2026-02"],
    });

    expect(result.isLimited).toBe(false);
  });
});

describe("personal router", () => {
  it("should return user stats", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.personal.stats();

    expect(stats).toHaveProperty("totalSubmissions");
    expect(stats).toHaveProperty("totalSelected");
    expect(typeof stats.totalSubmissions).toBe("number");
    expect(typeof stats.totalSelected).toBe("number");
  });
});

describe("users router (admin only)", () => {
  it("should allow admin to list users", async () => {
    const ctx = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const users = await caller.users.list();

    expect(Array.isArray(users)).toBe(true);
  });

  it("should allow admin to update user role", async () => {
    const ctx = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.updateRole({
      userId: 1,
      role: "admin",
    });

    expect(result.success).toBe(true);
  });
});
