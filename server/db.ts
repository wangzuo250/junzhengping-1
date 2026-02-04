import { eq, and, gte, lte, desc, sql, count, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  collectionForms, 
  submissions,
  submissionTopics,
  submissionProjects,
  selectedTopics,
  systemLogs,
  type CollectionForm,
  type Submission,
  type SubmissionTopic,
  type SubmissionProject,
  type SelectedTopic,
  type InsertCollectionForm,
  type InsertSubmission,
  type InsertSubmissionTopic,
  type InsertSubmissionProject,
  type InsertSelectedTopic,
  type InsertSystemLog
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { format } from 'date-fns';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ 用户相关 ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.username && !user.openId) {
    throw new Error("User username or openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = user.openId 
      ? { openId: user.openId }
      : { username: user.username };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "password"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserInfo(userId: number, name: string, username: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ name, username }).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, userId));
}

export async function toggleUserStatus(userId: number): Promise<"active" | "suspended"> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.length === 0) {
    throw new Error("User not found");
  }

  const newStatus = user[0].status === "active" ? "suspended" : "active";
  await db.update(users).set({ status: newStatus }).where(eq(users.id, userId));
  return newStatus;
}

// ============ 收集表相关 ============

export async function getOrCreateCollectionForm(formDate: string, createdBy: number): Promise<CollectionForm> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(collectionForms)
    .where(eq(collectionForms.formDate, new Date(formDate)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const dateObj = new Date(formDate);
  const title = `${format(dateObj, 'yyyy年MM月dd日')} 选题收集`;

  const result = await db.insert(collectionForms).values({
    formDate: new Date(formDate),
    title,
    createdBy,
  });

  const insertId = Number(result[0].insertId);
  return {
    id: insertId,
    formDate: new Date(formDate),
    title,
    createdBy,
    createdAt: new Date(),
  };
}

export async function getCollectionFormByDate(formDate: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(collectionForms)
    .where(eq(collectionForms.formDate, new Date(formDate)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============ 选题提交相关 ============

/**
 * 创建主提交记录
 */
export async function createSubmission(data: InsertSubmission): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(submissions).values(data);
  return Number(result[0].insertId);
}

/**
 * 批量创建选题子记录
 */
export async function createSubmissionTopics(topics: InsertSubmissionTopic[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (topics.length === 0) return;
  await db.insert(submissionTopics).values(topics);
}

/**
 * 根据ID获取单条选题记录（含提交人信息）
 */
export async function getSubmissionTopicById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      topic: submissionTopics,
      submission: submissions,
      user: users,
    })
    .from(submissionTopics)
    .leftJoin(submissions, eq(submissionTopics.submissionId, submissions.id))
    .leftJoin(users, eq(submissions.userId, users.id))
    .where(eq(submissionTopics.id, id))
    .limit(1);

  if (result.length === 0) return null;

  return {
    ...result[0].topic,
    submitterId: result[0].submission?.userId || 0,
    submitterName: result[0].user?.name || result[0].user?.username || '未知用户',
  };
}

/**
 * 更新选题
 */
export async function updateSubmissionTopic(id: number, data: Partial<InsertSubmissionTopic>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(submissionTopics)
    .set(data)
    .where(eq(submissionTopics.id, id));
}

/**
 * 删除选题
 */
export async function deleteSubmissionTopic(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(submissionTopics)
    .where(eq(submissionTopics.id, id));
}

/**
 * 批量创建项目进度子记录
 */
export async function createSubmissionProjects(projects: InsertSubmissionProject[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (projects.length === 0) return;
  await db.insert(submissionProjects).values(projects);
}

/**
 * 获取指定日期范围的所有提交（含用户信息、选题列表、项目列表）
 * @param startDate - 开始日期（YYYY-MM-DD）
 * @param endDate - 结束日期（YYYY-MM-DD），可选，默认与startDate
 */
export async function getSubmissionsByDate(startDate: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];

  const actualEndDate = endDate || startDate;

  // 获取日期范围内的所有表单
  const forms = await db
    .select()
    .from(collectionForms)
    .where(
      and(
        sql`${collectionForms.formDate} >= ${startDate}`,
        sql`${collectionForms.formDate} <= ${actualEndDate}`
      )
    );

  if (forms.length === 0) return [];

  const formIds = forms.map(f => f.id);

  // 获取主提交记录
  const submissionList = await db
    .select({
      submission: submissions,
      user: users,
    })
    .from(submissions)
    .leftJoin(users, eq(submissions.userId, users.id))
    .where(inArray(submissions.collectionFormId, formIds))
    .orderBy(desc(submissions.submittedAt));

  // 获取所有提交的ID
  const submissionIds = submissionList.map(s => s.submission.id);
  if (submissionIds.length === 0) return [];

  // 批量获取选题列表
  const topics = await db
    .select()
    .from(submissionTopics)
    .where(inArray(submissionTopics.submissionId, submissionIds));

  // 批量获取项目列表
  const projects = await db
    .select()
    .from(submissionProjects)
    .where(inArray(submissionProjects.submissionId, submissionIds));

  // 组装数据
  return submissionList.map(item => ({
    ...item.submission,
    userName: item.user?.name || item.user?.username || "未知用户",
    topics: topics.filter(t => t.submissionId === item.submission.id),
    projects: projects.filter(p => p.submissionId === item.submission.id),
  }));
}

/**
 * 获取今日统计
 */
export async function getTodayStats() {
  const db = await getDb();
  if (!db) return { submissionCount: 0, topicCount: 0, userCount: 0 };

  const today = format(new Date(), 'yyyy-MM-dd');
  const form = await getCollectionFormByDate(today);
  if (!form) return { submissionCount: 0, topicCount: 0, userCount: 0 };

  const submissionList = await db
    .select()
    .from(submissions)
    .where(eq(submissions.collectionFormId, form.id));

  const submissionIds = submissionList.map(s => s.id);
  if (submissionIds.length === 0) {
    return { submissionCount: 0, topicCount: 0, userCount: 0 };
  }

  const topicList = await db
    .select()
    .from(submissionTopics)
    .where(inArray(submissionTopics.submissionId, submissionIds));

  const uniqueUsers = new Set(submissionList.map(s => s.userId));

  return {
    submissionCount: submissionList.length,
    topicCount: topicList.length,
    userCount: uniqueUsers.size,
  };
}

/**
 * 获取用户的提交历史
 */
export async function getUserSubmissions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const submissionList = await db
    .select({
      submission: submissions,
      form: collectionForms,
    })
    .from(submissions)
    .leftJoin(collectionForms, eq(submissions.collectionFormId, collectionForms.id))
    .where(eq(submissions.userId, userId))
    .orderBy(desc(submissions.submittedAt));

  const submissionIds = submissionList.map(s => s.submission.id);
  if (submissionIds.length === 0) return [];

  const topics = await db
    .select()
    .from(submissionTopics)
    .where(inArray(submissionTopics.submissionId, submissionIds));

  const projects = await db
    .select()
    .from(submissionProjects)
    .where(inArray(submissionProjects.submissionId, submissionIds));

  return submissionList.map(item => ({
    ...item.submission,
    formDate: item.form?.formDate,
    formTitle: item.form?.title,
    topics: topics.filter(t => t.submissionId === item.submission.id),
    projects: projects.filter(p => p.submissionId === item.submission.id),
  }));
}

/**
 * 获取用户的累计统计
 */
export async function getUserTotalStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalSubmissions: 0, totalTopics: 0, totalSelected: 0 };

  const submissionList = await db
    .select()
    .from(submissions)
    .where(eq(submissions.userId, userId));

  const submissionIds = submissionList.map(s => s.id);
  let totalTopics = 0;
  if (submissionIds.length > 0) {
    const topicList = await db
      .select()
      .from(submissionTopics)
      .where(inArray(submissionTopics.submissionId, submissionIds));
    totalTopics = topicList.length;
  }

  const selectedList = await db
    .select()
    .from(selectedTopics)
    .where(sql`FIND_IN_SET(${userId}, REPLACE(${selectedTopics.submitters}, ' ', ''))`);

  return {
    totalSubmissions: submissionList.length,
    totalTopics,
    totalSelected: selectedList.length,
  };
}

// ============ 入选选题相关 ============

export async function createSelectedTopic(data: InsertSelectedTopic): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(selectedTopics).values(data);
  return Number(result[0].insertId);
}

export async function getSelectedTopicsByMonth(monthKey: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(selectedTopics)
    .where(eq(selectedTopics.monthKey, monthKey))
    .orderBy(desc(selectedTopics.selectedDate));
}

export async function getAllSelectedTopics() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(selectedTopics)
    .orderBy(desc(selectedTopics.selectedDate));
}

export async function updateSelectedTopic(id: number, data: Partial<SelectedTopic>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(selectedTopics).set(data).where(eq(selectedTopics.id, id));
}

export async function deleteSelectedTopic(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(selectedTopics).where(eq(selectedTopics.id, id));
}

export async function getProgressStats() {
  const db = await getDb();
  if (!db) return { 未开始: 0, 进行中: 0, 已完成: 0, 已暂停: 0 };

  const result = await db
    .select({
      progress: selectedTopics.progress,
      count: count(),
    })
    .from(selectedTopics)
    .groupBy(selectedTopics.progress);

  const stats: Record<string, number> = { 未开始: 0, 进行中: 0, 已完成: 0, 已暂停: 0 };
  result.forEach(row => {
    stats[row.progress] = Number(row.count);
  });

  return stats;
}

export async function getStatusStats() {
  const db = await getDb();
  if (!db) return { 未发布: 0, 已发布: 0, 否决: 0 };

  const result = await db
    .select({
      status: selectedTopics.status,
      count: count(),
    })
    .from(selectedTopics)
    .groupBy(selectedTopics.status);

  const stats: Record<string, number> = { 未发布: 0, 已发布: 0, 否决: 0 };
  result.forEach(row => {
    stats[row.status] = Number(row.count);
  });

  return stats;
}

export async function getMonthlyContribution(monthKeys: string[]) {
  const db = await getDb();
  if (!db) return [];

  const topics = await db
    .select()
    .from(selectedTopics)
    .where(inArray(selectedTopics.monthKey, monthKeys));

  const userStats: Record<number, { name: string; selectedCount: number; publishedCount: number }> = {};

  for (const topic of topics) {
    const submitterIds = topic.submitters.split(',').map(id => parseInt(id.trim()));
    for (const userId of submitterIds) {
      if (!userStats[userId]) {
        const user = await getUserById(userId);
        userStats[userId] = {
          name: user?.name || user?.username || "未知用户",
          selectedCount: 0,
          publishedCount: 0,
        };
      }
      userStats[userId].selectedCount++;
      if (topic.status === "已发布") {
        userStats[userId].publishedCount++;
      }
    }
  }

  return Object.entries(userStats).map(([userId, stats]) => ({
    userId: parseInt(userId),
    ...stats,
    publishRate: stats.selectedCount > 0 
      ? ((stats.publishedCount / stats.selectedCount) * 100).toFixed(1) + '%'
      : '0%',
  })).sort((a, b) => b.selectedCount - a.selectedCount);
}

// ============ 系统日志相关 ============

export async function createSystemLog(data: InsertSystemLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(systemLogs).values(data);
}
