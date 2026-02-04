import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Plus, Trash2, Send, House, ChevronDown, ChevronUp } from "lucide-react";
import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

// 建议形式分类
const FORMAT_CATEGORIES = {
  文字类: ["钧评", "长文"],
  视频类: ["短视频", "长视频", "记者实拍"],
  图片类: ["海报", "组图", "漫画"],
};

interface TopicItem {
  id: string;
  content: string;
  suggestedFormat: string[];
  creativeIdea: string;
  creator: string;
  relatedLink: string;
}

interface ProjectItem {
  id: string;
  projectName: string;
  progress: "未开始" | "已开始" | "已结束" | "暂停" | "";
  note: string;
}

export default function TopicForm() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  // 主表单字段
  const [longTermPlan, setLongTermPlan] = useState("");
  const [workSuggestion, setWorkSuggestion] = useState("");
  const [riskWarning, setRiskWarning] = useState("");
  
  // 选题列表
  const [topics, setTopics] = useState<TopicItem[]>([
    { 
      id: crypto.randomUUID(), 
      content: "", 
      suggestedFormat: [], 
      creativeIdea: "",
      creator: "",
      relatedLink: "",
    }
  ]);
  
  // 项目进度列表
  const [projects, setProjects] = useState<ProjectItem[]>([
    { 
      id: crypto.randomUUID(), 
      projectName: "", 
      progress: "", 
      note: "",
    }
  ]);

  // 折叠状态
  const [topicsExpanded, setTopicsExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  // 其他类自定义输入
  const [customFormats, setCustomFormats] = useState<Record<string, string>>({});

  // 查询入选选题的项目名称列表（使用 myTopics 查询当前用户的入选选题）
  const { data: selectedTopicsData } = trpc.selectedTopics.myTopics.useQuery();

  // 提取所有唯一的项目名称
  const selectedProjectNames = useMemo(() => {
    if (!selectedTopicsData) return [];
    const names = new Set<string>();
    selectedTopicsData.forEach((topic: any) => {
      if (topic.content) {
        names.add(topic.content);
      }
    });
    return Array.from(names).sort();
  }, [selectedTopicsData]);

  const submitMutation = trpc.submissions.submit.useMutation({
    onSuccess: (data) => {
      toast.success(`成功提交！包含 ${data.topicCount} 条选题和 ${data.projectCount} 个项目进度`);
      // 重置表单
      setLongTermPlan("");
      setWorkSuggestion("");
      setRiskWarning("");
      setTopics([{ 
        id: crypto.randomUUID(), 
        content: "", 
        suggestedFormat: [], 
        creativeIdea: "",
        creator: "",
        relatedLink: "",
      }]);
      setProjects([{ 
        id: crypto.randomUUID(), 
        projectName: "", 
        progress: "", 
        note: "",
      }]);
      setCustomFormats({});
      // 跳转到汇总页面，带上当前日期参数
      const today = format(new Date(), 'yyyy-MM-dd');
      setLocation(`/summary?date=${today}`);
    },
    onError: (error) => {
      toast.error(`提交失败：${error.message}`);
    },
  });

  // 选题操作
  const addTopic = () => {
    setTopics([...topics, { 
      id: crypto.randomUUID(), 
      content: "", 
      suggestedFormat: [], 
      creativeIdea: "",
      creator: "",
      relatedLink: "",
    }]);
  };

  const removeTopic = (id: string) => {
    if (topics.length === 1) {
      toast.error("至少保留一条选题");
      return;
    }
    setTopics(topics.filter(t => t.id !== id));
  };

  const updateTopic = (id: string, field: keyof TopicItem, value: any) => {
    setTopics(topics.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const toggleFormat = (topicId: string, format: string) => {
    setTopics(topics.map(t => {
      if (t.id !== topicId) return t;
      const formats = t.suggestedFormat;
      if (formats.includes(format)) {
        return { ...t, suggestedFormat: formats.filter(f => f !== format) };
      } else {
        return { ...t, suggestedFormat: [...formats, format] };
      }
    }));
  };

  const toggleCustomFormat = (topicId: string) => {
    const customValue = customFormats[topicId]?.trim();
    if (!customValue) {
      toast.error("请输入自定义形式");
      return;
    }
    
    setTopics(topics.map(t => {
      if (t.id !== topicId) return t;
      const formats = t.suggestedFormat;
      if (formats.includes(customValue)) {
        return { ...t, suggestedFormat: formats.filter(f => f !== customValue) };
      } else {
        return { ...t, suggestedFormat: [...formats, customValue] };
      }
    }));
    
    // 清空输入框
    setCustomFormats({ ...customFormats, [topicId]: "" });
  };

  // 项目进度操作
  const addProject = () => {
    setProjects([...projects, { 
      id: crypto.randomUUID(), 
      projectName: "", 
      progress: "", 
      note: "",
    }]);
  };

  const removeProject = (id: string) => {
    if (projects.length === 1) {
      toast.error("至少保留一个项目进度");
      return;
    }
    setProjects(projects.filter(p => p.id !== id));
  };

  const updateProject = (id: string, field: keyof ProjectItem, value: any) => {
    setProjects(projects.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSubmit = () => {
    // 验证：至少一条选题和一个项目
    if (topics.length === 0) {
      toast.error("请至少添加一条选题");
      return;
    }
    // 项目进度改为非必选
    // if (projects.length === 0) {
    //   toast.error("请至少添加一个项目进度");
    //   return;
    // }

    submitMutation.mutate({
      longTermPlan: longTermPlan.trim() || undefined,
      workSuggestion: workSuggestion.trim() || undefined,
      riskWarning: riskWarning.trim() || undefined,
      topics: topics.map(t => ({
        content: t.content.trim() || undefined,
        suggestedFormat: t.suggestedFormat.length > 0 ? t.suggestedFormat : undefined,
        creativeIdea: t.creativeIdea.trim() || undefined,
        creator: t.creator.trim() || undefined,
        relatedLink: t.relatedLink.trim() || undefined,
      })),
      projects: projects.map(p => ({
        projectName: p.projectName.trim() || undefined,
        progress: p.progress || undefined,
        note: p.note.trim() || undefined,
      })),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>请先登录</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">您需要登录后才能填写选题</p>
            <Link href="/login">
              <Button className="w-full">前往登录</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="min-h-screen gradient-bg py-8">
      <div className="container max-w-5xl">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{today} 选题收集表</h1>
            <p className="text-muted-foreground mt-1">请填写今日选题和项目进度信息</p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              <House className="w-4 h-4 mr-2" />
              返回主页
            </Button>
          </Link>
        </div>

        {/* 主表单区域 */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="border-l-4 border-l-blue-500">
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="submitterName">提报人姓名</Label>
              <Input
                id="submitterName"
                value={user?.name || user?.username || ""}
                disabled
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* 选题列表区域 */}
        <Card className="mb-6 shadow-lg">
          <CardHeader 
            className="border-l-4 border-l-green-500 cursor-pointer"
            onClick={() => setTopicsExpanded(!topicsExpanded)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>选题列表 *</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  至少添加一条选题（子字段可选）
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    addTopic();
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加选题
                </Button>
                {topicsExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>
          </CardHeader>
          {topicsExpanded && (
            <CardContent className="space-y-6">
              {topics.map((topic, index) => (
                <div key={topic.id} className="border rounded-lg p-4 space-y-4 bg-card">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">选题 {index + 1}</h3>
                    {topics.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTopic(topic.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`content-${topic.id}`}>选题内容</Label>
                    <Textarea
                      id={`content-${topic.id}`}
                      placeholder="请输入选题内容..."
                      value={topic.content}
                      onChange={(e) => updateTopic(topic.id, "content", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>
                      建议形式
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        （可多选）
                      </span>
                    </Label>
                    
                    {/* 文字类 */}
                    <div>
                      <p className="text-sm font-medium mb-2">文字类</p>
                      <div className="flex flex-wrap gap-4">
                        {FORMAT_CATEGORIES.文字类.map(format => (
                          <div key={format} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${topic.id}-${format}`}
                              checked={topic.suggestedFormat.includes(format)}
                              onCheckedChange={() => toggleFormat(topic.id, format)}
                            />
                            <Label
                              htmlFor={`${topic.id}-${format}`}
                              className="font-normal cursor-pointer"
                            >
                              {format}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 视频类 */}
                    <div>
                      <p className="text-sm font-medium mb-2">视频类</p>
                      <div className="flex flex-wrap gap-4">
                        {FORMAT_CATEGORIES.视频类.map(format => (
                          <div key={format} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${topic.id}-${format}`}
                              checked={topic.suggestedFormat.includes(format)}
                              onCheckedChange={() => toggleFormat(topic.id, format)}
                            />
                            <Label
                              htmlFor={`${topic.id}-${format}`}
                              className="font-normal cursor-pointer"
                            >
                              {format}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 图片类 */}
                    <div>
                      <p className="text-sm font-medium mb-2">图片类</p>
                      <div className="flex flex-wrap gap-4">
                        {FORMAT_CATEGORIES.图片类.map(format => (
                          <div key={format} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${topic.id}-${format}`}
                              checked={topic.suggestedFormat.includes(format)}
                              onCheckedChange={() => toggleFormat(topic.id, format)}
                            />
                            <Label
                              htmlFor={`${topic.id}-${format}`}
                              className="font-normal cursor-pointer"
                            >
                              {format}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 其他类 */}
                    <div>
                      <p className="text-sm font-medium mb-2">其他类</p>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="输入自定义形式..."
                          value={customFormats[topic.id] || ""}
                          onChange={(e) => setCustomFormats({ 
                            ...customFormats, 
                            [topic.id]: e.target.value 
                          })}
                          className="max-w-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCustomFormat(topic.id)}
                        >
                          添加
                        </Button>
                      </div>
                      {/* 显示已添加的自定义形式 */}
                      {topic.suggestedFormat.filter(f => 
                        !Object.values(FORMAT_CATEGORIES).flat().includes(f)
                      ).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {topic.suggestedFormat.filter(f => 
                            !Object.values(FORMAT_CATEGORIES).flat().includes(f)
                          ).map(format => (
                            <div key={format} className="flex items-center space-x-2 bg-muted px-3 py-1 rounded">
                              <span className="text-sm">{format}</span>
                              <button
                                type="button"
                                onClick={() => toggleFormat(topic.id, format)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`creativeIdea-${topic.id}`}>创作思路</Label>
                    <Textarea
                      id={`creativeIdea-${topic.id}`}
                      placeholder="请输入创作思路..."
                      value={topic.creativeIdea}
                      onChange={(e) => updateTopic(topic.id, "creativeIdea", e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`creator-${topic.id}`}>创作者</Label>
                    <Input
                      id={`creator-${topic.id}`}
                      placeholder="请输入创作者姓名..."
                      value={topic.creator}
                      onChange={(e) => updateTopic(topic.id, "creator", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`relatedLink-${topic.id}`}>相关链接</Label>
                    <Input
                      id={`relatedLink-${topic.id}`}
                      placeholder="请输入相关链接..."
                      value={topic.relatedLink}
                      onChange={(e) => updateTopic(topic.id, "relatedLink", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* 项目进度列表区域 */}
        <Card className="mb-6 shadow-lg">
          <CardHeader 
            className="border-l-4 border-l-orange-500 cursor-pointer"
            onClick={() => setProjectsExpanded(!projectsExpanded)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>项目进度</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  可选填写项目进度（子字段可选）
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    addProject();
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加项目
                </Button>
                {projectsExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>
          </CardHeader>
          {projectsExpanded && (
            <CardContent className="space-y-4">
              {projects.map((project, index) => (
                <div key={project.id} className="border rounded-lg p-4 space-y-4 bg-card">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">项目 {index + 1}</h3>
                    {projects.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProject(project.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`projectName-${project.id}`}>项目名</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`projectName-${project.id}`}
                        placeholder="请输入项目名称..."
                        value={project.projectName}
                        onChange={(e) => updateProject(project.id, "projectName", e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        value=""
                        onValueChange={(value) => updateProject(project.id, "projectName", value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="从入选选择" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProjectNames.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`progress-${project.id}`}>进度</Label>
                    <Select
                      value={project.progress}
                      onValueChange={(value) => updateProject(project.id, "progress", value as any)}
                    >
                      <SelectTrigger id={`progress-${project.id}`}>
                        <SelectValue placeholder="请选择进度" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="未开始">未开始</SelectItem>
                        <SelectItem value="已开始">已开始</SelectItem>
                        <SelectItem value="已结束">已结束</SelectItem>
                        <SelectItem value="暂停">暂停</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`note-${project.id}`}>备注</Label>
                    <Textarea
                      id={`note-${project.id}`}
                      placeholder="请输入备注信息..."
                      value={project.note}
                      onChange={(e) => updateProject(project.id, "note", e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* 其他信息区域 */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="border-l-4 border-l-purple-500">
            <CardTitle>其他信息（可选）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="longTermPlan">长期策划</Label>
              <Textarea
                id="longTermPlan"
                placeholder="请输入长期策划内容..."
                value={longTermPlan}
                onChange={(e) => setLongTermPlan(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workSuggestion">工作建议</Label>
              <Textarea
                id="workSuggestion"
                placeholder="请输入工作建议..."
                value={workSuggestion}
                onChange={(e) => setWorkSuggestion(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskWarning">风险提示</Label>
              <Textarea
                id="riskWarning"
                placeholder="请输入风险提示..."
                value={riskWarning}
                onChange={(e) => setRiskWarning(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-4">
          <Link href="/">
            <Button variant="outline">
              取消
            </Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="min-w-32"
          >
            {submitMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                提交中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                提交
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
