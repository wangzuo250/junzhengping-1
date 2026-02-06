import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Calendar, Table as TableIcon, LayoutGrid, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// 入选状态单元格组件
function SelectedStatusCell({ topicId }: { topicId: number }) {
  const utils = trpc.useUtils();
  const { data: checkResult } = trpc.selectedTopics.checkSelected.useQuery({ submissionTopicId: topicId });
  const removeFromSelectedMutation = trpc.selectedTopics.removeFromSelected.useMutation({
    onSuccess: () => {
      toast.success("已移除入选");
      utils.selectedTopics.checkSelected.invalidate({ submissionTopicId: topicId });
    },
    onError: (error) => {
      toast.error(error.message || "移除失败");
    },
  });
  const addToSelectedMutation = trpc.selectedTopics.addFromSubmission.useMutation({
    onSuccess: () => {
      toast.success("已成功添加到入选选题");
      utils.selectedTopics.checkSelected.invalidate({ submissionTopicId: topicId });
    },
    onError: (error) => {
      toast.error(error.message || "添加失败");
    },
  });

  const handleAddToSelected = () => {
    if (!window.confirm("确认将此选题添加到入选选题？")) {
      return;
    }
    addToSelectedMutation.mutate({ submissionTopicId: topicId });
  };

  const handleRemoveFromSelected = () => {
    if (!window.confirm("确认移除此入选选题？")) {
      return;
    }
    removeFromSelectedMutation.mutate({ submissionTopicId: topicId });
  };

  if (!checkResult) {
    return <div className="text-sm text-gray-400">加载中...</div>;
  }

  if (checkResult.isSelected) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled
          className="bg-gray-100 text-gray-500 cursor-not-allowed"
        >
          已入选
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRemoveFromSelected}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          移除
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleAddToSelected}
    >
      添加到入选
    </Button>
  );
}

// 建议形式徽章颜色映射
const formatColorMap: Record<string, string> = {
  "钧评": "bg-blue-100 text-blue-800",
  "长文": "bg-purple-100 text-purple-800",
  "短视频": "bg-pink-100 text-pink-800",
  "长视频": "bg-red-100 text-red-800",
  "记者实拍": "bg-orange-100 text-orange-800",
  "海报": "bg-green-100 text-green-800",
  "组图": "bg-teal-100 text-teal-800",
  "漫画": "bg-cyan-100 text-cyan-800",
};

// 项目进度徽章颜色映射
const progressColorMap: Record<string, string> = {
  "未开始": "bg-gray-100 text-gray-800",
  "已开始": "bg-blue-100 text-blue-800",
  "已结束": "bg-green-100 text-green-800",
  "暂停": "bg-yellow-100 text-yellow-800",
};

export default function Summary() {
  const { user, isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const { data, refetch } = trpc.submissions.getAll.useQuery();

  const toggleUserSelection = (userId: number) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const clearUserSelection = () => {
    setSelectedUsers(new Set());
  };

  const toggleDateExpanded = (date: string) => {
    const newSet = new Set(expandedDates);
    if (newSet.has(date)) {
      newSet.delete(date);
    } else {
      newSet.add(date);
    }
    setExpandedDates(newSet);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>需要登录</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">请先登录后查看汇总</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">加载中...</div>
        </div>
      </div>
    );
  }

  const groupedSubmissions = data.groupedSubmissions;
  
  // 获取所有日期并按倒序排列（最新日期在上）
  const allDates = Object.keys(groupedSubmissions).sort((a, b) => b.localeCompare(a));

  // 获取所有提交数据（用于筛选）
  const allSubmissions = allDates.flatMap(date => groupedSubmissions[date]);

  // 筛选后的数据
  const filteredDates = allDates.filter(date => {
    if (selectedUsers.size === 0) return true;
    return groupedSubmissions[date].some((s: any) => selectedUsers.has(s.userId));
  });

  // 获取唯一用户列表（去重）
  const uniqueUsers = Array.from(
    new Map(
      allSubmissions.map((s: any) => [s.userId, { id: s.userId, name: s.userName }])
    ).values()
  );

  // 统计信息
  const filteredSubmissions = filteredDates.flatMap(date => 
    groupedSubmissions[date].filter((s: any) => 
      selectedUsers.size === 0 || selectedUsers.has(s.userId)
    )
  );
  const totalTopics = filteredSubmissions.reduce((sum: number, s: any) => sum + s.topics.length, 0);
  const totalProjects = filteredSubmissions.reduce((sum: number, s: any) => sum + s.projects.length, 0);
  // 修复：统计去重后的用户数，而不是提交记录数
  const uniqueUserCount = new Set(filteredSubmissions.map((s: any) => s.userId)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              选题汇总
            </h1>
          </div>
          <p className="text-gray-600 ml-7">查看所有历史选题提交记录</p>
        </div>

        {/* 筛选和视图切换 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-lg">数据筛选</CardTitle>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "card")}>
                <TabsList>
                  <TabsTrigger value="card" className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    卡片视图
                  </TabsTrigger>
                  <TabsTrigger value="table" className="flex items-center gap-2">
                    <TableIcon className="h-4 w-4" />
                    表格视图
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {/* 用户筛选 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">按提交人筛选</h3>
                {selectedUsers.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearUserSelection}>
                    清空筛选
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {uniqueUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`user-${u.id}`}
                      checked={selectedUsers.has(u.id)}
                      onCheckedChange={() => toggleUserSelection(u.id)}
                    />
                    <label htmlFor={`user-${u.id}`} className="text-sm cursor-pointer">
                      {u.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 统计信息 */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">提交人数</div>
                <div className="text-2xl font-bold text-blue-600">{uniqueUserCount}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">选题总数</div>
                <div className="text-2xl font-bold text-purple-600">{totalTopics}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">项目总数</div>
                <div className="text-2xl font-bold text-green-600">{totalProjects}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">显示日期</div>
                <div className="text-2xl font-bold text-orange-600">{filteredDates.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 按日期分组显示 */}
        {filteredDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              暂无数据
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDates.map((date, dateIndex) => {
              const dateSubmissions = groupedSubmissions[date].filter((s: any) =>
                selectedUsers.size === 0 || selectedUsers.has(s.userId)
              );
              
              // 双色交替：偶数索引用浅蓝色，奇数索引用白色
              const bgColor = dateIndex % 2 === 0 ? "bg-blue-50/50" : "bg-white";
              const isExpanded = expandedDates.has(date);

              return (
                <Card key={date} className={`${bgColor} border-2`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-xl">
                          {new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long'
                          })}
                        </CardTitle>
                        <Badge variant="secondary">
                          {new Set(dateSubmissions.map((s: any) => s.userId)).size} 人提交
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDateExpanded(date)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            展开
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent>
                      {viewMode === "card" ? (
                        // 卡片视图
                        <div className="space-y-4">
                          {dateSubmissions.map((submission: any) => (
                            <Card key={submission.id} className="bg-white">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg">{submission.userName}</CardTitle>
                                  <span className="text-sm text-gray-500">
                                    {new Date(submission.submittedAt).toLocaleTimeString('zh-CN', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* 选题列表 */}
                                {submission.topics.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2">选题列表</h4>
                                    <div className="space-y-3">
                                      {submission.topics.map((topic: any) => (
                                        <div key={topic.id} className="border rounded-lg p-3 bg-gray-50">
                                          {topic.content && (
                                            <div className="mb-2">
                                              <span className="font-medium">内容：</span>
                                              <span className="whitespace-pre-wrap">{topic.content}</span>
                                            </div>
                                          )}
                                          {topic.suggestedFormat && (
                                            <div className="mb-2 flex flex-wrap gap-1">
                                              <span className="font-medium">建议形式：</span>
                                              {topic.suggestedFormat.split(',').map((format: string, i: number) => (
                                                <Badge key={i} className={formatColorMap[format.trim()] || "bg-gray-100 text-gray-800"}>
                                                  {format.trim()}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                          {topic.creativeIdea && (
                                            <div className="mb-2">
                                              <span className="font-medium">创作思路：</span>
                                              <span className="whitespace-pre-wrap">{topic.creativeIdea}</span>
                                            </div>
                                          )}
                                          {topic.creator && (
                                            <div className="mb-2">
                                              <span className="font-medium">创作者：</span>
                                              <span>{topic.creator}</span>
                                            </div>
                                          )}
                                          {topic.relatedLink && (
                                            <div className="mb-2">
                                              <span className="font-medium">相关链接：</span>
                                              <a href={topic.relatedLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {topic.relatedLink}
                                              </a>
                                            </div>
                                          )}
                                          {user?.role === 'admin' && (
                                            <div className="mt-2">
                                              <SelectedStatusCell topicId={topic.id} />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* 项目进度列表 */}
                                {submission.projects.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2">项目进度</h4>
                                    <div className="space-y-2">
                                      {submission.projects.map((project: any) => (
                                        <div key={project.id} className="flex items-center gap-2 text-sm">
                                          {project.projectName && <span className="font-medium">{project.projectName}</span>}
                                          {project.progress && (
                                            <Badge className={progressColorMap[project.progress] || "bg-gray-100 text-gray-800"}>
                                              {project.progress}
                                            </Badge>
                                          )}
                                          {project.note && <span className="text-gray-600">({project.note})</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* 其他信息 */}
                                {(submission.longTermPlan || submission.workSuggestion || submission.riskWarning) && (
                                  <div className="border-t pt-3 space-y-2">
                                    {submission.longTermPlan && (
                                      <div>
                                        <span className="font-medium text-sm">长期策划：</span>
                                        <span className="text-sm whitespace-pre-wrap">{submission.longTermPlan}</span>
                                      </div>
                                    )}
                                    {submission.workSuggestion && (
                                      <div>
                                        <span className="font-medium text-sm">工作建议：</span>
                                        <span className="text-sm whitespace-pre-wrap">{submission.workSuggestion}</span>
                                      </div>
                                    )}
                                    {submission.riskWarning && (
                                      <div>
                                        <span className="font-medium text-sm">风险提示：</span>
                                        <span className="text-sm whitespace-pre-wrap">{submission.riskWarning}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        // 表格视图
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>姓名</TableHead>
                                <TableHead>选题内容</TableHead>
                                <TableHead>建议形式</TableHead>
                                <TableHead>创作思路</TableHead>
                                <TableHead>创作者</TableHead>
                                <TableHead>相关链接</TableHead>
                                <TableHead>项目进度</TableHead>
                                <TableHead>其他信息</TableHead>
                                {user?.role === 'admin' && <TableHead>操作</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dateSubmissions.map((submission: any) => {
                                const maxRows = Math.max(submission.topics.length, submission.projects.length, 1);
                                return Array.from({ length: maxRows }).map((_, rowIndex) => {
                                  const topic = submission.topics[rowIndex];
                                  const project = submission.projects[rowIndex];
                                  const isFirstRow = rowIndex === 0;

                                  return (
                                    <TableRow key={`${submission.id}-${rowIndex}`}>
                                      {isFirstRow && (
                                        <TableCell rowSpan={maxRows} className="align-top font-medium">
                                          {submission.userName}
                                        </TableCell>
                                      )}
                                      <TableCell className="whitespace-pre-wrap max-w-xs">
                                        {topic?.content || "-"}
                                      </TableCell>
                                      <TableCell>
                                        {topic?.suggestedFormat ? (
                                          <div className="flex flex-wrap gap-1">
                                            {topic.suggestedFormat.split(',').map((format: string, i: number) => (
                                              <Badge key={i} className={formatColorMap[format.trim()] || "bg-gray-100 text-gray-800"}>
                                                {format.trim()}
                                              </Badge>
                                            ))}
                                          </div>
                                        ) : "-"}
                                      </TableCell>
                                      <TableCell className="whitespace-pre-wrap max-w-xs">
                                        {topic?.creativeIdea || "-"}
                                      </TableCell>
                                      <TableCell>{topic?.creator || "-"}</TableCell>
                                      <TableCell className="max-w-xs">
                                        {topic?.relatedLink ? (
                                          <a href={topic.relatedLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                                            {topic.relatedLink}
                                          </a>
                                        ) : "-"}
                                      </TableCell>
                                      <TableCell>
                                        {project ? (
                                          <div className="space-y-1">
                                            {project.projectName && <div className="font-medium text-sm">{project.projectName}</div>}
                                            {project.progress && (
                                              <Badge className={progressColorMap[project.progress] || "bg-gray-100 text-gray-800"}>
                                                {project.progress}
                                              </Badge>
                                            )}
                                            {project.note && <div className="text-xs text-gray-600">{project.note}</div>}
                                          </div>
                                        ) : "-"}
                                      </TableCell>
                                      {isFirstRow && (
                                        <TableCell rowSpan={maxRows} className="align-top max-w-xs">
                                          <div className="space-y-2 text-sm">
                                            {submission.longTermPlan && (
                                              <div>
                                                <span className="font-medium">长期策划：</span>
                                                <span className="whitespace-pre-wrap">{submission.longTermPlan}</span>
                                              </div>
                                            )}
                                            {submission.workSuggestion && (
                                              <div>
                                                <span className="font-medium">工作建议：</span>
                                                <span className="whitespace-pre-wrap">{submission.workSuggestion}</span>
                                              </div>
                                            )}
                                            {submission.riskWarning && (
                                              <div>
                                                <span className="font-medium">风险提示：</span>
                                                <span className="whitespace-pre-wrap">{submission.riskWarning}</span>
                                              </div>
                                            )}
                                            {!submission.longTermPlan && !submission.workSuggestion && !submission.riskWarning && "-"}
                                          </div>
                                        </TableCell>
                                      )}
                                      {user?.role === 'admin' && (
                                        <TableCell>
                                          {topic && <SelectedStatusCell topicId={topic.id} />}
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  );
                                });
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
