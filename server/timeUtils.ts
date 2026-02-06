/**
 * 北京时间工具函数
 * 统一使用UTC+8时区处理所有时间相关逻辑
 */

/**
 * 获取当前北京时间的Date对象
 */
export function getBJTime(): Date {
  const now = new Date();
  // 获取UTC时间戳
  const utcTime = now.getTime();
  // 转换为北京时间（UTC+8）
  const bjTime = new Date(utcTime + 8 * 60 * 60 * 1000);
  return bjTime;
}

/**
 * 将任意时间戳转换为北京时间的Date对象
 */
export function toBJTime(timestamp: number | Date): Date {
  const ts = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
  return new Date(ts + 8 * 60 * 60 * 1000);
}

/**
 * 获取当前北京时间的日期字符串（YYYY-MM-DD）
 */
export function getBJDate(): string {
  const bjTime = getBJTime();
  const year = bjTime.getUTCFullYear();
  const month = String(bjTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bjTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
 * 获取北京时间的年月字符串（YYYY-MM）
 */
export function getBJMonth(): string {
  const bjTime = getBJTime();
  const year = bjTime.getUTCFullYear();
  const month = String(bjTime.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 将时间戳转换为北京时间的年月字符串（YYYY-MM）
 */
export function formatBJMonth(timestamp: number | Date): string {
  const bjTime = toBJTime(timestamp);
  const year = bjTime.getUTCFullYear();
  const month = String(bjTime.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
