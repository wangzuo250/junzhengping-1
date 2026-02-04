import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { FileEdit, List, Star, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: todayStats } = trpc.submissions.getTodayStats.useQuery();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Jun正坪工作室选题系统
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            高效管理团队选题，追踪项目进度，数据统计一目了然
          </p>
        </div>

        {/* Stats Cards */}
        {isAuthenticated && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">今日提交人数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayStats?.userCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  参与今日选题提交的用户数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">今日选题总数</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayStats?.topicCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  今日提交的选题总数量
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Cards */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : isAuthenticated ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/form">
                <a className="block">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <FileEdit className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle>填写选题</CardTitle>
                    <CardDescription>
                      提交您的选题想法，支持一次性提交多条选题
                    </CardDescription>
                  </CardHeader>
                </a>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/summary">
                <a className="block">
                  <CardHeader>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <List className="w-6 h-6 text-green-600" />
                    </div>
                    <CardTitle>查看汇总</CardTitle>
                    <CardDescription>
                      查看每日选题汇总，管理员可标记入选选题
                    </CardDescription>
                  </CardHeader>
                </a>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/selected">
                <a className="block">
                  <CardHeader>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                      <Star className="w-6 h-6 text-yellow-600" />
                    </div>
                    <CardTitle>入选选题</CardTitle>
                    <CardDescription>
                      查看入选选题库，追踪项目进度和统计数据
                    </CardDescription>
                  </CardHeader>
                </a>
              </Link>
            </Card>
          </div>
        ) : (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>欢迎使用</CardTitle>
              <CardDescription>
                请先登录以使用选题管理系统
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href={getLoginUrl()}>立即登录</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
