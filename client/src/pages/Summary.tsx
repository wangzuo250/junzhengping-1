import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { Calendar, Table as TableIcon, LayoutGrid } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Summary() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // 从URL参数获取日期
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const urlDate = urlParams.get('date');
  
  const [startDate, setStartDate] = useState(urlDate || format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(urlDate || format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  
  const { data, refetch } = trpc.submissions.getByDate.useQuery({ 
    startDate, 
    endDate: startDate === endDate ? undefined : endDate 
  });

  const addToSelectedMutation = trpc.selectedTopics.addFromSubmission.useMutation({
    onSuccess: () => {
      toast.success("已成功添加到入选选题");
    },
    onError: (error) => {
      toast.error(error.message || "添加失败");
    },
  });

  const handleAddToSelected = (submissionTopicId: number) => {
    if (!window.confirm("确认将此选题添加到入选选题？")) {
      return;
    }
    addToSelectedMutation.mutate({ submissionTopicId });
  };

  // 当URL日期参数变化时，更新选择的日期
  useEffect(() => {
    if (urlDate) {
      setStartDate(urlDate);
      setEndDate(urlDate);
    }
  }, [urlDate]);

  // 快捷查询：当周
  const handleThisWeek = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 周一开始
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // 周日结束
    setStartDate(format(weekStart, 'yyyy-MM-dd'));
    setEndDate(format(weekEnd, 'yyyy-MM-dd'));
  };

  // 快捷查询：当月
  const handleThisMonth = () => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    setStartDate(format(monthStart, 'yyyy-MM-dd'));
    setEndDate(format(monthEnd, 'yyyy-MM-dd'));
  };

  // 查询按钮点击
  const handleQuery = () => {
    // 验证日期范围（最多3个月）
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = differenceInDays(end, start);
    
    if (daysDiff < 0) {
      toast.error("结束日期不能早于开始日期");
      return;
    }
    
    if (daysDiff > 90) {
      toast.error("日期范围最多3个月（90天）");
      return;
    }
    
    refetch();
  };

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

  // 筛选后的数据
  const filteredSubmissions = data?.submissions.filter(s => 
    selectedUsers.size === 0 || selectedUsers.has(s.userId)
  ) || [];

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

  // 获取唯一用户列表（去重）
  const uniqueUsers = Array.from(
    new Map(
      (data?.submissions || []).map(s => [s.userId, { id: s.userId, name: s.submitterName }])
    ).values()
  );

  // 统计信息
  const totalTopics = filteredSubmissions.reduce((sum, s) => sum + s.topics.length, 0);
  const totalProjects = filteredSubmissions.reduce((sum, s) => sum + s.projects.length, 0);

  // 生成页面标题
  const pageTitle = startDate === endDate 
    ? `${startDate} 选题汇总`
    : `${startDate} 至 ${endDate} 选题汇总`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{pageTitle}</h1>
        <p className="text-muted-foreground mb-8">
          查看指定日期范围的选题提交情况，支持表格视图和数据筛选
        </p>

        {/* 日期选择与视图模式 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              日期选择与视图模式
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 日期范围选择 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">开始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">结束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleQuery} className="w-full">
                  查询
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleThisWeek} variant="outline" className="flex-1">
                  当周
                </Button>
                <Button onClick={handleThisMonth} variant="outline" className="flex-1">
                  当月
                </Button>
              </div>
            </div>

            {/* 视图切换 */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                onClick={() => setViewMode("table")}
                className="flex items-center gap-2"
              >
                <TableIcon className="w-4 h-4" />
                表格视图
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "outline"}
                onClick={() => setViewMode("card")}
                className="flex items-center gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                卡片视图
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 用户筛选 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>用户筛选</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {uniqueUsers.map(u => (
                <div key={u.id} className="flex items-center space-x-2">
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
              {selectedUsers.size > 0 && (
                <Button variant="ghost" size="sm" onClick={clearUserSelection}>
                  清空筛选
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">提交人数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">选题总数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTopics}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">项目总数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">显示记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredSubmissions.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* 表格视图 */}
        {viewMode === "table" && (
          <Card>
            <CardHeader>
              <CardTitle>表格视图</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSubmissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无数据</p>
              ) : (
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
                        <TableHead>长期策划</TableHead>
                        <TableHead>工作建议</TableHead>
                        <TableHead>风险提示</TableHead>
                        {user?.role === 'admin' && <TableHead>操作</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((submission) => {
                        const maxRows = Math.max(submission.topics.length, submission.projects.length, 1);
                        return Array.from({ length: maxRows }).map((_, rowIndex) => {
                          const topic = submission.topics[rowIndex];
                          const project = submission.projects[rowIndex];
                          const isFirstRow = rowIndex === 0;
                          
                          return (
                            <TableRow key={`${submission.id}-${rowIndex}`}>
                              {isFirstRow && (
                                <TableCell rowSpan={maxRows} className="align-top">
                                  {submission.submitterName}
                                </TableCell>
                              )}
                              <TableCell className="align-top">
                                {topic?.content || '-'}
                              </TableCell>
                              <TableCell className="align-top">
                                {topic?.suggestedFormat ? (
                                  <div className="flex flex-wrap gap-1">
                                    {topic.suggestedFormat.split(',').map((format, i) => (
                                      <Badge key={i} variant="secondary">{format}</Badge>
                                    ))}
                                  </div>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="align-top">
                                {topic?.creativeIdea || '-'}
                              </TableCell>
                              <TableCell className="align-top">
                                {topic?.creator || '-'}
                              </TableCell>
                              <TableCell className="align-top">
                                {topic?.relatedLink ? (
                                  <a 
                                    href={topic.relatedLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    链接
                                  </a>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="align-top">
                                {project ? (
                                  <div className="space-y-1">
                                    <div className="font-medium">{project.projectName || '-'}</div>
                                    {project.progress && (
                                      <Badge 
                                        variant={
                                          project.progress === '已开始' ? 'default' :
                                          project.progress === '已结束' ? 'secondary' :
                                          project.progress === '暂停' ? 'destructive' :
                                          'outline'
                                        }
                                      >
                                        {project.progress}
                                      </Badge>
                                    )}
                                    {project.note && (
                                      <div className="text-xs text-muted-foreground">{project.note}</div>
                                    )}
                                  </div>
                                ) : '-'}
                              </TableCell>
                              {isFirstRow && (
                                <>
                                  <TableCell rowSpan={maxRows} className="align-top">
                                    {submission.longTermPlan || '-'}
                                  </TableCell>
                                  <TableCell rowSpan={maxRows} className="align-top">
                                    {submission.workSuggestion || '-'}
                                  </TableCell>
                                  <TableCell rowSpan={maxRows} className="align-top">
                                    {submission.riskWarning || '-'}
                                  </TableCell>
                                </>
                              )}
                              {user?.role === 'admin' && topic && (
                                <TableCell className="align-top">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAddToSelected(topic.id)}
                                  >
                                    添加到入选
                                  </Button>
                                </TableCell>
                              )}
                              {user?.role === 'admin' && !topic && (
                                <TableCell className="align-top">-</TableCell>
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
          </Card>
        )}

        {/* 卡片视图 */}
        {viewMode === "card" && (
          <div className="space-y-6">
            {filteredSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">暂无数据</p>
                </CardContent>
              </Card>
            ) : (
              filteredSubmissions.map((submission) => (
                <Card key={submission.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{submission.submitterName} 的提交</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(submission.submittedAt), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 选题列表 */}
                    {submission.topics.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">选题列表</h3>
                        <div className="space-y-4">
                          {submission.topics.map((topic, index) => (
                            <div key={topic.id} className="border-l-4 border-blue-500 pl-4 py-2">
                              <div className="font-medium mb-2">选题 {index + 1}</div>
                              {topic.content && (
                                <div className="mb-2">
                                  <span className="text-sm text-muted-foreground">内容：</span>
                                  <span className="ml-2">{topic.content}</span>
                                </div>
                              )}
                              {topic.suggestedFormat && (
                                <div className="mb-2">
                                  <span className="text-sm text-muted-foreground">建议形式：</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {topic.suggestedFormat.split(',').map((format, i) => (
                                      <Badge key={i} variant="secondary">{format}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {topic.creativeIdea && (
                                <div className="mb-2">
                                  <span className="text-sm text-muted-foreground">创作思路：</span>
                                  <span className="ml-2">{topic.creativeIdea}</span>
                                </div>
                              )}
                              {topic.creator && (
                                <div className="mb-2">
                                  <span className="text-sm text-muted-foreground">创作者：</span>
                                  <span className="ml-2">{topic.creator}</span>
                                </div>
                              )}
                              {topic.relatedLink && (
                                <div className="mb-2">
                                  <span className="text-sm text-muted-foreground">相关链接：</span>
                                  <a 
                                    href={topic.relatedLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-600 hover:underline"
                                  >
                                    {topic.relatedLink}
                                  </a>
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
                        <h3 className="font-semibold mb-3">项目进度列表</h3>
                        <div className="space-y-4">
                          {submission.projects.map((project, index) => (
                            <div key={project.id} className="border-l-4 border-green-500 pl-4 py-2">
                              <div className="font-medium mb-2">项目 {index + 1}</div>
                              {project.projectName && (
                                <div className="mb-2">
                                  <span className="text-sm text-muted-foreground">项目名：</span>
                                  <span className="ml-2">{project.projectName}</span>
                                </div>
                              )}
                              {project.progress && (
                                <div className="mb-2">
                                  <span className="text-sm text-muted-foreground">进度：</span>
                                  <Badge 
                                    className="ml-2"
                                    variant={
                                      project.progress === '已开始' ? 'default' :
                                      project.progress === '已结束' ? 'secondary' :
                                      project.progress === '暂停' ? 'destructive' :
                                      'outline'
                                    }
                                  >
                                    {project.progress}
                                  </Badge>
                                </div>
                              )}
                              {project.note && (
                                <div className="mb-2">
                                  <span className="text-sm text-muted-foreground">备注：</span>
                                  <span className="ml-2">{project.note}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 其他信息 */}
                    {(submission.longTermPlan || submission.workSuggestion || submission.riskWarning) && (
                      <div>
                        <h3 className="font-semibold mb-3">其他信息</h3>
                        <div className="space-y-2">
                          {submission.longTermPlan && (
                            <div>
                              <span className="text-sm text-muted-foreground">长期策划：</span>
                              <p className="mt-1">{submission.longTermPlan}</p>
                            </div>
                          )}
                          {submission.workSuggestion && (
                            <div>
                              <span className="text-sm text-muted-foreground">工作建议：</span>
                              <p className="mt-1">{submission.workSuggestion}</p>
                            </div>
                          )}
                          {submission.riskWarning && (
                            <div>
                              <span className="text-sm text-muted-foreground">风险提示：</span>
                              <p className="mt-1">{submission.riskWarning}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
