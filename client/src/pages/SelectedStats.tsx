import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import PermissionDenied from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Download, TrendingUp, CheckCircle2, XCircle, Clock, Pause } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SelectedStats() {
  const { user, isAuthenticated } = useAuth();
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const { data: topics } = trpc.selectedTopics.listAll.useQuery();
  const monthKeys = Array.from(new Set(topics?.map((t: any) => t.monthKey) || [])).sort((a, b) => b.localeCompare(a));
  const { data: progressStats } = trpc.selectedTopics.progressStats.useQuery();
  const { data: statusStats } = trpc.selectedTopics.statusStats.useQuery();
  const { data: contribution } = trpc.selectedTopics.monthlyContribution.useQuery(
    { monthKeys: selectedMonths },
    { enabled: selectedMonths.length > 0 }
  );

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const exportMutation = trpc.selectedTopics.exportReport.useMutation({
    onSuccess: (result: any) => {
      // 将 base64 转换为 Blob 并下载
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("导出成功！");
    },
    onError: (error: any) => {
      toast.error(`导出失败：${error.message}`);
    },
  });

  const handleExport = () => {
    if (selectedMonths.length === 0) {
      toast.error("请先选择要导出的月份");
      return;
    }
    exportMutation.mutate({ monthKeys: selectedMonths });
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return <PermissionDenied message="仅管理员可访问统计汇总页面" />;
  }

  const totalTopics = topics?.length || 0;
  // @ts-ignore - Drizzle ORM count() returns Number type, not number
  const publishedCount = (statusStats?.find((s: any) => s.status === '已发布')?.count as any) || 0;
  // @ts-ignore - Drizzle ORM count() returns Number type, not number
  const completedCount = (progressStats?.find((p: any) => p.progress === '已完成')?.count as any) || 0;
  // @ts-ignore - Drizzle ORM count() returns Number type, not number
  const notPublishedCount = (statusStats?.find((s: any) => s.status === '未发布')?.count as any) || 0;
  // @ts-ignore - Drizzle ORM count() returns Number type, not number
  const rejectedCount = (statusStats?.find((s: any) => s.status === '否决')?.count as any) || 0;
  // @ts-ignore - Drizzle ORM count() returns Number type, not number
  const inProgressCount = (progressStats?.find((p: any) => p.progress === '进行中')?.count as any) || 0;
  // @ts-ignore - Drizzle ORM count() returns Number type, not number
  const pausedCount = (progressStats?.find((p: any) => p.progress === '已暂停')?.count as any) || 0;
  // @ts-ignore - Drizzle ORM count() returns Number type, not number
  const notStartedCount = (progressStats?.find((p: any) => p.progress === '未开始')?.count as any) || 0;
  
  const completionRate = totalTopics > 0
    ? ((completedCount / totalTopics) * 100).toFixed(1)
    : "0.0";
  
  const publishRate = totalTopics > 0
    ? ((publishedCount / totalTopics) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">统计汇总</h1>
            <Button onClick={handleExport} disabled={exportMutation.isPending || selectedMonths.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              {exportMutation.isPending ? "导出中..." : "导出Excel"}
            </Button>
          </div>

          {/* 项目进度统计 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">项目进度统计</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">未开始</CardTitle>
                  <Clock className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{notStartedCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">进行中</CardTitle>
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inProgressCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">已完成</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">已暂停</CardTitle>
                  <Pause className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pausedCount}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">未发布</CardTitle>
                  <Clock className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{notPublishedCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">已发布</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{publishedCount}</div>
                  <p className="text-xs text-muted-foreground">
                    发布率 {publishRate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">否决</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rejectedCount}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 月度贡献统计 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">月度贡献统计</h2>
            
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">选择统计月份</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {monthKeys?.map((month: string) => (
                    <div key={month} className="flex items-center space-x-2">
                      <Checkbox
                        id={`month-${month}`}
                        checked={selectedMonths.includes(month)}
                        onCheckedChange={() => toggleMonth(month)}
                      />
                      <Label htmlFor={`month-${month}`} className="cursor-pointer">
                        {month}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedMonths.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  请选择要统计的月份
                </CardContent>
              </Card>
            ) : contribution ? (
              <Card>
                <CardContent className="pt-6">
                  {user?.role !== 'admin' && contribution && contribution.length >= 5 && (                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                      普通用户仅显示前5名，管理员可查看完整排行榜
                    </div>
                  )}
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">排名</TableHead>
                        <TableHead>姓名</TableHead>
                        <TableHead className="text-right">入选数量</TableHead>
                        <TableHead className="text-right">发布数量</TableHead>
                        <TableHead className="text-right">否决数量</TableHead>
                        <TableHead className="text-right">发布率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contribution.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500">
                            暂无数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        contribution?.map((item: any, index: number) => (
                          <TableRow key={item.name}>
                            <TableCell className="font-medium">#{index + 1}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">{item.selectedCount}</TableCell>
                            <TableCell className="text-right">{item.publishedCount}</TableCell>
                            <TableCell className="text-right">{item.rejectedCount}</TableCell>
                            <TableCell className="text-right">{item.publishRate}%</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">加载中...</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
