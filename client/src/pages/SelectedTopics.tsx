import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Edit, BarChart3, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function SelectedTopics() {
  const { user, isAuthenticated } = useAuth();
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ content: "", suggestion: "" });
  
  // 筛选状态
  const [filters, setFilters] = useState({
    monthKey: "all",
    submitters: "all",
    progress: "all",
    status: "all",
    startDate: "",
    endDate: "",
  });

  // 点评输入状态
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  const { data: topics = [], refetch } = trpc.selectedTopics.listAll.useQuery();
  const { data: users = [] } = trpc.users.list.useQuery();
  
  const createMutation = trpc.selectedTopics.create.useMutation({
    onSuccess: () => {
      toast.success("创建成功");
      setShowCreateDialog(false);
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

  const createCommentMutation = trpc.selectedTopics.comments.create.useMutation({
    onSuccess: (_, variables) => {
      toast.success("点评提交成功");
      setCommentInputs(prev => ({ ...prev, [variables.topicId]: "" }));
      refetch();
    },
    onError: (error) => {
      toast.error(`点评提交失败：${error.message}`);
    },
  });

  // 筛选逻辑
  const filteredTopics = topics.filter((topic: any) => {
    if (filters.monthKey !== "all" && topic.monthKey !== filters.monthKey) return false;
    if (filters.submitters !== "all" && !topic.submitters?.includes(filters.submitters)) return false;
    if (filters.progress !== "all" && topic.progress !== filters.progress) return false;
    if (filters.status !== "all" && topic.status !== filters.status) return false;
    if (filters.startDate && topic.selectedDate < filters.startDate) return false;
    if (filters.endDate && topic.selectedDate > filters.endDate) return false;
    return true;
  });

  // 获取月份列表
  const monthKeys = Array.from(new Set(topics.map((t: any) => t.monthKey))).sort((a: any, b: any) => b.localeCompare(a)) as string[];
  
  // 获取提报人列表
  const allSubmitters = Array.from(new Set(topics.flatMap((t: any) => t.submitters?.split("、") || []))).sort() as string[];

  const handleSubmitComment = (topicId: number) => {
    const comment = commentInputs[topicId]?.trim();
    if (!comment) {
      toast.error("请输入点评内容");
      return;
    }
    createCommentMutation.mutate({ topicId, comment });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-600">需要登录</p>
              <Button className="mt-4" asChild>
                <Link href="/login">登录</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">入选选题</h1>
          {user?.role === "admin" && (
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateDialog(true)}>新建入选选题</Button>
              <Button variant="outline" asChild>
                <Link href="/selected-stats">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  统计汇总
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* 筛选条件 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>月份</Label>
                <Select value={filters.monthKey} onValueChange={(v) => setFilters({...filters, monthKey: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部月份" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部月份</SelectItem>
                    {monthKeys.map((key: string) => (
                      <SelectItem key={key} value={key}>{key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>提报人</Label>
                <Select value={filters.submitters} onValueChange={(v) => setFilters({...filters, submitters: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部提报人" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部提报人</SelectItem>
                    {allSubmitters.map((name: string) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>进度</Label>
                <Select value={filters.progress} onValueChange={(v) => setFilters({...filters, progress: v})}>
                  <SelectTrigger>
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

              <div>
                <Label>状态</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                  <SelectTrigger>
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

              <div>
                <Label>开始日期</Label>
                <Input 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                />
              </div>

              <div>
                <Label>结束日期</Label>
                <Input 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setFilters({monthKey: "all", submitters: "all", progress: "all", status: "all", startDate: "", endDate: ""})}
            >
              清空筛选
            </Button>
          </CardContent>
        </Card>

        {/* 选题列表 */}
        {filteredTopics.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              暂无入选选题
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTopics.map((topic: any) => (
              <Card key={topic.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{topic.content}</CardTitle>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>提报人：</strong>{topic.submitters || "未知"}</p>
                        <p><strong>创作人：</strong>{topic.creators || "未分配"}</p>
                        <p><strong>入选日期：</strong>{topic.selectedDate}</p>
                        <p><strong>进度：</strong><span className={
                          topic.progress === "已完成" ? "text-green-600" :
                          topic.progress === "进行中" ? "text-blue-600" :
                          topic.progress === "已暂停" ? "text-orange-600" :
                          "text-gray-600"
                        }>{topic.progress}</span></p>
                        <p><strong>状态：</strong><span className={
                          topic.status === "已发布" ? "text-green-600" :
                          topic.status === "否决" ? "text-red-600" :
                          "text-gray-600"
                        }>{topic.status}</span></p>
                        {topic.suggestion && <p><strong>建议：</strong>{topic.suggestion}</p>}
                        {topic.remark && <p><strong>备注：</strong>{topic.remark}</p>}
                      </div>
                    </div>
                    {user?.role === "admin" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingTopic(topic)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            if (confirm("确定删除这条入选选题吗？")) {
                              deleteMutation.mutate(topic.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* 点评输入 - 仅管理员可见 */}
                  {user?.role === "admin" && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <Label className="text-sm font-semibold mb-2 block">添加点评</Label>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="输入您的点评..."
                          value={commentInputs[topic.id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({...prev, [topic.id]: e.target.value}))}
                          className="flex-1"
                          rows={2}
                        />
                        <Button onClick={() => handleSubmitComment(topic.id)}>提交</Button>
                      </div>
                    </div>
                  )}

                  {/* 历史点评列表 */}
                  {topic.comments && topic.comments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label className="text-sm font-semibold">历史点评</Label>
                      {topic.comments.map((comment: any) => (
                        <div key={comment.id} className="p-3 bg-gray-50 rounded border">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-semibold text-blue-600">
                              【{comment.userName}】
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 编辑对话框 */}
        {editingTopic && (
          <Dialog open={!!editingTopic} onOpenChange={() => setEditingTopic(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>编辑入选选题</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>选题内容</Label>
                  <Textarea
                    value={editingTopic.content}
                    onChange={(e) => setEditingTopic({...editingTopic, content: e.target.value})}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>建议</Label>
                  <Textarea
                    value={editingTopic.suggestion || ""}
                    onChange={(e) => setEditingTopic({...editingTopic, suggestion: e.target.value})}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>创作人</Label>
                  <Input
                    value={editingTopic.creators || ""}
                    onChange={(e) => setEditingTopic({...editingTopic, creators: e.target.value})}
                  />
                </div>
                <div>
                  <Label>进度</Label>
                  <Select 
                    value={editingTopic.progress} 
                    onValueChange={(v) => setEditingTopic({...editingTopic, progress: v})}
                  >
                    <SelectTrigger>
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
                  <Select 
                    value={editingTopic.status} 
                    onValueChange={(v) => setEditingTopic({...editingTopic, status: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="未发布">未发布</SelectItem>
                      <SelectItem value="已发布">已发布</SelectItem>
                      <SelectItem value="否决">否决</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>备注</Label>
                  <Textarea
                    value={editingTopic.remark || ""}
                    onChange={(e) => setEditingTopic({...editingTopic, remark: e.target.value})}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingTopic(null)}>取消</Button>
                  <Button onClick={() => {
                    updateMutation.mutate({
                      id: editingTopic.id,
                      data: {
                        content: editingTopic.content,
                        suggestion: editingTopic.suggestion,
                        creators: editingTopic.creators,
                        progress: editingTopic.progress,
                        status: editingTopic.status,
                        remark: editingTopic.remark,
                      }
                    });
                  }}>保存</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* 创建对话框 */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新建入选选题</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>选题内容</Label>
                <Textarea
                  placeholder="输入选题内容"
                  rows={3}
                  onChange={(e) => setCreateForm(prev => ({...prev, content: e.target.value}))}
                />
              </div>
              <div>
                <Label>建议</Label>
                <Textarea
                  placeholder="输入建议（可选）"
                  rows={2}
                  onChange={(e) => setCreateForm(prev => ({...prev, suggestion: e.target.value}))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
                <Button onClick={() => {
                  if (!createForm.content.trim()) {
                    toast.error("请输入选题内容");
                    return;
                  }
                  createMutation.mutate({
                    content: createForm.content,
                    suggestion: createForm.suggestion,
                    submitters: "",
                  });
                }}>创建</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


