import ExcelJS from 'exceljs';
import * as db from './db';

export async function generateExcelReport(userRole: string, selectedMonths: string[]) {
  const workbook = new ExcelJS.Workbook();
  
  // 工作表1：项目进度表
  const progressSheet = workbook.addWorksheet('项目进度表');
  progressSheet.columns = [
    { header: '选题内容', key: 'content', width: 40 },
    { header: '提报人', key: 'submitters', width: 15 },
    { header: '建议形式', key: 'suggestion', width: 12 },
    { header: '领导点评', key: 'leaderComment', width: 30 },
    { header: '创作人', key: 'creators', width: 15 },
    { header: '进度', key: 'progress', width: 10 },
    { header: '状态', key: 'status', width: 10 },
    { header: '备注', key: 'remark', width: 30 },
    { header: '入选日期', key: 'selectedDate', width: 12 },
  ];

  // 获取所有入选选题
  const allTopics = await db.getSelectedTopics();
  allTopics.forEach(topic => {
    progressSheet.addRow({
      content: topic.content,
      submitters: topic.submitters,
      suggestion: topic.suggestion || '',
      leaderComment: topic.leaderComment || '',
      creators: topic.creators || '',
      progress: topic.progress,
      status: topic.status,
      remark: topic.remark || '',
      selectedDate: topic.selectedDate.toISOString().split('T')[0],
    });
  });

  // 设置表头样式
  progressSheet.getRow(1).font = { bold: true };
  progressSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // 工作表2：月度贡献排行
  const contributionSheet = workbook.addWorksheet('月度贡献排行');
  contributionSheet.columns = [
    { header: '排名', key: 'rank', width: 8 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '入选数量', key: 'selectedCount', width: 12 },
    { header: '发布数量', key: 'publishedCount', width: 12 },
    { header: '否决数量', key: 'rejectedCount', width: 12 },
    { header: '发布率', key: 'publishRate', width: 12 },
  ];

  // 获取月度贡献数据
  const contributionData = await db.getMonthlyContribution(selectedMonths);
  
  // 权限控制：普通用户只导出前5名
  const exportData = userRole === 'admin' ? contributionData : contributionData.slice(0, 5);
  
  exportData.forEach((item, index) => {
    contributionSheet.addRow({
      rank: index + 1,
      name: item.name,
      selectedCount: item.selectedCount,
      publishedCount: item.publishedCount,
      rejectedCount: item.rejectedCount,
      publishRate: `${item.publishRate}%`,
    });
  });

  contributionSheet.getRow(1).font = { bold: true };
  contributionSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // 工作表3：统计汇总
  const statsSheet = workbook.addWorksheet('统计汇总');
  
  const stats = await db.getSelectedTopicsStats();
  if (stats) {
    statsSheet.addRow(['项目进度统计']);
    statsSheet.addRow(['未开始', stats.notStarted]);
    statsSheet.addRow(['进行中', stats.inProgress]);
    statsSheet.addRow(['已完成', stats.completed]);
    statsSheet.addRow(['已暂停', stats.paused]);
    statsSheet.addRow([]);
    
    statsSheet.addRow(['状态统计']);
    statsSheet.addRow(['未发布', stats.notPublished]);
    statsSheet.addRow(['已发布', stats.published]);
    statsSheet.addRow(['否决', stats.rejected]);
    statsSheet.addRow([]);
    
    const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0.0';
    const publishRate = stats.total > 0 ? ((stats.published / stats.total) * 100).toFixed(1) : '0.0';
    
    statsSheet.addRow(['完成率', `${completionRate}%`]);
    statsSheet.addRow(['发布率', `${publishRate}%`]);
  }

  statsSheet.getColumn(1).width = 20;
  statsSheet.getColumn(2).width = 15;

  // 生成 Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
