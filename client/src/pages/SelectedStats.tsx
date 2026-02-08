import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, Clock, CheckCircle2, Pause, XCircle, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import PermissionDenied from "@/components/PermissionDenied";
import { toast } from "sonner";

export default function SelectedStats() {
  const { user, isAuthenticated } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(""); // 改为单个月份选择

  const { data: topics, isLoading: topicsLoading } = trpc.selectedTopics.listAll.useQuery();
  // 从 selectedDate 字段提取月份（YYYY-MM格式）
  const monthKeys = Array.from(new Set(
    topics?.map((t: any) => {
      if (!t.selectedDate) return null;
      const date = new Date(t.selectedDate);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }).filter((m: any): m is string => m !== null) || []
  )).sort((a: any, b: any) => b.localeCompare(a)) as string[];
  
  const { data: progressStats, isLoading: progressLoading } = trpc.selectedTopics.progressStats.useQuery(
    { month: selectedMonth || undefined },
    { enabled: true }
  );
  const { data: statusStats, isLoading: statusLoading } = trpc.selectedTopics.statusStats.useQuery(
    { month: selectedMonth || undefined },
    { enabled: true }
  );
  const { data: contribution } = trpc.selectedTopics.monthlyContribution.useQuery(
    { month: selectedMonth },
    { enabled: selectedMonth !== "" }
  );

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
    if (!selectedMonth) {
      toast.error("请先选择要导出的月份");
      return;
    }
    exportMutation.mutate({ month: selectedMonth });
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return <PermissionDenied message="仅管理员可访问统计汇总页面" />;
  }

  // 显示加载状态
  if (topicsLoading || progressLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>加载中...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">统计汇总</h1>
            <Button onClick={handleExport} disabled={exportMutation.isPending || !selectedMonth}>
              <Download className="w-4 h-4 mr-2" />
              {exportMutation.isPending ? "导出中..." : "导出Excel"}
            </Button>
          </div>

          {/* 项目进度统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                项目进度统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">未开始</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{progressStats?.未开始 || 0}</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm text-blue-600">进行中</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{progressStats?.进行中 || 0}</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm text-green-600">已完成</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{progressStats?.已完成 || 0}</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Pause className="w-5 h-5 text-orange-600 mr-2" />
                    <span className="text-sm text-orange-600">已暂停</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-600">{progressStats?.已暂停 || 0}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <EyeOff className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">未发布</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{statusStats?.未发布 || 0}</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Eye className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm text-green-600">已发布</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{statusStats?.已发布 || 0}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    发布率 {statusStats?.publishRate || "0%"}
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-sm text-red-600">否决</span>
                  </div>
                  <div className="text-3xl font-bold text-red-600">{statusStats?.否决 || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 月度贡献统计 */}
          <Card>
            <CardHeader>
              <CardTitle>月度贡献统计</CardTitle>
            </CardHeader>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">选择统计月份</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {monthKeys?.map((month: string) => (
                    <div key={month} className="flex items-center space-x-2">
                      <Checkbox
                        id={`month-${month}`}
                        checked={selectedMonth === month}
                        onCheckedChange={() => setSelectedMonth(month)}
                      />
                      <label htmlFor={`month-${month}`}>{month}</label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {!selectedMonth ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  请选择要统计的月份
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">排名</TableHead>
                        <TableHead>姓名</TableHead>
                        <TableHead className="text-center">入选数量</TableHead>
                        <TableHead className="text-center">发布数量</TableHead>
                        <TableHead className="text-center">否决数量</TableHead>
                        <TableHead className="text-center">发布率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contribution && contribution.length > 0 ? (
                        contribution.map((item: any, index: number) => (
                          <TableRow key={item.userId}>
                            <TableCell className="text-center font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">{item.selectedCount}</TableCell>
                            <TableCell className="text-center">{item.publishedCount}</TableCell>
                            <TableCell className="text-center">{item.rejectedCount}</TableCell>
                            <TableCell className="text-center">{item.publishRate}%</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            暂无数据
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
