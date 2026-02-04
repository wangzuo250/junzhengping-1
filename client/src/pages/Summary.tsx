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
import { format } from "date-fns";
import { Calendar, Table as TableIcon, LayoutGrid } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function Summary() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // 从URL参数获取日期
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const urlDate = urlParams.get('date');
  
  const [selectedDate, setSelectedDate] = useState(urlDate || format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  
  const { data, refetch } = trpc.submissions.getByDate.useQuery({ date: selectedDate });

  // 当URL日期参数变化时，更新选择的日期
  useEffect(() => {
    if (urlDate) {
      setSelectedDate(urlDate);
    }
  }, [urlDate]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">每日选题汇总</h1>
          <p className="text-muted-foreground">查看指定日期的选题提交情况，支持表格视图和数据筛选</p>
        </div>

        {/* 日期选择和视图切换 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              日期选择与视图模式
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="date">日期</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={() => refetch()}>查询</Button>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <TableIcon className="w-4 h-4 mr-1" />
                  表格视图
                </Button>
                <Button
                  variant={viewMode === "card" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                >
                  <LayoutGrid className="w-4 h-4 mr-1" />
                  卡片视图
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 用户筛选 */}
        {data && data.submissions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>用户筛选</CardTitle>
                {selectedUsers.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearUserSelection}>
                    清空筛选
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {Array.from(new Map(data.submissions.map(s => [s.userId, s])).values()).map((submission) => (
                  <div key={submission.userId} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${submission.userId}`}
                      checked={selectedUsers.has(submission.userId)}
                      onCheckedChange={() => toggleUserSelection(submission.userId)}
                    />
                    <label
                      htmlFor={`user-${submission.userId}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {submission.userName}
                    </label>
                  </div>
                ))}
              </div>
              {selectedUsers.size > 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  已选择 {selectedUsers.size} 个用户，显示 {filteredSubmissions.length} 条记录
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* 统计信息 */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  提交人数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedUsers.size === 0 ? data.submissions.length : selectedUsers.size}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  选题总数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredSubmissions.reduce((sum, s) => sum + s.topics.length, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  项目总数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredSubmissions.reduce((sum, s) => sum + s.projects.length, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  显示记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredSubmissions.length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 表格视图 */}
        {viewMode === "table" && data && (
          <Card>
            <CardHeader>
              <CardTitle>表格视图</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSubmissions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  {selectedUsers.size > 0 ? "筛选后无数据" : "该日期暂无提交记录"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">姓名</TableHead>
                        <TableHead className="min-w-[200px]">选题内容</TableHead>
                        <TableHead className="min-w-[150px]">建议形式</TableHead>
                        <TableHead className="min-w-[200px]">创作思路</TableHead>
                        <TableHead className="w-32">创作者</TableHead>
                        <TableHead className="min-w-[150px]">相关链接</TableHead>
                        <TableHead className="min-w-[150px]">项目进度</TableHead>
                        <TableHead className="min-w-[200px]">长期策划</TableHead>
                        <TableHead className="min-w-[200px]">工作建议</TableHead>
                        <TableHead className="min-w-[200px]">风险提示</TableHead>
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
                                <TableCell rowSpan={maxRows} className="align-top font-medium">
                                  {submission.userName}
                                </TableCell>
                              )}
                              <TableCell className="align-top">
                                {topic?.content || "-"}
                              </TableCell>
                              <TableCell className="align-top">
                                {topic?.suggestedFormat ? (
                                  <div className="flex flex-wrap gap-1">
                                    {topic.suggestedFormat.split(',').map((format, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {format.trim()}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="align-top">
                                {topic?.creativeIdea || "-"}
                              </TableCell>
                              <TableCell className="align-top">
                                {topic?.creator || "-"}
                              </TableCell>
                              <TableCell className="align-top">
                                {topic?.relatedLink ? (
                                  <a 
                                    href={topic.relatedLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline text-sm"
                                  >
                                    查看链接
                                  </a>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="align-top">
                                {project ? (
                                  <div className="space-y-1">
                                    {project.projectName && (
                                      <div className="text-sm font-medium">{project.projectName}</div>
                                    )}
                                    {project.progress && (
                                      <Badge 
                                        variant={
                                          project.progress === "已结束" ? "default" :
                                          project.progress === "已开始" ? "secondary" :
                                          project.progress === "暂停" ? "destructive" :
                                          "outline"
                                        }
                                        className="text-xs"
                                      >
                                        {project.progress}
                                      </Badge>
                                    )}
                                    {project.note && (
                                      <div className="text-xs text-muted-foreground">{project.note}</div>
                                    )}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              {isFirstRow && (
                                <>
                                  <TableCell rowSpan={maxRows} className="align-top">
                                    {submission.longTermPlan || "-"}
                                  </TableCell>
                                  <TableCell rowSpan={maxRows} className="align-top">
                                    {submission.workSuggestion || "-"}
                                  </TableCell>
                                  <TableCell rowSpan={maxRows} className="align-top">
                                    {submission.riskWarning || "-"}
                                  </TableCell>
                                </>
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

        {/* 卡片视图（保留原有实现） */}
        {viewMode === "card" && data && (
          <div className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {selectedUsers.size > 0 ? "筛选后无数据" : "该日期暂无提交记录"}
                </CardContent>
              </Card>
            ) : (
              filteredSubmissions.map((submission) => (
                <Card key={submission.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{submission.userName}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          提交时间：{format(new Date(submission.submittedAt), 'yyyy-MM-dd HH:mm:ss')}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            {submission.topics.length} 条选题
                          </span>
                          <span className="text-muted-foreground">
                            {submission.projects.length} 个项目
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-6 space-y-6">
                    {/* 基本信息 */}
                    {(submission.longTermPlan || submission.workSuggestion || submission.riskWarning) && (
                      <div className="space-y-3 border-t pt-4">
                        <h4 className="font-semibold text-sm">其他信息</h4>
                        {submission.longTermPlan && (
                          <div>
                            <Label className="text-xs text-muted-foreground">长期策划</Label>
                            <p className="text-sm mt-1">{submission.longTermPlan}</p>
                          </div>
                        )}
                        {submission.workSuggestion && (
                          <div>
                            <Label className="text-xs text-muted-foreground">工作建议</Label>
                            <p className="text-sm mt-1">{submission.workSuggestion}</p>
                          </div>
                        )}
                        {submission.riskWarning && (
                          <div>
                            <Label className="text-xs text-muted-foreground">风险提示</Label>
                            <p className="text-sm mt-1">{submission.riskWarning}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 选题列表 */}
                    {submission.topics.length > 0 && (
                      <div className="space-y-3 border-t pt-4">
                        <h4 className="font-semibold text-sm">选题列表</h4>
                        {submission.topics.map((topic, index) => (
                          <div key={topic.id} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                选题 {index + 1}
                              </span>
                            </div>
                            {topic.content && (
                              <div className="mb-2">
                                <Label className="text-xs text-muted-foreground">内容</Label>
                                <p className="text-sm mt-1">{topic.content}</p>
                              </div>
                            )}
                            {topic.suggestedFormat && (
                              <div className="mb-2">
                                <Label className="text-xs text-muted-foreground">建议形式</Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {topic.suggestedFormat.split(',').map((format, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {format.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {topic.creativeIdea && (
                              <div className="mb-2">
                                <Label className="text-xs text-muted-foreground">创作思路</Label>
                                <p className="text-sm mt-1">{topic.creativeIdea}</p>
                              </div>
                            )}
                            {topic.creator && (
                              <div className="mb-2">
                                <Label className="text-xs text-muted-foreground">创作者</Label>
                                <p className="text-sm mt-1">{topic.creator}</p>
                              </div>
                            )}
                            {topic.relatedLink && (
                              <div>
                                <Label className="text-xs text-muted-foreground">相关链接</Label>
                                <a 
                                  href={topic.relatedLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline mt-1 block"
                                >
                                  {topic.relatedLink}
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 项目进度列表 */}
                    {submission.projects.length > 0 && (
                      <div className="space-y-3 border-t pt-4">
                        <h4 className="font-semibold text-sm">项目进度</h4>
                        {submission.projects.map((project, index) => (
                          <div key={project.id} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                项目 {index + 1}
                              </span>
                              {project.progress && (
                                <Badge 
                                  variant={
                                    project.progress === "已结束" ? "default" :
                                    project.progress === "已开始" ? "secondary" :
                                    project.progress === "暂停" ? "destructive" :
                                    "outline"
                                  }
                                  className="text-xs"
                                >
                                  {project.progress}
                                </Badge>
                              )}
                            </div>
                            {project.projectName && (
                              <div className="mb-2">
                                <Label className="text-xs text-muted-foreground">项目名</Label>
                                <p className="text-sm mt-1">{project.projectName}</p>
                              </div>
                            )}
                            {project.note && (
                              <div>
                                <Label className="text-xs text-muted-foreground">备注</Label>
                                <p className="text-sm mt-1">{project.note}</p>
                              </div>
                            )}
                          </div>
                        ))}
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
