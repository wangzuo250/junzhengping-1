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
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { format, isToday } from "date-fns";
import { Calendar, Edit2, FileText, Plus, Star, TrendingUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// 建议形式分类
const FORMAT_CATEGORIES = {
  文字类: ["钧评", "长文"],
  视频类: ["短视频", "长视频", "记者实拍"],
  图片类: ["海报", "组图", "漫画"],
};

export default function Personal() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editProgressDialogOpen, setEditProgressDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [selectedSelectedTopic, setSelectedSelectedTopic] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    content: "",
    suggestedFormat: [] as string[],
    creativeIdea: "",
    creator: "",
    relatedLink: "",
  });
  const [progressForm, setProgressForm] = useState<{
    progress: "未开始" | "进行中" | "已完成" | "已暂停" | "" | undefined;
    status: "未发布" | "已发布" | "否决" | "" | undefined;
    note: string;
  }>({
    progress: "",
    status: "",
    note: "",
  });

  // 获取个人统计数据
  const { data: stats } = trpc.submissions.myStats.useQuery();
  
  // 获取个人提交历史
  const { data: history } = trpc.submissions.myHistory.useQuery();
  
  // 获取个人入选选题
  const { data: mySelectedTopics } = trpc.selectedTopics.myTopics.useQuery();

  // 获取 trpc utils
  const utils = trpc.useUtils();

  // 更新选题
  const updateTopicMutation = trpc.submissionTopics.update.useMutation({
    onSuccess: () => {
      toast.success("选题更新成功");
      setEditDialogOpen(false);
      utils.submissions.myHistory.invalidate();
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
      utils.submissions.myHistory.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  // 更新入选选题进度和状态
  const updateSelectedTopicMutation = trpc.selectedTopics.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功");
      setEditProgressDialogOpen(false);
      utils.selectedTopics.myTopics.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  const handleEdit = (topic: any) => {
    setSelectedTopic(topic);
    setEditForm({
      content: topic.content || "",
      suggestedFormat: topic.suggestedFormat ? topic.suggestedFormat.split(",") : [],
      creativeIdea: topic.creativeIdea || "",
      creator: topic.creator || "",
      relatedLink: topic.relatedLink || "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (topic: any) => {
    setSelectedTopic(topic);
    setDeleteDialogOpen(true);
  };

  const handleEditProgress = (topic: any) => {
    setSelectedSelectedTopic(topic);
    setProgressForm({
      progress: topic.progress || "",
      status: topic.status || "",
      note: topic.note || "",
    });
    setEditProgressDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTopic) return;
    updateTopicMutation.mutate({
      id: selectedTopic.id,
      data: {
        ...editForm,
        suggestedFormat: editForm.suggestedFormat.join(","),
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedTopic) return;
    deleteTopicMutation.mutate({ id: selectedTopic.id });
  };

  const handleSaveProgress = () => {
    if (!selectedSelectedTopic) return;
    const data: any = { note: progressForm.note };
    if (progressForm.progress) {
      data.progress = progressForm.progress;
    }
    if (progressForm.status) {
      data.status = progressForm.status;
    }
    updateSelectedTopicMutation.mutate({
      id: selectedSelectedTopic.id,
      data,
    });
  };

  const toggleFormat = (format: string) => {
    setEditForm(prev => ({
      ...prev,
      suggestedFormat: prev.suggestedFormat.includes(format)
        ? prev.suggestedFormat.filter(f => f !== format)
        : [...prev.suggestedFormat, format],
    }));
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
  const todayTopics = history?.filter((item: any) => 
    item.topics.some((topic: any) => isToday(new Date(topic.createdAt)))
  ).flatMap((item: any) => 
    item.topics.filter((topic: any) => isToday(new Date(topic.createdAt)))
      .map((topic: any) => ({
        ...topic,
        submittedAt: item.submittedAt,
        submitterName: item.submitterName,
      }))
  ) || [];

  // 排序入选选题（与入选选题页面相同的排序逻辑）
  const sortedSelectedTopics = [...(mySelectedTopics || [])].sort((a, b) => {
    // 第一优先级：状态（未发布 > 已发布/否决）
    const statusOrder = { "未发布": 0, "已发布": 1, "否决": 1 };
    const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 1) - 
                       (statusOrder[b.status as keyof typeof statusOrder] || 1);
    if (statusDiff !== 0) return statusDiff;

    // 第二优先级：进度（未开始/进行中 > 已完成/已暂停）
    const progressOrder = { "未开始": 0, "进行中": 0, "已完成": 1, "已暂停": 1 };
    const progressDiff = (progressOrder[a.progress as keyof typeof progressOrder] || 1) - 
                         (progressOrder[b.progress as keyof typeof progressOrder] || 1);
    if (progressDiff !== 0) return progressDiff;

    // 第三优先级：时间（最新的在前）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">个人空间</h1>
          <p className="text-gray-600 mt-2">查看您的选题统计和管理您的选题</p>
        </div>

        {/* 数据看板 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">累计提交</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSubmissions || 0}</div>
              <p className="text-xs text-gray-500 mt-1">次</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">累计选题</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTopics || 0}</div>
              <p className="text-xs text-gray-500 mt-1">条</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">累计入选</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSelected || 0}</div>
              <p className="text-xs text-gray-500 mt-1">条</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">入选率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalTopics ? Math.round((stats.totalSelected / stats.totalTopics) * 100) : 0}%
              </div>
              <p className="text-xs text-gray-500 mt-1">选题入选比例</p>
            </CardContent>
          </Card>
        </div>

        {/* 本日选题 */}
        <Card className="mb-8 border-blue-200 shadow-lg">
          <CardHeader className="bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <CardTitle>本日选题</CardTitle>
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
              <div className="space-y-4">
                {todayTopics.map((topic: any) => (
                  <Card key={topic.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-500">
                              {format(new Date(topic.createdAt), 'HH:mm')}
                            </span>
                            {topic.suggestedFormat && (
                              <div className="flex gap-1 flex-wrap">
                                {topic.suggestedFormat.split(",").map((fmt: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                    {fmt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-medium text-gray-700">选题内容：</span>
                              <span className="text-sm text-gray-900">{topic.content || "-"}</span>
                            </div>
                            {topic.creativeIdea && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">创作思路：</span>
                                <span className="text-sm text-gray-600">{topic.creativeIdea}</span>
                              </div>
                            )}
                            {topic.creator && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">创作者：</span>
                                <span className="text-sm text-gray-600">{topic.creator}</span>
                              </div>
                            )}
                            {topic.relatedLink && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">相关链接：</span>
                                <a href={topic.relatedLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                  {topic.relatedLink}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
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
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 我的入选选题 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <CardTitle>我的入选选题</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!sortedSelectedTopics || sortedSelectedTopics.length === 0 ? (
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
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSelectedTopics.map((topic: any) => (
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
                        <span className={`px-2 py-1 rounded text-xs ${
                          topic.progress === "未开始" ? "bg-gray-100 text-gray-700" :
                          topic.progress === "进行中" ? "bg-blue-100 text-blue-700" :
                          topic.progress === "已完成" ? "bg-green-100 text-green-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {topic.progress}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          topic.status === "未发布" ? "bg-yellow-100 text-yellow-700" :
                          topic.status === "已发布" ? "bg-green-100 text-green-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {topic.status}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(topic.createdAt), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProgress(topic)}
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

        {/* 往期选题 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <CardTitle>往期选题</CardTitle>
            </div>
            <CardDescription>查看历史提报选题，可修改后再次提报</CardDescription>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>暂无历史选题</p>
              </div>
            ) : (
              <div className="space-y-6">
                {history.map((item: any) => (
                  <div key={item.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {format(new Date(item.submittedAt), 'yyyy年MM月dd日')} 提交
                        </h3>
                        <p className="text-sm text-gray-500">
                          共 {item.topics.length} 条选题
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {item.topics.map((topic: any) => (
                        <Card key={topic.id} className="bg-gray-50">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 space-y-2">
                                <div>
                                  <span className="text-sm font-medium text-gray-700">选题内容：</span>
                                  <span className="text-sm text-gray-900">{topic.content || "-"}</span>
                                </div>
                                {topic.suggestedFormat && (
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">建议形式：</span>
                                    <div className="inline-flex gap-1 flex-wrap ml-2">
                                      {topic.suggestedFormat.split(",").map((fmt: string, idx: number) => (
                                        <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                          {fmt}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {topic.creativeIdea && (
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">创作思路：</span>
                                    <span className="text-sm text-gray-600">{topic.creativeIdea}</span>
                                  </div>
                                )}
                                {topic.creator && (
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">创作者：</span>
                                    <span className="text-sm text-gray-600">{topic.creator}</span>
                                  </div>
                                )}
                                {topic.relatedLink && (
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">相关链接：</span>
                                    <a href={topic.relatedLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                      {topic.relatedLink}
                                    </a>
                                  </div>
                                )}
                              </div>
                              {!isToday(new Date(topic.createdAt)) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(topic)}
                                  className="ml-4"
                                >
                                  修改再报
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 编辑选题对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑选题</DialogTitle>
            <DialogDescription>修改选题信息后可重新提报</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="content">选题内容 *</Label>
              <Textarea
                id="content"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                placeholder="请输入选题内容"
                className="mt-1"
                rows={4}
              />
            </div>
            <div>
              <Label>建议形式 *</Label>
              <div className="mt-2 space-y-3">
                {Object.entries(FORMAT_CATEGORIES).map(([category, formats]) => (
                  <div key={category}>
                    <div className="text-sm font-medium text-gray-700 mb-2">{category}</div>
                    <div className="flex flex-wrap gap-3">
                      {formats.map((format) => (
                        <div key={format} className="flex items-center space-x-2">
                          <Checkbox
                            id={`format-${format}`}
                            checked={editForm.suggestedFormat.includes(format)}
                            onCheckedChange={() => toggleFormat(format)}
                          />
                          <label
                            htmlFor={`format-${format}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {format}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="creativeIdea">创作思路</Label>
              <Textarea
                id="creativeIdea"
                value={editForm.creativeIdea}
                onChange={(e) => setEditForm({ ...editForm, creativeIdea: e.target.value })}
                placeholder="请输入创作思路"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="creator">创作者</Label>
              <Input
                id="creator"
                value={editForm.creator}
                onChange={(e) => setEditForm({ ...editForm, creator: e.target.value })}
                placeholder="请输入创作者"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="relatedLink">相关链接</Label>
              <Input
                id="relatedLink"
                value={editForm.relatedLink}
                onChange={(e) => setEditForm({ ...editForm, relatedLink: e.target.value })}
                placeholder="请输入相关链接"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.content || editForm.suggestedFormat.length === 0}>
              保存
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
              确定要删除这条选题吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑进度和状态对话框 */}
      <Dialog open={editProgressDialogOpen} onOpenChange={setEditProgressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑进度和状态</DialogTitle>
            <DialogDescription>更新入选选题的进度和状态</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="progress">进度</Label>
              <Select
                value={progressForm.progress}
                onValueChange={(value) => setProgressForm({ ...progressForm, progress: value as "未开始" | "进行中" | "已完成" | "已暂停" })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择进度" />
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
              <Label htmlFor="status">状态</Label>
              <Select
                value={progressForm.status}
                onValueChange={(value) => setProgressForm({ ...progressForm, status: value as "未发布" | "已发布" | "否决" })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="未发布">未发布</SelectItem>
                  <SelectItem value="已发布">已发布</SelectItem>
                  <SelectItem value="否决">否决</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="note">备注</Label>
              <Textarea
                id="note"
                value={progressForm.note}
                onChange={(e) => setProgressForm({ ...progressForm, note: e.target.value })}
                placeholder="请输入备注"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProgressDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveProgress}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
