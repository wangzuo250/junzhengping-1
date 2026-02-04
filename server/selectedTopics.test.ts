import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { format } from 'date-fns';

describe('Selected Topics - Check Function', () => {
  let testSubmissionTopicId: number;
  let testSelectedTopicId: number;

  beforeAll(async () => {
    // 使用已存在的 submissionTopicId 进行测试
    // 从数据库中获取一个真实的 submissionTopicId
    testSubmissionTopicId = 30001; // 这是一个已知存在的 ID
  });

  it('should add a topic to selected topics with correct sourceSubmissionId', async () => {
    // 添加到入选
    testSelectedTopicId = await db.createSelectedTopic({
      content: '测试入选功能的选题',
      suggestion: '视频',
      submitters: '测试用户',
      selectedDate: new Date(),
      monthKey: format(new Date(), 'yyyy-MM'),
      sourceSubmissionId: testSubmissionTopicId,
      createdBy: 1,
      progress: '未开始',
      status: '未发布',
    });

    expect(testSelectedTopicId).toBeGreaterThan(0);
  });

  it('should check if a topic is selected by submissionTopicId', async () => {
    // 检查是否已入选
    const selectedTopic = await db.getSelectedTopicBySourceId(testSubmissionTopicId);
    
    expect(selectedTopic).not.toBeNull();
    expect(selectedTopic?.id).toBe(testSelectedTopicId);
    expect(selectedTopic?.sourceSubmissionId).toBe(testSubmissionTopicId);
  });

  it('should return null for non-selected topics', async () => {
    // 检查一个不存在的 submissionTopicId
    const nonExistentId = 999999;
    const selectedTopic = await db.getSelectedTopicBySourceId(nonExistentId);
    
    expect(selectedTopic).toBeNull();
  });

  afterAll(async () => {
    // 清理测试数据
    if (testSelectedTopicId) {
      await db.deleteSelectedTopic(testSelectedTopicId);
    }
  });
});
