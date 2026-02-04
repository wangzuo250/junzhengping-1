import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { format } from "date-fns";
import { generateExcelReport } from "./exportService";
import { registerUser, loginUser } from "./localAuth";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    // 注册
    register: publicProcedure
      .input(z.object({
        username: z.string().min(2).max(50),
        email: z.string().email().optional(),
        password: z.string().min(6),
        name: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await registerUser(input);
          return result;
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message || '注册失败',
          });
        }
      }),

    // 登录
    login: publicProcedure
      .input(z.object({
        usernameOrEmail: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await loginUser(input.usernameOrEmail, input.password);
          
          // 设置 Cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, result.token, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
          });
          
          return {
            success: true,
            user: result.user,
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: error.message || '登录失败',
          });
        }
      }),

    // 获取当前用户信息
    me: publicProcedure.query(opts => opts.ctx.user),
    
    // 登出
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // 用户管理
  users: router({
    list: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),
    
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        await db.createSystemLog({
          userId: input.userId,
          action: "UPDATE_USER_ROLE",
          target: `User ${input.userId}`,
          details: { newRole: input.role },
        });
        return { success: true };
      }),
  }),

  // 选题提交
  submissions: router({
    submit: protectedProcedure
      .input(z.object({
        topics: z.array(z.object({
          content: z.string().min(1, "选题内容不能为空"),
          suggestedFormat: z.array(z.string()).min(1, "请至少选择一种建议形式"),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const form = await db.getOrCreateCollectionForm(today, ctx.user.id);

        const submissionList = input.topics.map(topic => ({
          userId: ctx.user.id,
          collectionFormId: form.id,
          content: topic.content,
          suggestedFormat: topic.suggestedFormat.join(','), // 数组转为逗号分隔字符串
        }));

        await db.createSubmissions(submissionList);
        return { success: true, count: submissionList.length };
      }),

    getByDate: protectedProcedure
      .input(z.object({
        date: z.string(), // YYYY-MM-DD
      }))
      .query(async ({ input }) => {
        const form = await db.getCollectionFormByDate(input.date);
        if (!form) return { form: null, submissions: [] };

        const submissions = await db.getSubmissionsByFormId(form.id);
        return { form, submissions };
      }),

    getTodayStats: publicProcedure.query(async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return db.getTodayStats(today);
    }),

    getUserHistory: protectedProcedure.query(async ({ ctx }) => {
      return db.getSubmissionsByUserId(ctx.user.id);
    }),
  }),

  // 入选选题管理
  selectedTopics: router({
    list: protectedProcedure
      .input(z.object({
        monthKey: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return db.getSelectedTopics(input.monthKey);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSelectedTopicById(input.id);
      }),

    getMonthKeys: protectedProcedure.query(async () => {
      return db.getDistinctMonthKeys();
    }),

    add: protectedProcedure
      .input(z.object({
        content: z.string().min(1),
        suggestion: z.string().optional(),
        submitters: z.string(),
        selectedDate: z.string(), // YYYY-MM-DD
        sourceSubmissionId: z.number().optional(),
        leaderComment: z.string().optional(),
        creators: z.string().optional(),
        progress: z.enum(["未开始", "进行中", "已完成", "已暂停"]).optional(),
        status: z.enum(["未发布", "已发布", "否决"]).optional(),
        remark: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 计算月份标识
        const monthKey = input.selectedDate.substring(0, 7); // YYYY-MM

        // 检测重复
        const duplicate = await db.checkDuplicateSelectedTopic(input.content, monthKey);
        
        if (duplicate) {
          // 合并提报人
          await db.mergeSubmitters(duplicate.id, input.submitters);
          return { 
            success: true, 
            merged: true, 
            id: duplicate.id,
            message: "该选题已存在，已合并提报人"
          };
        }

        // 创建新记录
        const id = await db.createSelectedTopic({
          content: input.content.trim(),
          suggestion: input.suggestion,
          submitters: input.submitters,
          selectedDate: new Date(input.selectedDate),
          monthKey,
          sourceSubmissionId: input.sourceSubmissionId,
          createdBy: ctx.user.id,
          leaderComment: input.leaderComment,
          creators: input.creators,
          progress: input.progress || "未开始",
          status: input.status || "未发布",
          remark: input.remark,
        });

        await db.createSystemLog({
          userId: ctx.user.id,
          action: "ADD_SELECTED_TOPIC",
          target: `Topic ${id}`,
          details: { content: input.content },
        });

        return { success: true, merged: false, id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().optional(),
        suggestion: z.string().optional(),
        leaderComment: z.string().optional(),
        creators: z.string().optional(),
        progress: z.enum(["未开始", "进行中", "已完成", "已暂停"]).optional(),
        status: z.enum(["未发布", "已发布", "否决"]).optional(),
        remark: z.string().optional(),
        selectedDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const topic = await db.getSelectedTopicById(input.id);
        if (!topic) {
          throw new TRPCError({ code: "NOT_FOUND", message: "选题不存在" });
        }

        // 权限检查：普通用户只能编辑进度相关字段
        if (ctx.user.role !== "admin") {
          const allowedFields = ["leaderComment", "creators", "progress", "status", "remark"];
          const requestedFields = Object.keys(input).filter(k => k !== "id");
          const hasUnauthorizedFields = requestedFields.some(f => !allowedFields.includes(f));
          
          if (hasUnauthorizedFields) {
            throw new TRPCError({ 
              code: "FORBIDDEN", 
              message: "普通用户只能编辑进度相关字段" 
            });
          }
        }

        const updates: any = {};
        if (input.content !== undefined) updates.content = input.content;
        if (input.suggestion !== undefined) updates.suggestion = input.suggestion;
        if (input.leaderComment !== undefined) updates.leaderComment = input.leaderComment;
        if (input.creators !== undefined) updates.creators = input.creators;
        if (input.progress !== undefined) updates.progress = input.progress;
        if (input.status !== undefined) updates.status = input.status;
        if (input.remark !== undefined) updates.remark = input.remark;
        if (input.selectedDate !== undefined) {
          updates.selectedDate = new Date(input.selectedDate);
          updates.monthKey = input.selectedDate.substring(0, 7);
        }

        await db.updateSelectedTopic(input.id, updates);

        await db.createSystemLog({
          userId: ctx.user.id,
          action: "UPDATE_SELECTED_TOPIC",
          target: `Topic ${input.id}`,
          details: updates,
        });

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteSelectedTopic(input.id);
        
        await db.createSystemLog({
          userId: ctx.user.id,
          action: "DELETE_SELECTED_TOPIC",
          target: `Topic ${input.id}`,
        });

        return { success: true };
      }),
  }),

  // 统计功能
  stats: router({
    overview: adminProcedure.query(async () => {
      return db.getSelectedTopicsStats();
    }),

    monthlyContribution: protectedProcedure
      .input(z.object({
        monthKeys: z.array(z.string()),
      }))
      .query(async ({ input, ctx }) => {
        const allData = await db.getMonthlyContribution(input.monthKeys);
        
        // 权限控制：普通用户只返回前5名
        if (ctx.user.role === "admin") {
          return { data: allData, isLimited: false };
        } else {
          return { data: allData.slice(0, 5), isLimited: true };
        }
      }),
  }),

  // 个人空间
  personal: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserStats(ctx.user.id, ctx.user.name || "未知用户");
    }),
  }),

  // 导出功能
  export: router({
    excel: protectedProcedure
      .input(z.object({
        monthKeys: z.array(z.string()),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = await generateExcelReport(ctx.user.role, input.monthKeys);
        const base64 = Buffer.from(buffer).toString('base64');
        return { data: base64, filename: `选题系统报表_${format(new Date(), 'yyyyMMdd')}.xlsx` };
      }),
  }),
});

export type AppRouter = typeof appRouter;
