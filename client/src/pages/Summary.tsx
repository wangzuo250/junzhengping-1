import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Summary() {
  const { user, isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<number>>(new Set());
  
  const { data, refetch } = trpc.submissions.getByDate.useQuery({ date: selectedDate });

  const toggleExpanded = (id: number) => {
    const newSet = new Set(expandedSubmissions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSubmissions(newSet);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">每日选题汇总</h1>
          <p className="text-muted-foreground">查看指定日期的选题提交情况</p>
        </div>

        {/* 日期选择器 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              选择日期
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* 汇总信息 */}
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    提交人数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.submissions.length}</div>
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
                    {data.submissions.reduce((sum, s) => sum + s.topics.length, 0)}
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
                    {data.submissions.reduce((sum, s) => sum + s.projects.length, 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 提交列表 */}
            <div className="space-y-4">
              {data.submissions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    该日期暂无提交记录
                  </CardContent>
                </Card>
              ) : (
                data.submissions.map((submission) => {
                  const isExpanded = expandedSubmissions.has(submission.id);
                  return (
                    <Card key={submission.id} className="overflow-hidden">
                      <CardHeader 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleExpanded(submission.id)}
                      >
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
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </CardHeader>
                      
                      {isExpanded && (
                        <CardContent className="pt-0 space-y-6">
                          {/* 基本信息 */}
                          {(submission.longTermPlan || submission.workSuggestion || submission.riskWarning) && (
                            <div className="space-y-3 border-t pt-4">
                              <h4 className="font-semibold text-sm">基本信息</h4>
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
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
