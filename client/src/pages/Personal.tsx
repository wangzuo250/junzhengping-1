import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { FileText, Star } from "lucide-react";

export default function Personal() {
  const { user, isAuthenticated } = useAuth();
  const { data: stats } = trpc.personal.stats.useQuery();
  const { data: history } = trpc.submissions.getUserHistory.useQuery();

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">个人空间</h1>
            <p className="text-gray-600">{user?.name || user?.email}</p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">累计提交选题</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSubmissions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  您提交的选题总数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">累计入选选题</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSelected || 0}</div>
                <p className="text-xs text-muted-foreground">
                  被标记为入选的选题数
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 提交历史 */}
          <Card>
            <CardHeader>
              <CardTitle>提交历史</CardTitle>
            </CardHeader>
            <CardContent>
              {!history || history.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  暂无提交记录
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>提交时间</TableHead>
                      <TableHead>选题内容</TableHead>
                      <TableHead>建议形式</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(item.submittedAt), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="line-clamp-2">{item.content}</div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {item.suggestedFormat}
                          </span>
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
    </div>
  );
}
