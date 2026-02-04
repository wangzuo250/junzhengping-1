import ExcelJS from 'exceljs';

interface ExportParams {
  contribution: Array<{
    userId: number;
    name: string;
    selectedCount: number;
    publishedCount: number;
    publishRate: string;
  }>;
  progressStats: Record<string, number>;
  statusStats: Record<string, number>;
  monthKeys: string[];
}

export async function generateExcelReport(params: ExportParams): Promise<Buffer> {
  const { contribution, progressStats, statusStats, monthKeys } = params;
  const workbook = new ExcelJS.Workbook();
  
  // 工作表1：月度贡献排行
  const contributionSheet = workbook.addWorksheet('月度贡献排行');
  contributionSheet.columns = [
    { header: '排名', key: 'rank', width: 8 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '入选数量', key: 'selectedCount', width: 12 },
    { header: '发布数量', key: 'publishedCount', width: 12 },
    { header: '发布率', key: 'publishRate', width: 12 },
  ];

  contribution.forEach((item, index) => {
    contributionSheet.addRow({
      rank: index + 1,
      name: item.name,
      selectedCount: item.selectedCount,
      publishedCount: item.publishedCount,
      publishRate: item.publishRate,
    });
  });

  contributionSheet.getRow(1).font = { bold: true };
  contributionSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // 工作表2：项目进度统计
  const progressSheet = workbook.addWorksheet('项目进度统计');
  progressSheet.columns = [
    { header: '进度', key: 'progress', width: 15 },
    { header: '数量', key: 'count', width: 12 },
  ];

  Object.entries(progressStats).forEach(([progress, count]) => {
    progressSheet.addRow({ progress, count });
  });

  progressSheet.getRow(1).font = { bold: true };
  progressSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // 工作表3：状态统计
  const statusSheet = workbook.addWorksheet('状态统计');
  statusSheet.columns = [
    { header: '状态', key: 'status', width: 15 },
    { header: '数量', key: 'count', width: 12 },
  ];

  Object.entries(statusStats).forEach(([status, count]) => {
    statusSheet.addRow({ status, count });
  });

  statusSheet.getRow(1).font = { bold: true };
  statusSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // 工作表4：统计汇总
  const statsSheet = workbook.addWorksheet('统计汇总');
  statsSheet.columns = [
    { header: '统计项', key: 'item', width: 20 },
    { header: '数值', key: 'value', width: 15 },
  ];

  const total = Object.values(progressStats).reduce((sum, count) => sum + count, 0);
  const completed = progressStats['已完成'] || 0;
  const published = statusStats['已发布'] || 0;
  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%';
  const publishRate = total > 0 ? ((published / total) * 100).toFixed(1) + '%' : '0%';

  statsSheet.addRow({ item: '统计月份', value: monthKeys.join(', ') });
  statsSheet.addRow({ item: '入选选题总数', value: total });
  statsSheet.addRow({ item: '已完成数量', value: completed });
  statsSheet.addRow({ item: '已发布数量', value: published });
  statsSheet.addRow({ item: '完成率', value: completionRate });
  statsSheet.addRow({ item: '发布率', value: publishRate });

  statsSheet.getRow(1).font = { bold: true };
  statsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
