import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { format, isToday } from "date-fns";
import { Calendar, Edit2, FileText, Plus, Star, TrendingUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Personal() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    content: "",
    suggestedFormat: "",
  });

  // 获取个人统计数据
  const { data: stats } = trpc.submissions.myStats.useQuery();
  
  // 获取个人提交历史
  const { data: history } = trpc.submissions.myHistory.useQuery();
  
  // 获取个人入选选题
  const { data: mySelectedTopics } = trpc.selectedTopics.myTopics.useQuery();

  // 更新选题
  const updateTopicMutation = trpc.submissionTopics.update.useMutation({
    onSuccess: () => {
      toast.success("选题更新成功");
      setEditDialogOpen(false);
      trpc.useUtils().submissions.myHistory.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  // 删除选题
  const deleteTopicMutation = trpc.submissionTopics.delete.useMutation({
    onSuccess: () => {
      toast.success("选题删除成功");
      setDeleteDialogOpen(false);
      trpc.useUtils().submissions.myHistory.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const handleEdit = (topic: any) => {
    setSelectedTopic(topic);
    setEditForm({
      content: topic.content,
      suggestedFormat: topic.suggestedFormat,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (topic: any) => {
    setSelectedTopic(topic);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTopic) return;
    updateTopicMutation.mutate({
      id: selectedTopic.id,
      data: editForm,
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedTopic) return;
    deleteTopicMutation.mutate({ id: selectedTopic.id });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>需要登录</CardTitle>
              <CardDescription>请先登录以查看个人空间</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // 筛选本日选题
  const todayTopics = history?.flatMap(item => 
    item.topics
      .filter((topic: any) => isToday(new Date(item.submittedAt)))
      .map((topic: any) => ({
        ...topic,
        submittedAt: item.submittedAt,
        formDate: item.formDate,
        formTitle: item.formTitle,
      }))
  ) || [];

  // 筛选往期选题（非本日）
  const pastTopics = history?.flatMap(item => 
    item.topics
      .filter((topic: any) => !isToday(new Date(item.submittedAt)))
      .map((topic: any) => ({
        ...topic,
        submittedAt: item.submittedAt,
        formDate: item.formDate,
        formTitle: item.formTitle,
      }))
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">个人空间</h1>
            <p className="text-gray-600">{user?.name}</p>
          </div>

          {/* 数据看板 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">累计提交</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSubmissions || 0}</div>
                <p className="text-xs text-muted-foreground">次提交记录</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">累计选题</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalTopics || 0}</div>
                <p className="text-xs text-muted-foreground">个选题内容</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">累计入选</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSelected || 0}</div>
                <p className="text-xs text-muted-foreground">个入选选题</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">入选率</CardTitle>
                <Calendar className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalTopics && stats.totalTopics > 0
                    ? `${((stats.totalSelected / stats.totalTopics) * 100).toFixed(1)}%`
                    : "0%"}
                </div>
                <p className="text-xs text-muted-foreground">选题入选比例</p>
              </CardContent>
            </Card>
          </div>

          {/* 本日选题 - 明显且靠前 */}
          <Card className="mb-8 border-2 border-blue-500 shadow-lg">
            <CardHeader className="bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-blue-900">📝 本日选题</CardTitle>
                  <CardDescription className="text-blue-700">
                    今天提交的选题，可以直接修改或删除
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setLocation("/form")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增选题
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {todayTopics.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>今天还没有提交选题</p>
                  <Button
                    onClick={() => setLocation("/form")}
                    variant="outline"
                    className="mt-4"
                  >
                    立即提交
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>提交时间</TableHead>
                      <TableHead>选题内容</TableHead>
                      <TableHead>建议形式</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayTopics.map((topic: any) => (
                      <TableRow key={topic.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(topic.submittedAt), 'HH:mm')}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="line-clamp-2">{topic.content}</div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {topic.suggestedFormat}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(topic)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(topic)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 我的入选选题 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                我的入选选题
              </CardTitle>
              <CardDescription>您提报的选题中已入选的内容</CardDescription>
            </CardHeader>
            <CardContent>
              {!mySelectedTopics || mySelectedTopics.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无入选选题</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>选题内容</TableHead>
                      <TableHead>建议形式</TableHead>
                      <TableHead>进度</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mySelectedTopics.map((topic: any) => (
                      <TableRow key={topic.id}>
                        <TableCell className="max-w-md">
                          <div className="line-clamp-2">{topic.content}</div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {topic.suggestedFormat}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {topic.progress}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            topic.status === "已发布"
                              ? "bg-green-100 text-green-700"
                              : topic.status === "未发布"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {topic.status}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(topic.createdAt), 'yyyy-MM-dd')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 往期选题 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                往期选题
              </CardTitle>
              <CardDescription>历史提交的选题记录，可以修改后再次提报</CardDescription>
            </CardHeader>
            <CardContent>
              {pastTopics.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无往期选题</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>提交时间</TableHead>
                      <TableHead>选题内容</TableHead>
                      <TableHead>建议形式</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastTopics.map((topic: any) => (
                      <TableRow key={topic.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(topic.submittedAt), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="line-clamp-2">{topic.content}</div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {topic.suggestedFormat}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(topic)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑选题</DialogTitle>
            <DialogDescription>
              修改选题内容和建议形式
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">选题内容</Label>
              <Textarea
                id="content"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                placeholder="请输入选题内容"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggestedFormat">建议形式</Label>
              <Select
                value={editForm.suggestedFormat}
                onValueChange={(value) => setEditForm({ ...editForm, suggestedFormat: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择建议形式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="短视频">短视频</SelectItem>
                  <SelectItem value="图文">图文</SelectItem>
                  <SelectItem value="长视频">长视频</SelectItem>
                  <SelectItem value="音频">音频</SelectItem>
                  <SelectItem value="直播">直播</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateTopicMutation.isPending}>
              {updateTopicMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个选题吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteTopicMutation.isPending}
            >
              {deleteTopicMutation.isPending ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
