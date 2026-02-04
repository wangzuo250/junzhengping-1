import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, json } from "drizzle-orm/mysql-core";

/**
 * 用户表 - 核心认证表
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  
  // 本地认证字段
  username: varchar("username", { length: 50 }).unique(), // 用户名，唯一
  password: varchar("password", { length: 255 }), // 密码哈希
  
  // 基本信息
  name: text("name"), // 真实姓名
  email: varchar("email", { length: 320 }).unique(), // 邮箱，唯一
  
  // 系统字段
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(), // 用户状态：active=正常，suspended=暂停填写
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  
  // 备用字段（兼容旧数据）
  openId: varchar("openId", { length: 64 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 每日选题收集表 - 按天归档选题
 */
export const collectionForms = mysqlTable("collection_forms", {
  id: int("id").autoincrement().primaryKey(),
  formDate: date("formDate").notNull().unique(), // 收集日期，格式：YYYY-MM-DD
  title: varchar("title", { length: 255 }).notNull(), // 表单标题，如"2026年02月04日 选题收集"
  createdBy: int("createdBy").notNull(), // 创建人ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CollectionForm = typeof collectionForms.$inferSelect;
export type InsertCollectionForm = typeof collectionForms.$inferInsert;

/**
 * 选题提交记录表 - 存储用户每次提交的主表单
 */
export const submissions = mysqlTable("submissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 提交人ID
  collectionFormId: int("collectionFormId").notNull(), // 关联的收集表ID
  
  // 主表单字段
  submitterName: varchar("submitterName", { length: 100 }).notNull(), // 提报人姓名
  longTermPlan: text("longTermPlan"), // 长期策划（可选）
  workSuggestion: text("workSuggestion"), // 工作建议（可选）
  riskWarning: text("riskWarning"), // 风险提示（可选）
  
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;

/**
 * 选题子表 - 存储每次提交中的多个选题
 */
export const submissionTopics = mysqlTable("submission_topics", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(), // 关联主表
  
  // 选题字段（全部可选）
  content: text("content"), // 选题内容
  suggestedFormat: text("suggestedFormat"), // 建议形式（逗号分隔，支持多选）
  creativeIdea: text("creativeIdea"), // 创作思路
  creator: varchar("creator", { length: 100 }), // 创作者
  relatedLink: text("relatedLink"), // 相关链接
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubmissionTopic = typeof submissionTopics.$inferSelect;
export type InsertSubmissionTopic = typeof submissionTopics.$inferInsert;

/**
 * 项目进度子表 - 存储每次提交中的多个项目进度
 */
export const submissionProjects = mysqlTable("submission_projects", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(), // 关联主表
  
  // 项目进度字段（全部可选）
  projectName: varchar("projectName", { length: 255 }), // 项目名
  progress: mysqlEnum("progress", ["未开始", "已开始", "已结束", "暂停"]), // 进度
  note: text("note"), // 备注
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubmissionProject = typeof submissionProjects.$inferSelect;
export type InsertSubmissionProject = typeof submissionProjects.$inferInsert;

/**
 * 入选选题表 - 管理从每日选题中筛选出的优质选题
 */
export const selectedTopics = mysqlTable("selected_topics", {
  id: int("id").autoincrement().primaryKey(),
  
  // 基本信息
  content: text("content").notNull(), // 选题内容
  suggestion: varchar("suggestion", { length: 255 }), // 安排建议（钧评、快评、视频等）
  submitters: text("submitters").notNull(), // 提报人列表（逗号分隔）
  
  // 进度和状态信息
  leaderComment: text("leaderComment"), // 领导点评
  creators: text("creators"), // 创作人（可多人多形式）
  progress: mysqlEnum("progress", [
    "未开始", "进行中", "已完成", "已暂停"
  ]).default("未开始").notNull(),
  status: mysqlEnum("status", [
    "未发布", "已发布", "否决"
  ]).default("未发布").notNull(),
  remark: text("remark"), // 备注
  
  // 时间信息
  selectedDate: date("selectedDate").notNull(), // 入选日期
  monthKey: varchar("monthKey", { length: 7 }).notNull(), // 月份标识（YYYY-MM）
  
  // 关联信息
  sourceSubmissionId: int("sourceSubmissionId"), // 来源提交记录ID
  
  // 系统字段
  createdBy: int("createdBy").notNull(), // 创建人ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SelectedTopic = typeof selectedTopics.$inferSelect;
export type InsertSelectedTopic = typeof selectedTopics.$inferInsert;

/**
 * 系统日志表 - 记录管理员操作
 */
export const systemLogs = mysqlTable("system_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // 操作人ID
  action: varchar("action", { length: 100 }).notNull(), // 操作类型
  target: varchar("target", { length: 255 }), // 操作目标
  details: json("details"), // 详细信息
  ipAddress: varchar("ipAddress", { length: 45 }), // IP地址
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = typeof systemLogs.$inferInsert;
