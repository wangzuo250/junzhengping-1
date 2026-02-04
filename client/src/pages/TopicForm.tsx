import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Plus, Trash2, Send, House } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

interface TopicItem {
  id: string;
  content: string;
  suggestedFormat: string;
}

export default function TopicForm() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [topics, setTopics] = useState<TopicItem[]>([
    { id: crypto.randomUUID(), content: "", suggestedFormat: "钧评" }
  ]);

  const submitMutation = trpc.submissions.submit.useMutation({
    onSuccess: (data) => {
      toast.success(`成功提交 ${data.count} 条选题！`);
      setTopics([{ id: crypto.randomUUID(), content: "", suggestedFormat: "钧评" }]);
      setLocation("/summary");
    },
    onError: (error) => {
      toast.error(`提交失败：${error.message}`);
    },
  });

  const addTopic = () => {
    setTopics([...topics, { id: crypto.randomUUID(), content: "", suggestedFormat: "钧评" }]);
  };

  const removeTopic = (id: string) => {
    if (topics.length === 1) {
      toast.error("至少保留一条选题");
      return;
    }
    setTopics(topics.filter(t => t.id !== id));
  };

  const updateTopic = (id: string, field: keyof TopicItem, value: string) => {
    setTopics(topics.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSubmit = () => {
    // 验证
    const emptyTopics = topics.filter(t => !t.content.trim());
    if (emptyTopics.length > 0) {
      toast.error("请填写所有选题内容");
      return;
    }

    submitMutation.mutate({
      topics: topics.map(t => ({
        content: t.content.trim(),
        suggestedFormat: t.suggestedFormat,
      })),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>需要登录</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">请先登录以提交选题</p>
            <Link href="/login">
              <Button className="w-full">立即登录</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {format(new Date(), 'yyyy-MM-dd')} 选题收集表
            </h1>
            <p className="text-muted-foreground">请填写您的选题信息</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <House className="w-4 h-4" />
              返回主页
            </Button>
          </Link>
        </div>

        {/* 基本信息卡片 */}
        <div className="mb-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  姓名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  className="max-w-sm"
                  placeholder="请输入您的姓名"
                  value={user?.name || ""}
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 选题列表卡片 */}
        <div className="mb-6">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                选题列表 <span className="text-destructive">*</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  （至少填写一个选题）
                </span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={addTopic}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                添加选题
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {topics.map((topic, index) => (
                <div
                  key={topic.id}
                  className="p-4 border rounded-lg bg-background/50 space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">选题 {index + 1}</span>
                    {topics.length > 1 && (
                      <Button
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
                    <Label htmlFor={`content-${topic.id}`}>
                      选题内容 <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id={`content-${topic.id}`}
                      placeholder="请输入选题内容..."
                      value={topic.content}
                      onChange={(e) => updateTopic(topic.id, "content", e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`format-${topic.id}`}>
                      建议形式 <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={topic.suggestedFormat}
                      onValueChange={(value) => updateTopic(topic.id, "suggestedFormat", value)}
                    >
                      <SelectTrigger id={`format-${topic.id}`} className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="钧评">钧评</SelectItem>
                        <SelectItem value="快评">快评</SelectItem>
                        <SelectItem value="视频">视频</SelectItem>
                        <SelectItem value="文章">文章</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            size="lg"
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {submitMutation.isPending ? "提交中..." : "提交选题"}
          </Button>
        </div>
      </div>
    </div>
  );
}
