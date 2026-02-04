import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Plus, Trash2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

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
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>需要登录</CardTitle>
              <CardDescription>请先登录以提交选题</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href={getLoginUrl()}>立即登录</a>
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
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {format(new Date(), 'yyyy年MM月dd日')} 选题收集
            </h1>
            <p className="text-gray-600">
              提交人：<span className="font-medium">{user?.name || user?.email}</span>
            </p>
          </div>

          <div className="space-y-6">
            {topics.map((topic, index) => (
              <Card key={topic.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">选题 {index + 1}</CardTitle>
                    {topics.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTopic(topic.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`content-${topic.id}`}>选题内容 *</Label>
                    <Textarea
                      id={`content-${topic.id}`}
                      placeholder="请输入选题内容..."
                      value={topic.content}
                      onChange={(e) => updateTopic(topic.id, "content", e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>建议形式 *</Label>
                    <RadioGroup
                      value={topic.suggestedFormat}
                      onValueChange={(value) => updateTopic(topic.id, "suggestedFormat", value)}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="钧评" id={`format-junjing-${topic.id}`} />
                        <Label htmlFor={`format-junjing-${topic.id}`} className="font-normal cursor-pointer">
                          钧评
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="快评" id={`format-kuaiping-${topic.id}`} />
                        <Label htmlFor={`format-kuaiping-${topic.id}`} className="font-normal cursor-pointer">
                          快评
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="视频" id={`format-video-${topic.id}`} />
                        <Label htmlFor={`format-video-${topic.id}`} className="font-normal cursor-pointer">
                          视频
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="文章" id={`format-article-${topic.id}`} />
                        <Label htmlFor={`format-article-${topic.id}`} className="font-normal cursor-pointer">
                          文章
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="其他" id={`format-other-${topic.id}`} />
                        <Label htmlFor={`format-other-${topic.id}`} className="font-normal cursor-pointer">
                          其他
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={addTopic}
            >
              <Plus className="w-4 h-4 mr-2" />
              添加选题
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              size="lg"
            >
              {submitMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  提交中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  提交所有选题
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
