import { eq, and, gte, lt, lte, desc, sql, count, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";
import { 
  InsertUser, 
  users, 
  collectionForms, 
  submissions,
  submissionTopics,
  submissionProjects,
  selectedTopics,
  systemLogs,
  topicStatusHistory,
  topicComments,
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
  type InsertSystemLog,
  type TopicStatusHistory,
  type InsertTopicStatusHistory
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { format } from 'date-fns';
import { formatBJDate } from './timeUtils';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = createPool(process.env.DATABASE_URL);
      _db = drizzle(pool);
      console.log('[Database] Connected successfully');
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
    .where(eq(collectionForms.formDate, formDate))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const dateObj = new Date(formDate);
  const title = `${format(dateObj, 'yyyy年MM月dd日')} 选题收集`;

  console.log('[DEBUG] Inserting collection_forms with formDate:', formDate, 'type:', typeof formDate);
  const result = await db.insert(collectionForms).values({
    formDate: formDate,
    title,
    createdBy,
  });
  console.log('[DEBUG] Insert result:', result);

  const insertId = Number(result[0].insertId);
  return {
    id: insertId,
    formDate: formDate,
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
    .where(eq(collectionForms.formDate, formDate))
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
 * 获取所有历史提交，按日期分组（含用户信息、选题列表、项目列表）
 * 返回格式：{ "2026-02-05": [...], "2026-02-04": [...] }
 * 每个日期内的选题按提交时间倒序排列
 * 日期键按倒序排列（最新日期在前）
 */
export async function getAllSubmissionsGroupedByDate() {
  const db = await getDb();
  if (!db) return {};

  console.log('[DEBUG] getAllSubmissionsGroupedByDate called');

  // 查询所有提交，按提交时间倒序
  const submissionList = await db
    .select({
      submission: submissions,
      user: users,
    })
    .from(submissions)
    .leftJoin(users, eq(submissions.userId, users.id))
    .orderBy(desc(submissions.submittedAt));

  console.log('[DEBUG] Found total submissions:', submissionList.length);

  // 获取所有提交的ID
  const submissionIds = submissionList.map(s => s.submission.id);
  if (submissionIds.length === 0) {
    console.log('[DEBUG] No submissions found');
    return {};
  }

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

  // 组装数据并按日期分组
  const grouped: Record<string, any[]> = {};
  
  for (const item of submissionList) {
    // 使用北京时间进行日期分组
    const dateKey = formatBJDate(item.submission.submittedAt);
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    
    grouped[dateKey].push({
      ...item.submission,
      userName: item.user?.name || item.user?.username || "未知用户",
      topics: topics.filter(t => t.submissionId === item.submission.id),
      projects: projects.filter(p => p.submissionId === item.submission.id),
    });
  }

  console.log('[DEBUG] Grouped by dates:', Object.keys(grouped));
  return grouped;
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

  try {
    // 使用原生SQL插入
    const result: any = await db.execute(sql`
      INSERT INTO selected_topics (
        content, suggestion, submitters, creators, progress, status, 
        selectedDate, monthKey, sourceSubmissionId, createdBy
      ) VALUES (
        ${data.content}, ${data.suggestion || ''}, ${data.submitters}, 
        ${data.creators || ''}, ${data.progress}, ${data.status},
        ${data.selectedDate}, ${data.monthKey}, ${data.sourceSubmissionId}, ${data.createdBy}
      )
    `);
    const insertId = result[0]?.insertId || result.insertId;
    console.log('[createSelectedTopic] Insert success, ID:', insertId);
    return Number(insertId);
  } catch (error) {
    console.error('[createSelectedTopic] Error:', error);
    throw error;
  }
}

export async function getSelectedTopicsByMonth(monthKey: string) {
  const db = await getDb();
  if (!db) return [];

  const result: any = await db.execute(sql`
    SELECT * FROM selected_topics 
    WHERE monthKey = ${monthKey}
    ORDER BY selectedDate DESC
  `);
  return result[0] || result;
}

export async function getAllSelectedTopics() {
  try {
    const db = await getDb();
    if (!db) {
      console.log('[getAllSelectedTopics] No database connection');
      return [];
    }

    console.log('[getAllSelectedTopics] Starting query...');
    // 使用原生SQL查询
    const result: any = await db.execute(sql`
      SELECT * FROM selected_topics 
      ORDER BY selectedDate DESC
    `);
    const topics = result[0] || result; // mysql2返回[rows, fields]，取第一个元素
    
    console.log('[getAllSelectedTopics] Found topics:', topics.length);

    // 为每个选题查询关联的点评（使用原生SQL）
    try {
      const topicsWithComments = await Promise.all(
        topics.map(async (topic: any) => {
          try {
            const commentsResult: any = await db.execute(sql`
              SELECT id, comment, commentBy as userName, createdAt 
              FROM topic_comments 
              WHERE topicId = ${topic.id}
              ORDER BY createdAt DESC
            `);
            const comments = commentsResult[0] || commentsResult;

            return {
              ...topic,
              comments: comments.map((c: any) => ({
                ...c,
                createdAt: new Date(c.createdAt).toISOString(), // 转换为字符串避免序列化问题
              })),
            };
          } catch (commentError) {
            console.error(`[getAllSelectedTopics] Error fetching comments for topic ${topic.id}:`, commentError);
            return { ...topic, comments: [] };
          }
        })
      );
      
      console.log('[getAllSelectedTopics] Returning topics with comments:', topicsWithComments.length);
      return topicsWithComments;
    } catch (error) {
      console.error('[getAllSelectedTopics] Error fetching comments:', error);
      // 如果查询comments失败，返回不带comments的topics
      return topics.map((topic: any) => ({ ...topic, comments: [] }));
    }
  } catch (error) {
    console.error('[getAllSelectedTopics] Fatal error:', error);
    return [];
  }
}

export async function getSelectedTopicById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result: any = await db.execute(sql`
    SELECT * FROM selected_topics 
    WHERE id = ${id}
    LIMIT 1
  `);
  const topics = result[0] || result;
  return topics[0] || null;
}

export async function getSelectedTopicBySubmissionId(sourceSubmissionId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result: any = await db.execute(sql`
      SELECT * FROM selected_topics 
      WHERE sourceSubmissionId = ${sourceSubmissionId}
      LIMIT 1
    `);
    const topics = result[0] || result;
    return topics[0] || null;
  } catch (error) {
    console.error('[getSelectedTopicBySubmissionId] Error:', error);
    return null;
  }
}

export async function updateSelectedTopic(id: number, data: Partial<SelectedTopic>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 构建SET子句
  const setClauses = Object.entries(data).map(([key, value]) => {
    return `${key} = ${typeof value === 'string' ? `'${value}'` : value}`;
  }).join(', ');
  
  await db.execute(sql.raw(`UPDATE selected_topics SET ${setClauses} WHERE id = ${id}`));
}

export async function deleteSelectedTopic(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(sql`DELETE FROM selected_topics WHERE id = ${id}`);
}

export async function getProgressStats(month?: string) {
  const db = await getDb();
  if (!db) return { 未开始: 0, 进行中: 0, 已完成: 0, 已暂停: 0 };

  // 根据是否有月份参数构建不同的查询
  const result = month
    ? await db
        .select({
          progress: selectedTopics.progress,
          count: count(),
        })
        .from(selectedTopics)
        .where(sql`DATE_FORMAT(${selectedTopics.selectedDate}, '%Y-%m') = ${month}`)
        .groupBy(selectedTopics.progress)
    : await db
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

export async function getStatusStats(month?: string) {
  const db = await getDb();
  if (!db) return { 未发布: 0, 已发布: 0, 否决: 0 };

  // 根据是否有月份参数构建不同的查询
  const result = month
    ? await db
        .select({
          status: selectedTopics.status,
          count: count(),
        })
        .from(selectedTopics)
        .where(sql`DATE_FORMAT(${selectedTopics.selectedDate}, '%Y-%m') = ${month}`)
        .groupBy(selectedTopics.status)
    : await db
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

export async function getMonthlyContribution(month: string) {
  const db = await getDb();
  if (!db) return [];

  // 使用 sql 函数构建查询条件，根据 selectedDate 字段筛选指定月份
  const topics = await db
    .select()
    .from(selectedTopics)
    .where(sql`DATE_FORMAT(${selectedTopics.selectedDate}, '%Y-%m') = ${month}`);

  console.log(`[DEBUG] Month: ${month}, Found ${topics.length} topics`);

  // 获取所有用户，建立用户名到ID的映射
  const allUsers = await getAllUsers();
  const userNameMap = new Map<string, { id: number; name: string }>();
  for (const user of allUsers) {
    // 同时映射 name 和 username
    if (user.name) userNameMap.set(user.name, { id: user.id, name: user.name });
    if (user.username) userNameMap.set(user.username, { id: user.id, name: user.name || user.username });
  }

  const userStats: Record<number, { name: string; selectedCount: number; publishedCount: number; rejectedCount: number }> = {};

  for (const topic of topics) {
    // 过滤空字符串和无效的 submitters
    if (!topic.submitters || topic.submitters.trim() === '') continue;
    
    // submitters 是用户名列表，逗号分隔
    const submitterNames = topic.submitters
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    console.log(`[DEBUG] Topic ${topic.id}: submitters=${topic.submitters}, names=${submitterNames}`);
    
    for (const userName of submitterNames) {
      const userInfo = userNameMap.get(userName);
      if (!userInfo) {
        console.log(`[DEBUG] User not found: ${userName}`);
        continue;
      }
      
      const userId = userInfo.id;
      if (!userStats[userId]) {
        userStats[userId] = {
          name: userInfo.name,
          selectedCount: 0,
          publishedCount: 0,
          rejectedCount: 0,
        };
      }
      userStats[userId].selectedCount++;
      if (topic.status === "已发布") {
        userStats[userId].publishedCount++;
      }
      if (topic.status === "否决") {
        userStats[userId].rejectedCount++;
      }
    }
  }

  const result = Object.entries(userStats).map(([userId, stats]) => ({
    userId: parseInt(userId),
    ...stats,
    publishRate: stats.selectedCount > 0 
      ? ((stats.publishedCount / stats.selectedCount) * 100).toFixed(1)
      : '0',
  })).sort((a, b) => b.selectedCount - a.selectedCount);

  console.log(`[DEBUG] Final result: ${JSON.stringify(result)}`);
  return result;
}

// ============ 系统日志相关 ============

export async function createSystemLog(data: InsertSystemLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(systemLogs).values(data);
}


// ============ 选题状态变更历史相关 ============

/**
 * 记录选题状态变更
 */
export async function recordStatusChange(data: InsertTopicStatusHistory): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot record status change: database not available");
    return;
  }
  
  await db.insert(topicStatusHistory).values(data);
}

/**
 * 获取选题的状态变更历史
 */
export async function getTopicStatusHistory(selectedTopicId: number): Promise<TopicStatusHistory[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get status history: database not available");
    return [];
  }
  
  return await db
    .select()
    .from(topicStatusHistory)
    .where(eq(topicStatusHistory.selectedTopicId, selectedTopicId))
    .orderBy(desc(topicStatusHistory.changedAt));
}
