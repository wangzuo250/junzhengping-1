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

    me: publicProcedure.query(opts => opts.ctx.user),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 用户管理
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '不能修改自己的角色',
          });
        }

        await db.updateUserRole(input.userId, input.role);
        await db.createSystemLog({
          userId: ctx.user.id,
          action: "UPDATE_USER_ROLE",
          target: `User ${input.userId}`,
          details: { newRole: input.role },
        });
        return { success: true };
      }),

    updateInfo: adminProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().min(1),
        username: z.string().min(2).max(50),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserInfo(input.userId, input.name, input.username);
        await db.createSystemLog({
          userId: ctx.user.id,
          action: "UPDATE_USER_INFO",
          target: `User ${input.userId}`,
          details: { name: input.name, username: input.username },
        });
        return { success: true };
      }),

    updatePassword: adminProcedure
      .input(z.object({
        userId: z.number(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserPassword(input.userId, input.newPassword);
        await db.createSystemLog({
          userId: ctx.user.id,
          action: "UPDATE_USER_PASSWORD",
          target: `User ${input.userId}`,
          details: {},
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '不能删除自己的账户',
          });
        }

        await db.deleteUser(input.userId);
        await db.createSystemLog({
          userId: ctx.user.id,
          action: "DELETE_USER",
          target: `User ${input.userId}`,
          details: {},
        });
        return { success: true };
      }),

    toggleStatus: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '不能修改自己的状态',
          });
        }

        const newStatus = await db.toggleUserStatus(input.userId);
        await db.createSystemLog({
          userId: ctx.user.id,
          action: "TOGGLE_USER_STATUS",
          target: `User ${input.userId}`,
          details: { newStatus },
        });
        return { success: true, newStatus };
      }),
  }),

  // 选题提交
  submissions: router({
    submit: protectedProcedure
      .input(z.object({
        // 主表单字段
        longTermPlan: z.string().optional(),
        workSuggestion: z.string().optional(),
        riskWarning: z.string().optional(),
        
        // 选题列表（至少一条）
        topics: z.array(z.object({
          content: z.string().optional(),
          suggestedFormat: z.array(z.string()).optional(),
          creativeIdea: z.string().optional(),
          creator: z.string().optional(),
          relatedLink: z.string().optional(),
        })).min(1, "请至少添加一条选题"),
        
        // 项目进度列表（可选）
        projects: z.array(z.object({
          projectName: z.string().optional(),
          progress: z.enum(["未开始", "已开始", "已结束", "暂停"]).optional(),
          note: z.string().optional(),
        })).optional().default([]),
      }))
      .mutation(async ({ input, ctx }) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const form = await db.getOrCreateCollectionForm(today, ctx.user.id);

        // 创建主提交记录
        const submissionId = await db.createSubmission({
          userId: ctx.user.id,
          collectionFormId: form.id,
          submitterName: ctx.user.name || ctx.user.username || "未知用户",
          longTermPlan: input.longTermPlan || null,
          workSuggestion: input.workSuggestion || null,
          riskWarning: input.riskWarning || null,
        });

        // 创建选题子记录
        const topicRecords = input.topics.map(topic => ({
          submissionId,
          content: topic.content || null,
          suggestedFormat: topic.suggestedFormat?.join(',') || null,
          creativeIdea: topic.creativeIdea || null,
          creator: topic.creator || null,
          relatedLink: topic.relatedLink || null,
        }));
        await db.createSubmissionTopics(topicRecords);

        // 创建项目进度子记录
        const projectRecords = input.projects.map(project => ({
          submissionId,
          projectName: project.projectName || null,
          progress: project.progress || null,
          note: project.note || null,
        }));
        await db.createSubmissionProjects(projectRecords);

        return { 
          success: true, 
          submissionId,
          topicCount: input.topics.length,
          projectCount: input.projects.length,
        };
      }),

    getByDate: publicProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const submissions = await db.getSubmissionsByDate(input.startDate, input.endDate);
        return { submissions };
      }),

    todayStats: protectedProcedure.query(async () => {
      return await db.getTodayStats();
    }),

    myHistory: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        // 如果传入了 userId 且不是当前用户，需要管理员权限
        const targetUserId = input?.userId || ctx.user.id;
        if (targetUserId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权查看其他用户的数据',
          });
        }
        return await db.getUserSubmissions(targetUserId);
      }),

    myStats: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        // 如果传入了 userId 且不是当前用户，需要管理员权限
        const targetUserId = input?.userId || ctx.user.id;
        if (targetUserId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权查看其他用户的数据',
          });
        }
        return await db.getUserTotalStats(targetUserId);
      }),
  }),

  // 入选选题管理
  selectedTopics: router({
    // 检查选题是否已入选
    checkSelected: protectedProcedure
      .input(z.object({
        submissionTopicId: z.number(),
      }))
      .query(async ({ input }) => {
        const selectedTopic = await db.getSelectedTopicBySourceId(input.submissionTopicId);
        return { 
          isSelected: !!selectedTopic,
          selectedTopicId: selectedTopic?.id || null,
        };
      }),

    // 移除入选选题（管理员专用）
    removeFromSelected: adminProcedure
      .input(z.object({
        submissionTopicId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const selectedTopic = await db.getSelectedTopicBySourceId(input.submissionTopicId);
        if (!selectedTopic) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '该选题未入选',
          });
        }

        await db.deleteSelectedTopic(selectedTopic.id);

        await db.createSystemLog({
          userId: ctx.user.id,
          action: "REMOVE_FROM_SELECTED",
          target: `Topic ${selectedTopic.id}`,
          details: { submissionTopicId: input.submissionTopicId },
        });

        return { success: true };
      }),

    // 从汇总选题创建入选（管理员专用）
    addFromSubmission: adminProcedure
      .input(z.object({
        submissionTopicId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 获取原始选题信息
        const topic = await db.getSubmissionTopicById(input.submissionTopicId);
        if (!topic) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '选题不存在',
          });
        }

        const today = format(new Date(), 'yyyy-MM-dd');
        const monthKey = format(new Date(), 'yyyy-MM');

        const id = await db.createSelectedTopic({
          content: topic.content || '',
          suggestion: topic.suggestedFormat || null,
          submitters: topic.submitterName || '未知用户',
          selectedDate: new Date(today),
          monthKey,
          sourceSubmissionId: topic.submissionId,
          createdBy: ctx.user.id,
          progress: '未开始',
          status: '未发布',
        });

        await db.createSystemLog({
          userId: ctx.user.id,
          action: "ADD_SELECTED_FROM_SUBMISSION",
          target: `Topic ${id}`,
          details: { submissionTopicId: input.submissionTopicId },
        });

        return { success: true, id };
      }),

    // 直接新建入选选题（管理员专用）
    create: adminProcedure
      .input(z.object({
        content: z.string().min(1),
        suggestion: z.string().optional(),
        submitters: z.string().min(1),
        leaderComment: z.string().optional(),
        creators: z.string().optional(),
        progress: z.enum(["未开始", "进行中", "已完成", "已暂停"]).optional(),
        status: z.enum(["未发布", "已发布", "否决"]).optional(),
        remark: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const monthKey = format(new Date(), 'yyyy-MM');

        const id = await db.createSelectedTopic({
          content: input.content,
          suggestion: input.suggestion || null,
          submitters: input.submitters,
          selectedDate: new Date(today),
          monthKey,
          sourceSubmissionId: null,
          createdBy: ctx.user.id,
          leaderComment: input.leaderComment || null,
          creators: input.creators || null,
          progress: input.progress || '未开始',
          status: input.status || '未发布',
          remark: input.remark || null,
        });

        await db.createSystemLog({
          userId: ctx.user.id,
          action: "CREATE_SELECTED_TOPIC",
          target: `Topic ${id}`,
          details: { content: input.content },
        });

        return { success: true, id };
      }),

    add: adminProcedure
      .input(z.object({
        content: z.string().min(1),
        suggestion: z.string().optional(),
        submitterIds: z.array(z.number()).min(1),
        sourceSubmissionId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const monthKey = format(new Date(), 'yyyy-MM');

        const id = await db.createSelectedTopic({
          content: input.content,
          suggestion: input.suggestion || null,
          submitters: input.submitterIds.join(','),
          selectedDate: new Date(today),
          monthKey,
          sourceSubmissionId: input.sourceSubmissionId || null,
          createdBy: ctx.user.id,
        });

        await db.createSystemLog({
          userId: ctx.user.id,
          action: "ADD_SELECTED_TOPIC",
          target: `Topic ${id}`,
          details: { content: input.content },
        });

        return { success: true, id };
      }),

    listByMonth: protectedProcedure
      .input(z.object({
        monthKey: z.string(), // YYYY-MM
      }))
      .query(async ({ input }) => {
        return await db.getSelectedTopicsByMonth(input.monthKey);
      }),

    listAll: protectedProcedure.query(async () => {
      return await db.getAllSelectedTopics();
    }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          content: z.string().optional(),
          suggestion: z.string().optional(),
          leaderComment: z.string().optional(),
          creators: z.string().optional(),
          progress: z.enum(["未开始", "进行中", "已完成", "已暂停"]).optional(),
          status: z.enum(["未发布", "已发布", "否决"]).optional(),
          remark: z.string().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        // 普通用户只能编辑进度相关字段
        if (ctx.user.role !== "admin") {
          const allowedFields = ["leaderComment", "creators", "progress", "status", "remark"];
          const requestedFields = Object.keys(input.data);
          const hasUnauthorizedField = requestedFields.some(f => !allowedFields.includes(f));
          
          if (hasUnauthorizedField) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: '普通用户只能编辑进度相关字段',
            });
          }
        }

        await db.updateSelectedTopic(input.id, input.data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteSelectedTopic(input.id);
        await db.createSystemLog({
          userId: ctx.user.id,
          action: "DELETE_SELECTED_TOPIC",
          target: `Topic ${input.id}`,
        });
        return { success: true };
      }),

    progressStats: protectedProcedure.query(async () => {
      return await db.getProgressStats();
    }),

    statusStats: protectedProcedure.query(async () => {
      return await db.getStatusStats();
    }),

    monthlyContribution: protectedProcedure
      .input(z.object({
        monthKeys: z.array(z.string()), // ["2026-01", "2026-02"]
      }))
      .query(async ({ input, ctx }) => {
        const allData = await db.getMonthlyContribution(input.monthKeys);
        
        // 普通用户只返回前5名
        if (ctx.user.role !== "admin") {
          return allData.slice(0, 5);
        }
        
        return allData;
      }),

    exportReport: protectedProcedure
      .input(z.object({
        monthKeys: z.array(z.string()),
      }))
      .mutation(async ({ input, ctx }) => {
        const contribution = await db.getMonthlyContribution(input.monthKeys);
        const progressStats = await db.getProgressStats();
        const statusStats = await db.getStatusStats();

        // 普通用户只导出前5名
        const exportData = ctx.user.role === "admin" 
          ? contribution 
          : contribution.slice(0, 5);

        const buffer = await generateExcelReport({
          contribution: exportData,
          progressStats,
          statusStats,
          monthKeys: input.monthKeys,
        });

        return {
          success: true,
          data: buffer.toString('base64'),
          filename: `选题统计报告_${input.monthKeys.join('_')}.xlsx`,
        };
      }),

    // 获取个人入选选题
    myTopics: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        // 如果传入了 userId 且不是当前用户，需要管理员权限
        const targetUserId = input?.userId || ctx.user.id;
        if (targetUserId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权查看其他用户的数据',
          });
        }
        
        // 获取目标用户的姓名
        const targetUser = await db.getUserById(targetUserId);
        if (!targetUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '用户不存在',
          });
        }
        
        const allTopics = await db.getAllSelectedTopics();
        // 筛选包含目标用户姓名的入选选题
        return allTopics.filter(topic => 
          topic.submitters && topic.submitters.includes(targetUser.name || '')
        );
      }),
  }),

  // 选题管理
  submissionTopics: router({
    // 更新选题
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          content: z.string().optional(),
          suggestedFormat: z.string().optional(),
          creativeIdea: z.string().optional(),
          creator: z.string().optional(),
          relatedLink: z.string().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        // 验证选题属于当前用户
        const topic = await db.getSubmissionTopicById(input.id);
        if (!topic) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '选题不存在',
          });
        }
        if (topic.submitterId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权修改此选题',
          });
        }

        await db.updateSubmissionTopic(input.id, input.data);
        return { success: true };
      }),

    // 删除选题
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 验证选题属于当前用户
        const topic = await db.getSubmissionTopicById(input.id);
        if (!topic) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '选题不存在',
          });
        }
        if (topic.submitterId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权删除此选题',
          });
        }

        await db.deleteSubmissionTopic(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
