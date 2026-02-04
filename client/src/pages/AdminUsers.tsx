import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import PermissionDenied from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Shield, User } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const { user, isAuthenticated } = useAuth();
  const { data: users, refetch } = trpc.users.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("角色更新成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  const handleRoleChange = (userId: number, newRole: "user" | "admin") => {
    if (confirm(`确定要将该用户角色更改为 ${newRole === "admin" ? "管理员" : "普通用户"} 吗？`)) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return <PermissionDenied message="仅管理员可访问用户管理页面" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">用户管理</h1>
            <p className="text-gray-600">管理系统用户和权限</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              {!users || users.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  暂无用户数据
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户ID</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>登录方式</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead>最后登录</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.id}</TableCell>
                        <TableCell>{u.name || "-"}</TableCell>
                        <TableCell>{u.email || "-"}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {u.loginMethod || "未知"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {u.role === "admin" ? (
                              <>
                                <Shield className="w-4 h-4 text-blue-600" />
                                <span className="text-blue-600 font-medium">管理员</span>
                              </>
                            ) : (
                              <>
                                <User className="w-4 h-4 text-gray-600" />
                                <span className="text-gray-600">普通用户</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(u.createdAt), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(u.lastSignedIn), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={u.role}
                            onValueChange={(value: "user" | "admin") => handleRoleChange(u.id, value)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">普通用户</SelectItem>
                              <SelectItem value="admin">管理员</SelectItem>
                            </SelectContent>
                          </Select>
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
