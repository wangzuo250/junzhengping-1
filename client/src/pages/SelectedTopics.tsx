import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Edit, BarChart3, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function SelectedTopics() {
  const { user, isAuthenticated } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    leaderComment: "",
    creators: "",
    progress: "未开始" as "未开始" | "进行中" | "已完成" | "已暂停",
    status: "未发布" as "未发布" | "已发布" | "否决",
    remark: "",
    content: "",
    suggestion: "",
  });

  const { data: monthKeys } = trpc.selectedTopics.getMonthKeys.useQuery();
  const { data: topics, refetch } = trpc.selectedTopics.list.useQuery({ monthKey: selectedMonth });
  
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

    const updates: any = {
      id: editingTopic.id,
      leaderComment: editForm.leaderComment,
      creators: editForm.creators,
      progress: editForm.progress,
      status: editForm.status,
      remark: editForm.remark,
    };

    // 管理员可以编辑所有字段
    if (user?.role === "admin") {
      updates.content = editForm.content;
      updates.suggestion = editForm.suggestion;
    }

    updateMutation.mutate(updates);
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

  // 按月份分组
  const groupedTopics = topics?.reduce((acc, topic) => {
    if (!acc[topic.monthKey]) {
      acc[topic.monthKey] = [];
    }
    acc[topic.monthKey].push(topic);
    return acc;
  }, {} as Record<string, typeof topics>) || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">入选选题</h1>
            {user?.role === "admin" && (
              <Button asChild>
                <Link href="/selected/stats">
                  <a className="flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    统计汇总
                  </a>
                </Link>
              </Button>
            )}
          </div>

          <div className="mb-6">
            <Label>筛选月份</Label>
            <Select value={selectedMonth || "all"} onValueChange={(v) => setSelectedMonth(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-48 mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部月份</SelectItem>
                {monthKeys?.map(key => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {Object.keys(groupedTopics).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                暂无入选选题
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedTopics)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([monthKey, monthTopics]) => (
                <div key={monthKey} className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">{monthKey}</h2>
                  <div className="space-y-4">
                    {monthTopics.map((topic) => (
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
    </div>
  );
}
