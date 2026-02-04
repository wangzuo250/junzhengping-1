import cron from 'node-cron';
import { getDb } from './db';
import { collectionForms, submissions, submissionTopics, submissionProjects } from '../drizzle/schema';
import { eq, and, gte, lt } from 'drizzle-orm';
import { format } from 'date-fns';

/**
 * 定时清空服务
 * 每个工作日12:00清空当天的选题表和收集表数据
 */

// 判断是否为工作日（周一到周五）
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 1=Monday, 5=Friday
}

// 清空当天的数据
async function clearTodayData() {
  const db = await getDb();
  if (!db) {
    console.error('[CronService] Database not available');
    return;
  }

  const now = new Date();
  
  // 只在工作日执行
  if (!isWeekday(now)) {
    console.log('[CronService] Today is not a weekday, skipping clear operation');
    return;
  }

  try {
    const today = format(now, 'yyyy-MM-dd');
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    console.log(`[CronService] Clearing data for ${today}...`);

    // 1. 查找今天的所有提交记录
    const todaySubmissions = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(
          gte(submissions.submittedAt, todayStart),
          lt(submissions.submittedAt, todayEnd)
        )
      );

    if (todaySubmissions.length === 0) {
      console.log('[CronService] No submissions found for today');
      return;
    }

    const submissionIds = todaySubmissions.map(s => s.id);

    // 2. 删除关联的选题
    for (const id of submissionIds) {
      await db.delete(submissionTopics).where(eq(submissionTopics.submissionId, id));
    }

    // 3. 删除关联的项目
    for (const id of submissionIds) {
      await db.delete(submissionProjects).where(eq(submissionProjects.submissionId, id));
    }

    // 4. 删除提交记录
    const deletedSubmissions = await db
      .delete(submissions)
      .where(
        and(
          gte(submissions.submittedAt, todayStart),
          lt(submissions.submittedAt, todayEnd)
        )
      );

    // 5. 删除今天的收集表
    const deletedForms = await db
      .delete(collectionForms)
      .where(eq(collectionForms.formDate, today));

    console.log(`[CronService] Cleared data for ${today}:`);
    console.log(`  - Submissions: ${submissionIds.length}`);
    console.log(`  - Topics: deleted`);
    console.log(`  - Projects: deleted`);
    console.log(`  - Forms: deleted`);

    // 6. 创建明天的收集表
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = format(tomorrow, 'yyyy-MM-dd');
    const tomorrowTitle = `${format(tomorrow, 'yyyy年MM月dd日')} 选题收集`;

    await db.insert(collectionForms).values({
      formDate: tomorrowDate,
      title: tomorrowTitle,
      createdBy: 1, // 系统创建
    });

    console.log(`[CronService] Created form for tomorrow: ${tomorrowDate}`);
  } catch (error) {
    console.error('[CronService] Error clearing data:', error);
  }
}

// 启动定时任务
export function startCronJobs() {
  // 每个工作日12:00执行
  // 格式: 秒 分 时 日 月 周
  // '0 0 12 * * 1-5' 表示周一到周五的12:00:00
  cron.schedule('0 0 12 * * 1-5', async () => {
    console.log('[CronService] Running scheduled clear task...');
    await clearTodayData();
  }, {
    timezone: 'Asia/Shanghai' // 使用中国时区
  });

  console.log('[CronService] Cron jobs started (weekdays 12:00 CST)');
}

// 手动触发清空（用于测试）
export async function manualClear() {
  console.log('[CronService] Manual clear triggered');
  await clearTodayData();
}
