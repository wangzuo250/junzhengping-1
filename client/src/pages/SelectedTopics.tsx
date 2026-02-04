import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Edit, BarChart3, Trash2, Filter, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function SelectedTopics() {
  const { user, isAuthenticated } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    content: "",
    suggestion: "",
  });
  const [selectedSubmitters, setSelectedSubmitters] = useState<number[]>([]);
  
  // 筛选状态
  const [filters, setFilters] = useState({
    submitters: [] as string[], // 改为数组，支持多选
    startDate: "",
    endDate: "",
    progress: "" as "" | "未开始" | "进行中" | "已完成" | "已暂停",
    status: "" as "" | "未发布" | "已发布" | "否决",
  });
  const [showSubmitterFilter, setShowSubmitterFilter] = useState(false);
  const [editForm, setEditForm] = useState({
    leaderComment: "",
    creators: "",
    progress: "未开始" as "未开始" | "进行中" | "已完成" | "已暂停",
    status: "未发布" as "未发布" | "已发布" | "否决",
    remark: "",
    content: "",
    suggestion: "",
  });

  const { data: topics, refetch } = trpc.selectedTopics.listAll.useQuery();
  const monthKeys = Array.from(new Set(topics?.map((t: any) => t.monthKey) || [])).sort((a, b) => b.localeCompare(a));
  const { data: users } = trpc.users.list.useQuery();
  
  const createMutation = trpc.selectedTopics.create.useMutation({
    onSuccess: () => {
      toast.success("创建成功");
      setShowCreateDialog(false);
      setCreateForm({ content: "", suggestion: "" });
      setSelectedSubmitters([]);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });

  const updateMutation = trpc.selectedTopics.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功");
      setEditingTopic(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  const deleteMutation = trpc.selectedTopics.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const handleEdit = (topic: any) => {
    setEditingTopic(topic);
    setEditForm({
      leaderComment: topic.leaderComment || "",
      creators: topic.creators || "",
      progress: topic.progress,
      status: topic.status,
      remark: topic.remark || "",
      content: topic.content,
      suggestion: topic.suggestion || "",
    });
  };

  const handleSave = () => {
    if (!editingTopic) return;

    const data: any = {
      leaderComment: editForm.leaderComment,
      creators: editForm.creators,
      progress: editForm.progress,
      status: editForm.status,
      remark: editForm.remark,
    };

    // 管理员可以编辑所有字段
    if (user?.role === "admin") {
      data.content = editForm.content;
      data.suggestion = editForm.suggestion;
    }

    updateMutation.mutate({
      id: editingTopic.id,
      data,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这条入选选题吗？")) {
      deleteMutation.mutate({ id });
    }
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
          </Card>
        </div>
      </div>
    );
  }

  // 筛选和排序
  const filteredAndSortedTopics = topics
    ?.filter((topic: any) => {
      // 按月份筛选
      if (selectedMonth && topic.monthKey !== selectedMonth) return false;
      
      // 按提报人筛选（多选）
      if (filters.submitters.length > 0) {
        const hasMatch = filters.submitters.some(name => topic.submitters.includes(name));
        if (!hasMatch) return false;
      }
      
      // 按时间筛选
      if (filters.startDate && topic.selectedDate < filters.startDate) return false;
      if (filters.endDate && topic.selectedDate > filters.endDate) return false;
      
      // 按进度筛选
      if (filters.progress && topic.progress !== filters.progress) return false;
      
      // 按状态筛选
      if (filters.status && topic.status !== filters.status) return false;
      
      return true;
    })
    .sort((a: any, b: any) => {
      // 第一优先级：状态（未发布 > 已发布/否决）
      const statusPriority: Record<string, number> = {
        '未发布': 0,
        '已发布': 1,
        '否决': 1,
      };
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // 第二优先级：进度（未开始/进行中 > 已完成/已暂停）
      const progressPriority: Record<string, number> = {
        '未开始': 0,
        '进行中': 0,
        '已完成': 1,
        '已暂停': 1,
      };
      const progressDiff = progressPriority[a.progress] - progressPriority[b.progress];
      if (progressDiff !== 0) return progressDiff;
      
      // 第三优先级：时间（最新的在前）
      return new Date(b.selectedDate).getTime() - new Date(a.selectedDate).getTime();
    }) || [];
  
  // 按月份分组
  const groupedTopics = filteredAndSortedTopics.reduce((acc: Record<string, any[]>, topic: any) => {
    if (!acc[topic.monthKey]) {
      acc[topic.monthKey] = [];
    }
    acc[topic.monthKey].push(topic);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">入选选题</h1>
            <div className="flex gap-2">
              {user?.role === "admin" && (
                <>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    新建入选选题
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/selected/stats">
                      <a className="flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        统计汇总
                      </a>
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 筛选区域 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  筛选条件
                </div>
                {/* 快捷筛选按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
                    setSelectedMonth(currentMonth);
                    setFilters({
                      ...filters,
                      status: "未发布",
                    });
                  }}
                >
                  <Zap className="w-4 h-4" />
                  本月未发布
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 月份筛选 */}
                <div>
                  <Label>月份</Label>
                  <Select value={selectedMonth || "all"} onValueChange={(v) => setSelectedMonth(v === "all" ? undefined : v)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部月份</SelectItem>
                      {monthKeys?.map((key: string) => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 提报人筛选 */}
                <div>
                  <Label>提报人</Label>
                  <div className="relative">
                    <Button
                      variant="outline"
                      className="w-full mt-2 justify-between"
                      onClick={() => setShowSubmitterFilter(!showSubmitterFilter)}
                    >
                      {filters.submitters.length === 0
                        ? "全部提报人"
                        : `已选 ${filters.submitters.length} 人`}
                      <Filter className="w-4 h-4" />
                    </Button>
                    {showSubmitterFilter && (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        <div className="p-2 space-y-2">
                          {Array.from(
                            new Set(
                              topics?.flatMap((t: any) =>
                                t.submitters.split(",").map((s: string) => s.trim())
                              ) || []
                            )
                          )
                            .sort()
                            .map((name: string) => (
                              <div key={name} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={filters.submitters.includes(name)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFilters({
                                        ...filters,
                                        submitters: [...filters.submitters, name],
                                      });
                                    } else {
                                      setFilters({
                                        ...filters,
                                        submitters: filters.submitters.filter((n) => n !== name),
                                      });
                                    }
                                  }}
                                />
                                <label className="text-sm cursor-pointer">{name}</label>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 进度筛选 */}
                <div>
                  <Label>进度</Label>
                  <Select value={filters.progress} onValueChange={(v: any) => setFilters({ ...filters, progress: v === "all" ? "" : v })}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="全部进度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部进度</SelectItem>
                      <SelectItem value="未开始">未开始</SelectItem>
                      <SelectItem value="进行中">进行中</SelectItem>
                      <SelectItem value="已完成">已完成</SelectItem>
                      <SelectItem value="已暂停">已暂停</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 状态筛选 */}
                <div>
                  <Label>状态</Label>
                  <Select value={filters.status} onValueChange={(v: any) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="全部状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="未发布">未发布</SelectItem>
                      <SelectItem value="已发布">已发布</SelectItem>
                      <SelectItem value="否决">否决</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 开始日期 */}
                <div>
                  <Label>开始日期</Label>
                  <Input
                    type="date"
                    className="mt-2"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>

                {/* 结束日期 */}
                <div>
                  <Label>结束日期</Label>
                  <Input
                    type="date"
                    className="mt-2"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* 清空筛选按钮 */}
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMonth(undefined);
                    setFilters({
                      submitters: [],
                      startDate: "",
                      endDate: "",
                      progress: "",
                      status: "",
                    });
                    setShowSubmitterFilter(false);
                  }}
                >
                  清空筛选
                </Button>
              </div>
            </CardContent>
          </Card>

          {Object.keys(groupedTopics).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                暂无入选选题
              </CardContent>
            </Card>
          ) : (
            (Object.entries(groupedTopics) as [string, any[]][])
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([monthKey, monthTopics]) => (
                <div key={monthKey} className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">{monthKey}</h2>
                  <div className="space-y-4">
                    {monthTopics.map((topic: any) => (
                      <Card key={topic.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base mb-2">{topic.content}</CardTitle>
                              <div className="flex flex-wrap gap-2 text-sm">
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                  提报人：{topic.submitters}
                                </span>
                                {topic.suggestion && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                    {topic.suggestion}
                                  </span>
                                )}
                                <span className={`px-2 py-1 rounded ${
                                  topic.progress === "已完成" ? "bg-green-100 text-green-700" :
                                  topic.progress === "进行中" ? "bg-yellow-100 text-yellow-700" :
                                  topic.progress === "已暂停" ? "bg-red-100 text-red-700" :
                                  "bg-gray-100 text-gray-700"
                                }`}>
                                  {topic.progress}
                                </span>
                                <span className={`px-2 py-1 rounded ${
                                  topic.status === "已发布" ? "bg-green-100 text-green-700" :
                                  topic.status === "否决" ? "bg-red-100 text-red-700" :
                                  "bg-gray-100 text-gray-700"
                                }`}>
                                  {topic.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(topic)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              {user?.role === "admin" && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDelete(topic.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        {(topic.leaderComment || topic.creators || topic.remark) && (
                          <CardContent className="text-sm space-y-2">
                            {topic.leaderComment && (
                              <div>
                                <span className="font-medium">领导点评：</span>
                                <span className="text-gray-700">{topic.leaderComment}</span>
                              </div>
                            )}
                            {topic.creators && (
                              <div>
                                <span className="font-medium">创作人：</span>
                                <span className="text-gray-700">{topic.creators}</span>
                              </div>
                            )}
                            {topic.remark && (
                              <div>
                                <span className="font-medium">备注：</span>
                                <span className="text-gray-700">{topic.remark}</span>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </main>

      {/* 编辑对话框 */}
      <Dialog open={!!editingTopic} onOpenChange={(open) => !open && setEditingTopic(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑入选选题</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {user?.role === "admin" && (
              <>
                <div>
                  <Label>选题内容</Label>
                  <Textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    rows={3}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>建议形式</Label>
                  <Textarea
                    value={editForm.suggestion}
                    onChange={(e) => setEditForm({ ...editForm, suggestion: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </>
            )}
            
            <div>
              <Label>领导点评</Label>
              <Textarea
                value={editForm.leaderComment}
                onChange={(e) => setEditForm({ ...editForm, leaderComment: e.target.value })}
                rows={2}
                className="mt-2"
              />
            </div>

            <div>
              <Label>创作人</Label>
              <Textarea
                value={editForm.creators}
                onChange={(e) => setEditForm({ ...editForm, creators: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>进度</Label>
                <Select value={editForm.progress} onValueChange={(v: any) => setEditForm({ ...editForm, progress: v })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="未开始">未开始</SelectItem>
                    <SelectItem value="进行中">进行中</SelectItem>
                    <SelectItem value="已完成">已完成</SelectItem>
                    <SelectItem value="已暂停">已暂停</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>状态</Label>
                <Select value={editForm.status} onValueChange={(v: any) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="未发布">未发布</SelectItem>
                    <SelectItem value="已发布">已发布</SelectItem>
                    <SelectItem value="否决">否决</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>备注</Label>
              <Textarea
                value={editForm.remark}
                onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                rows={2}
                className="mt-2"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditingTopic(null)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 创建对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建入选选题</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>选题内容 *</Label>
              <Textarea
                value={createForm.content}
                onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                rows={3}
                className="mt-2"
                placeholder="请输入选题内容"
              />
            </div>
            <div>
              <Label>建议形式</Label>
              <Textarea
                value={createForm.suggestion}
                onChange={(e) => setCreateForm({ ...createForm, suggestion: e.target.value })}
                className="mt-2"
                placeholder="请输入建议形式（可选）"
              />
            </div>
            <div>
              <Label>提报人 *</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {users?.map((u: any) => (
                  <div key={u.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${u.id}`}
                      checked={selectedSubmitters.includes(u.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSubmitters([...selectedSubmitters, u.id]);
                        } else {
                          setSelectedSubmitters(selectedSubmitters.filter(id => id !== u.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`user-${u.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {u.name || u.username}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button 
                onClick={() => {
                  if (!createForm.content.trim()) {
                    toast.error("请输入选题内容");
                    return;
                  }
                  if (selectedSubmitters.length === 0) {
                    toast.error("请选择至少一个提报人");
                    return;
                  }
                  // 将选中的用户ID转换为姓名
                  const submitterNames = selectedSubmitters
                    .map(id => users?.find((u: any) => u.id === id))
                    .filter(Boolean)
                    .map((u: any) => u.name || u.username)
                    .join(", ");
                  createMutation.mutate({
                    ...createForm,
                    submitters: submitterNames,
                  });
                }} 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
