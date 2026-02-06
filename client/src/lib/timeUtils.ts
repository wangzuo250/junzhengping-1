/**
 * 前端北京时间工具函数
 * 统一使用UTC+8时区处理所有时间相关逻辑
 */

/**
 * 将时间戳转换为北京时间的Date对象
 */
export function toBJTime(timestamp: number | Date): Date {
  const ts = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
  return new Date(ts + 8 * 60 * 60 * 1000);
}

/**
 * 将时间戳转换为北京时间的日期字符串（YYYY-MM-DD）
 */
export function formatBJDate(timestamp: number | Date): string {
  const bjTime = toBJTime(timestamp);
  const year = bjTime.getUTCFullYear();
  const month = String(bjTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bjTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 将时间戳转换为北京时间的完整时间字符串（YYYY-MM-DD HH:mm:ss）
 */
export function formatBJDateTime(timestamp: number | Date): string {
  const bjTime = toBJTime(timestamp);
  const year = bjTime.getUTCFullYear();
  const month = String(bjTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bjTime.getUTCDate()).padStart(2, '0');
  const hour = String(bjTime.getUTCHours()).padStart(2, '0');
  const minute = String(bjTime.getUTCMinutes()).padStart(2, '0');
  const second = String(bjTime.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 将时间戳转换为北京时间的时间字符串（HH:mm）
 */
export function formatBJTime(timestamp: number | Date): string {
  const bjTime = toBJTime(timestamp);
  const hour = String(bjTime.getUTCHours()).padStart(2, '0');
  const minute = String(bjTime.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * 将时间戳转换为北京时间的中文日期字符串（YYYY年MM月DD日 星期X）
 */
export function formatBJDateChinese(timestamp: number | Date): string {
  const bjTime = toBJTime(timestamp);
  const year = bjTime.getUTCFullYear();
  const month = bjTime.getUTCMonth() + 1;
  const day = bjTime.getUTCDate();
  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][bjTime.getUTCDay()];
  return `${year}年${month}月${day}日${weekday}`;
}

/**
 * 获取当前北京时间的日期字符串（YYYY-MM-DD）
 */
export function getBJDate(): string {
  const now = new Date();
  return formatBJDate(now);
}
