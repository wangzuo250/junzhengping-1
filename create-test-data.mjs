import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { users, submissions, submissionTopics, submissionProjects, collectionForms } from './drizzle/schema.ts';
import { format } from 'date-fns';

const db = drizzle(process.env.DATABASE_URL);

async function createTestData() {
  console.log('开始创建测试数据...');

  // 1. 查找现有测试用户
  const testUsernames = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu'];
  const existingUsers = [];
  
  for (const username of testUsernames) {
    const result = await db.select().from(users).where(eq(users.username, username));
    if (result.length > 0) {
      existingUsers.push(result[0]);
      console.log(`找到用户: ${result[0].name} (ID: ${result[0].id})`);
    }
  }

  if (existingUsers.length === 0) {
    console.log('未找到测试用户，请先注册用户：zhangsan, lisi, wangwu, zhaoliu');
    return;
  }

  // 2. 创建或获取今天的收集表单
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDate = new Date(today);
  const title = `${format(todayDate, 'yyyy年MM月dd日')} 选题收集`;
  
  let formResult = await db.select().from(collectionForms).where(eq(collectionForms.formDate, todayDate));
  let formId;
  
  if (formResult.length === 0) {
    const insertResult = await db.insert(collectionForms).values({
      formDate: todayDate,
      title,
      createdBy: existingUsers[0].id,
    });
    formId = insertResult[0].insertId;
    console.log(`创建收集表单: ${title} (ID: ${formId})`);
  } else {
    formId = formResult[0].id;
    console.log(`使用现有表单: ${title} (ID: ${formId})`);
  }

  // 3. 为每个用户创建提交记录
  const testSubmissions = [
    {
      user: existingUsers[0],
      longTermPlan: '加强深度报道能力建设，培养调查记者团队',
      workSuggestion: '建议增加选题讨论会频次，每周至少两次',
      riskWarning: '注意涉及敏感话题的选题需要提前报备',
      topics: [
        {
          content: '地方政府债务风险调查',
          suggestedFormat: '钧评,长文',
          creativeIdea: '通过多地实地走访，收集一手数据，分析债务形成原因和化解路径',
          creator: existingUsers[0].name,
          relatedLink: 'https://example.com/debt-research',
        },
        {
          content: '新能源汽车产业链深度报道',
          suggestedFormat: '长文,短视频',
          creativeIdea: '从电池、芯片、整车制造等环节切入，展现产业链全貌',
          creator: `${existingUsers[0].name},${existingUsers[1]?.name || '李四'}`,
          relatedLink: '',
        },
      ],
      projects: [
        { projectName: '城市更新系列报道', progress: '已开始', note: '已完成3篇，计划10篇' },
        { projectName: '教育改革专题', progress: '未开始', note: '等待采访对象确认' },
      ],
    },
  ];

  // 如果有第二个用户
  if (existingUsers.length > 1) {
    testSubmissions.push({
      user: existingUsers[1],
      longTermPlan: '聚焦科技创新领域，打造品牌栏目',
      workSuggestion: '希望能配备专业摄像团队',
      riskWarning: '',
      topics: [
        {
          content: 'AI大模型应用落地调查',
          suggestedFormat: '长视频,记者实拍',
          creativeIdea: '走访多家企业，展示AI技术在不同行业的应用案例',
          creator: existingUsers[1].name,
          relatedLink: 'https://example.com/ai-application',
        },
        {
          content: '芯片国产化进程追踪',
          suggestedFormat: '钧评,长文,海报',
          creativeIdea: '梳理国产芯片发展历程，分析当前面临的挑战和机遇',
          creator: existingUsers[1].name,
          relatedLink: '',
        },
        {
          content: '量子计算商业化前景',
          suggestedFormat: '长文',
          creativeIdea: '采访量子计算领域专家，分析技术突破和商业应用',
          creator: `${existingUsers[1].name},${existingUsers[2]?.name || '王五'}`,
          relatedLink: '',
        },
      ],
      projects: [
        { projectName: '科技前沿系列', progress: '已开始', note: '每月2-3篇' },
      ],
    });
  }

  // 如果有第三个用户
  if (existingUsers.length > 2) {
    testSubmissions.push({
      user: existingUsers[2],
      longTermPlan: '深耕民生领域，关注社会热点',
      workSuggestion: '建议建立选题资源库，方便查重和参考',
      riskWarning: '医疗、教育类选题需要核实数据来源',
      topics: [
        {
          content: '养老服务体系调查',
          suggestedFormat: '长文,组图',
          creativeIdea: '走访多家养老机构，了解服务质量和存在问题',
          creator: existingUsers[2].name,
          relatedLink: '',
        },
        {
          content: '青年就业困境分析',
          suggestedFormat: '钧评,短视频',
          creativeIdea: '采访应届毕业生和HR，分析就业市场现状',
          creator: existingUsers[2].name,
          relatedLink: 'https://example.com/youth-employment',
        },
      ],
      projects: [
        { projectName: '民生观察', progress: '已开始', note: '长期跟踪项目' },
        { projectName: '社区治理创新', progress: '已结束', note: '已发布5篇报道' },
      ],
    });
  }

  // 如果有第四个用户
  if (existingUsers.length > 3) {
    testSubmissions.push({
      user: existingUsers[3],
      longTermPlan: '打造视频内容矩阵，提升传播力',
      workSuggestion: '建议购置更专业的拍摄设备',
      riskWarning: '',
      topics: [
        {
          content: '乡村振兴典型案例',
          suggestedFormat: '长视频,记者实拍,海报',
          creativeIdea: '选取3-5个典型村庄，展示振兴成果',
          creator: existingUsers[3].name,
          relatedLink: '',
        },
      ],
      projects: [
        { projectName: '美丽乡村行', progress: '已开始', note: '已拍摄2期' },
        { projectName: '非遗传承人系列', progress: '暂停', note: '等待资金到位' },
      ],
    });
  }

  // 4. 插入提交记录和子表数据
  for (const sub of testSubmissions) {
    const submissionResult = await db.insert(submissions).values({
      userId: sub.user.id,
      submitterName: sub.user.name,
      collectionFormId: formId,
      longTermPlan: sub.longTermPlan || null,
      workSuggestion: sub.workSuggestion || null,
      riskWarning: sub.riskWarning || null,
    });
    const submissionId = submissionResult[0].insertId;
    console.log(`创建提交记录: ${sub.user.name} (ID: ${submissionId})`);

    // 插入选题
    for (const topic of sub.topics) {
      await db.insert(submissionTopics).values({
        submissionId,
        content: topic.content || null,
        suggestedFormat: topic.suggestedFormat || null,
        creativeIdea: topic.creativeIdea || null,
        creator: topic.creator || null,
        relatedLink: topic.relatedLink || null,
      });
    }
    console.log(`  - 插入 ${sub.topics.length} 条选题`);

    // 插入项目进度
    for (const project of sub.projects) {
      await db.insert(submissionProjects).values({
        submissionId,
        projectName: project.projectName || null,
        progress: project.progress || null,
        note: project.note || null,
      });
    }
    console.log(`  - 插入 ${sub.projects.length} 个项目`);
  }

  console.log('\n测试数据创建完成！');
  console.log(`共为 ${testSubmissions.length} 个用户创建了选题数据`);
  console.log('\n测试账号信息（密码都是 password123）：');
  existingUsers.forEach(u => {
    console.log(`用户名: ${u.username}, 姓名: ${u.name}`);
  });
}

createTestData().catch(console.error).finally(() => process.exit(0));
