import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(user?: AuthenticatedUser): TrpcContext {
  return {
    user: user || null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Local Authentication", () => {
  const testUsername = `testuser_${Date.now()}`;
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "password123";

  it("should register a new user", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.register({
      username: testUsername,
      email: testEmail,
      password: testPassword,
      name: "Test User",
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBeGreaterThan(0);
  });

  it("should prevent duplicate username registration", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.register({
        username: testUsername,
        email: `another_${Date.now()}@example.com`,
        password: testPassword,
      })
    ).rejects.toThrow("用户名已被使用");
  });

  it("should prevent duplicate email registration", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.register({
        username: `another_${Date.now()}`,
        email: testEmail,
        password: testPassword,
      })
    ).rejects.toThrow("邮箱已被使用");
  });

  it("should login with username", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      usernameOrEmail: testUsername,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.username).toBe(testUsername);
  });

  it("should login with email", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      usernameOrEmail: testEmail,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
  });

  it("should reject wrong password", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        usernameOrEmail: testUsername,
        password: "wrongpassword",
      })
    ).rejects.toThrow("密码错误");
  });

  it("should reject non-existent user", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        usernameOrEmail: "nonexistentuser",
        password: testPassword,
      })
    ).rejects.toThrow("用户不存在");
  });

  it("should logout successfully", async () => {
    const user: AuthenticatedUser = {
      id: 1,
      username: testUsername,
      password: null,
      name: "Test User",
      email: testEmail,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      openId: null,
      loginMethod: null,
    };

    const ctx = createTestContext(user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
  });
});
