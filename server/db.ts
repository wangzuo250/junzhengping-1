import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  collectionForms, 
  submissions, 
  selectedTopics,
  systemLogs,
  type CollectionForm,
  type Submission,
  type SelectedTopic,
  type InsertCollectionForm,
  type InsertSubmission,
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
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
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

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ============ 每日选题收集表相关 ============

export async function getOrCreateCollectionForm(formDate: string, createdBy: number): Promise<CollectionForm> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 尝试查找现有记录
  const existing = await db.select().from(collectionForms).where(sql`${collectionForms.formDate} = ${formDate}`).limit(1);
  
  if (existing.length > 0) {
    return existing[0]!;
  }

  // 创建新记录
  const title = `${formDate.replace(/-/g, '年').replace(/年(\d+)$/, '年$1月').replace(/月(\d+)$/, '月$1日')} 选题收集`;
  const newForm: InsertCollectionForm = {
    formDate: new Date(formDate),
    title,
    createdBy,
  };

  const result = await db.insert(collectionForms).values(newForm);
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
  const result = await db.select().from(collectionForms).where(sql`${collectionForms.formDate} = ${formDate}`).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ============ 选题提交相关 ============

export async function createSubmissions(submissionList: InsertSubmission[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(submissions).values(submissionList);
}

export async function getSubmissionsByFormId(collectionFormId: number): Promise<(Submission & { userName: string })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: submissions.id,
      userId: submissions.userId,
      collectionFormId: submissions.collectionFormId,
      content: submissions.content,
      suggestedFormat: submissions.suggestedFormat,
      submittedAt: submissions.submittedAt,
      userName: users.name,
    })
    .from(submissions)
    .leftJoin(users, eq(submissions.userId, users.id))
    .where(eq(submissions.collectionFormId, collectionFormId))
    .orderBy(desc(submissions.submittedAt));

  return result.map(r => ({
    ...r,
    userName: r.userName || '未知用户',
  }));
}

export async function getSubmissionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(submissions).where(eq(submissions.userId, userId)).orderBy(desc(submissions.submittedAt));
}

export async function getTodayStats(formDate: string) {
  const db = await getDb();
  if (!db) return { userCount: 0, topicCount: 0 };

  const form = await getCollectionFormByDate(formDate);
  if (!form) return { userCount: 0, topicCount: 0 };

  const stats = await db
    .select({
      userCount: sql<number>`COUNT(DISTINCT ${submissions.userId})`,
      topicCount: sql<number>`COUNT(*)`,
    })
    .from(submissions)
    .where(eq(submissions.collectionFormId, form.id));

  return stats[0] || { userCount: 0, topicCount: 0 };
}

// ============ 入选选题相关 ============

export async function createSelectedTopic(topic: InsertSelectedTopic) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(selectedTopics).values(topic);
  return Number(result[0].insertId);
}

export async function checkDuplicateSelectedTopic(content: string, monthKey: string): Promise<SelectedTopic | null> {
  const db = await getDb();
  if (!db) return null;

  const normalized = content.trim();
  const result = await db
    .select()
    .from(selectedTopics)
    .where(
      and(
        eq(selectedTopics.monthKey, monthKey),
        eq(selectedTopics.content, normalized)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0]! : null;
}

export async function mergeSubmitters(topicId: number, newSubmitter: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const topic = await db.select().from(selectedTopics).where(eq(selectedTopics.id, topicId)).limit(1);
  
  if (topic.length > 0) {
    const submitters = topic[0]!.submitters
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (!submitters.includes(newSubmitter.trim())) {
      submitters.push(newSubmitter.trim());
      await db
        .update(selectedTopics)
        .set({ 
          submitters: submitters.join(', '),
          updatedAt: new Date()
        })
        .where(eq(selectedTopics.id, topicId));
    }
  }
}

export async function getSelectedTopics(monthKey?: string) {
  const db = await getDb();
  if (!db) return [];

  if (monthKey) {
    return db
      .select()
      .from(selectedTopics)
      .where(eq(selectedTopics.monthKey, monthKey))
      .orderBy(desc(selectedTopics.selectedDate));
  }

  return db.select().from(selectedTopics).orderBy(desc(selectedTopics.selectedDate));
}

export async function getSelectedTopicById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(selectedTopics).where(eq(selectedTopics.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateSelectedTopic(id: number, updates: Partial<SelectedTopic>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(selectedTopics).set({ ...updates, updatedAt: new Date() }).where(eq(selectedTopics.id, id));
}

export async function deleteSelectedTopic(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(selectedTopics).where(eq(selectedTopics.id, id));
}

export async function getDistinctMonthKeys() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .selectDistinct({ monthKey: selectedTopics.monthKey })
    .from(selectedTopics)
    .orderBy(desc(selectedTopics.monthKey));
  return result.map(r => r.monthKey);
}

// 统计相关
export async function getSelectedTopicsStats() {
  const db = await getDb();
  if (!db) return null;

  const stats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      notStarted: sql<number>`SUM(CASE WHEN ${selectedTopics.progress} = '未开始' THEN 1 ELSE 0 END)`,
      inProgress: sql<number>`SUM(CASE WHEN ${selectedTopics.progress} = '进行中' THEN 1 ELSE 0 END)`,
      completed: sql<number>`SUM(CASE WHEN ${selectedTopics.progress} = '已完成' THEN 1 ELSE 0 END)`,
      paused: sql<number>`SUM(CASE WHEN ${selectedTopics.progress} = '已暂停' THEN 1 ELSE 0 END)`,
      notPublished: sql<number>`SUM(CASE WHEN ${selectedTopics.status} = '未发布' THEN 1 ELSE 0 END)`,
      published: sql<number>`SUM(CASE WHEN ${selectedTopics.status} = '已发布' THEN 1 ELSE 0 END)`,
      rejected: sql<number>`SUM(CASE WHEN ${selectedTopics.status} = '否决' THEN 1 ELSE 0 END)`,
    })
    .from(selectedTopics);

  return stats[0] || null;
}

export async function getMonthlyContribution(monthKeys: string[]) {
  const db = await getDb();
  if (!db) return [];

  // 查询指定月份的所有入选选题
  const topics = await db
    .select()
    .from(selectedTopics)
    .where(sql`${selectedTopics.monthKey} IN (${sql.join(monthKeys.map(k => sql`${k}`), sql`, `)})`);

  // 统计每个提报人的贡献
  const contributionMap = new Map<string, {
    name: string;
    selectedCount: number;
    publishedCount: number;
    rejectedCount: number;
  }>();

  topics.forEach(topic => {
    const submitterNames = topic.submitters.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    submitterNames.forEach(name => {
      if (!contributionMap.has(name)) {
        contributionMap.set(name, {
          name,
          selectedCount: 0,
          publishedCount: 0,
          rejectedCount: 0,
        });
      }

      const stats = contributionMap.get(name)!;
      stats.selectedCount++;
      if (topic.status === '已发布') stats.publishedCount++;
      if (topic.status === '否决') stats.rejectedCount++;
    });
  });

  // 转换为数组并排序
  const result = Array.from(contributionMap.values())
    .map(stats => ({
      ...stats,
      publishRate: stats.selectedCount > 0 ? (stats.publishedCount / stats.selectedCount * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.selectedCount - a.selectedCount);

  return result;
}

// ============ 个人统计相关 ============

export async function getUserStats(userId: number, userName: string) {
  const db = await getDb();
  if (!db) return { totalSubmissions: 0, totalSelected: 0 };

  const totalSubmissions = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(submissions)
    .where(eq(submissions.userId, userId));

  // 统计入选数量（提报人字段中包含该用户姓名）
  const allSelected = await db.select().from(selectedTopics);
  const totalSelected = allSelected.filter(topic => 
    topic.submitters.split(',').map(s => s.trim()).includes(userName)
  ).length;

  return {
    totalSubmissions: totalSubmissions[0]?.count || 0,
    totalSelected,
  };
}

// ============ 系统日志相关 ============

export async function createSystemLog(log: InsertSystemLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(systemLogs).values(log);
}

export async function getSystemLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemLogs).orderBy(desc(systemLogs.createdAt)).limit(limit);
}
