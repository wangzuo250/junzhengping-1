import cron from 'node-cron';
import { getDb } from './db';
import { collectionForms } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';

/**
 * 定时任务服务
 * 每个工作日12:00创建明天的收集表
 * 注意：不删除任何历史数据，所有提交记录永久保存
 * 汇总页面直接查询submissions表，不依赖collection_forms表
 */

// 判断是否为工作日（周一到周五）
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 1=Monday, 5=Friday
}

// 创建明天的收集表
async function createTomorrowForm() {
  const db = await getDb();
  if (!db) {
    console.error('[CronService] Database not available');
    return;
  }

  const now = new Date();
  
  // 只在工作日执行
  if (!isWeekday(now)) {
    console.log('[CronService] Today is not a weekday, skipping form creation');
    return;
  }

  try {
    // 创建明天的收集表
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = format(tomorrow, 'yyyy-MM-dd');
    const tomorrowTitle = `${format(tomorrow, 'yyyy年MM月dd日')} 选题收集`;

    // 检查是否已存在
    const existing = await db
      .select()
      .from(collectionForms)
      .where(eq(collectionForms.formDate, tomorrowDate))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[CronService] Form for ${tomorrowDate} already exists, skipping creation`);
      return;
    }

    await db.insert(collectionForms).values({
      formDate: tomorrowDate,
      title: tomorrowTitle,
      createdBy: 1, // 系统创建
    });

    console.log(`[CronService] Created form for tomorrow: ${tomorrowDate}`);
  } catch (error) {
    console.error('[CronService] Error creating form:', error);
  }
}

// 启动定时任务
export function startCronJobs() {
  // 每个工作日12:00执行
  // 格式: 秒 分 时 日 月 周
  // '0 0 12 * * 1-5' 表示周一到周五的12:00:00
  cron.schedule('0 0 12 * * 1-5', async () => {
    console.log('[CronService] Running scheduled task to create tomorrow form...');
    await createTomorrowForm();
  }, {
    timezone: 'Asia/Shanghai' // 使用中国时区
  });

  console.log('[CronService] Cron jobs started (weekdays 12:00 CST)');
}

// 手动触发创建表单（用于测试）
export async function manualCreateForm() {
  console.log('[CronService] Manual form creation triggered');
  await createTomorrowForm();
}
