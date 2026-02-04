import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Calendar, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Summary() {
  const { user, isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  
  const { data, refetch } = trpc.submissions.getByDate.useQuery({ date: selectedDate });
  const addToSelectedMutation = trpc.selectedTopics.add.useMutation({
    onSuccess: (result) => {
      if (result.merged) {
        toast.success(result.message);
      } else {
        toast.success("已添加到入选选题");
      }
      setSelectedTopics(new Set());
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });

  const handleToggleSelect = (id: number) => {
    const newSet = new Set(selectedTopics);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTopics(newSet);
  };

  const handleBatchAdd = async () => {
    if (selectedTopics.size === 0) {
      toast.error("请先选择要添加的选题");
      return;
    }

    const submissions = data?.submissions.filter(s => selectedTopics.has(s.id)) || [];
    
    for (const submission of submissions) {
      await addToSelectedMutation.mutateAsync({
        content: submission.content,
        suggestion: submission.suggestedFormat,
        submitters: submission.userName,
        selectedDate,
        sourceSubmissionId: submission.id,
      });
    }

    refetch();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">每日选题汇总</h1>
            
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="date-picker">选择日期</Label>
                <div className="relative mt-2">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {user?.role === "admin" && selectedTopics.size > 0 && (
                <Button onClick={handleBatchAdd} disabled={addToSelectedMutation.isPending}>
                  <Check className="w-4 h-4 mr-2" />
                  添加 {selectedTopics.size} 条到入选 ({selectedTopics.size})
                </Button>
              )}
            </div>
          </div>

          {!data?.form ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                该日期暂无选题提交
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                共 {data.submissions.length} 条选题
              </div>

              {data.submissions.map((submission) => (
                <Card key={submission.id} className="relative">
                  {user?.role === "admin" && (
                    <div className="absolute top-4 right-4">
                      <input
                        type="checkbox"
                        checked={selectedTopics.has(submission.id)}
                        onChange={() => handleToggleSelect(submission.id)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-gray-900">
                        {submission.userName}
                      </div>
                      <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {submission.suggestedFormat}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(submission.submittedAt), 'HH:mm:ss')}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{submission.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
