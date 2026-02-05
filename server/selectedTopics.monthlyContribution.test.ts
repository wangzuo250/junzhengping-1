import { describe, it, expect, beforeAll } from 'vitest';
import { getMonthlyContribution } from './db';

describe('月度贡献统计功能测试', () => {
  it('应该返回包含rejectedCount字段的数据', async () => {
    // 测试查询2026-02月份的数据
    const result = await getMonthlyContribution(['2026-02']);
    
    // 验证返回的数据结构
    if (result.length > 0) {
      const firstItem = result[0];
      
      // 验证必需字段存在
      expect(firstItem).toHaveProperty('userId');
      expect(firstItem).toHaveProperty('name');
      expect(firstItem).toHaveProperty('selectedCount');
      expect(firstItem).toHaveProperty('publishedCount');
      expect(firstItem).toHaveProperty('rejectedCount');
      expect(firstItem).toHaveProperty('publishRate');
      
      // 验证字段类型
      expect(typeof firstItem.userId).toBe('number');
      expect(typeof firstItem.name).toBe('string');
      expect(typeof firstItem.selectedCount).toBe('number');
      expect(typeof firstItem.publishedCount).toBe('number');
      expect(typeof firstItem.rejectedCount).toBe('number');
      expect(typeof firstItem.publishRate).toBe('string');
      
      // 验证发布率格式（应该是不带百分号的数字字符串）
      expect(firstItem.publishRate).toMatch(/^\d+(\.\d+)?$/);
      
      // 验证数据逻辑正确性
      expect(firstItem.selectedCount).toBeGreaterThanOrEqual(0);
      expect(firstItem.publishedCount).toBeGreaterThanOrEqual(0);
      expect(firstItem.rejectedCount).toBeGreaterThanOrEqual(0);
      expect(firstItem.publishedCount + firstItem.rejectedCount).toBeLessThanOrEqual(firstItem.selectedCount);
    }
  });
  
  it('应该按入选数量降序排序', async () => {
    const result = await getMonthlyContribution(['2026-02']);
    
    if (result.length > 1) {
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].selectedCount).toBeGreaterThanOrEqual(result[i + 1].selectedCount);
      }
    }
  });
  
  it('空月份数组应该返回空数组', async () => {
    const result = await getMonthlyContribution([]);
    expect(result).toEqual([]);
  });
  
  it('不存在的月份应该返回空数组', async () => {
    const result = await getMonthlyContribution(['2099-12']);
    expect(result).toEqual([]);
  });
});
