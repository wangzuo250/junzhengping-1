import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import PermissionDenied from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Edit, Lock, Shield, Trash2, User, UserX, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type EditUserForm = {
  userId: number;
  name: string;
  username: string;
};

type PasswordForm = {
  userId: number;
  newPassword: string;
  confirmPassword: string;
};

export default function AdminUsers() {
  const { user, isAuthenticated } = useAuth();
  const { data: users, refetch } = trpc.users.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditUserForm>({ userId: 0, name: "", username: "" });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ userId: 0, newPassword: "", confirmPassword: "" });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("角色更新成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  const updateInfoMutation = trpc.users.updateInfo.useMutation({
    onSuccess: () => {
      toast.success("用户信息更新成功");
      setEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  const updatePasswordMutation = trpc.users.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("密码修改成功");
      setPasswordDialogOpen(false);
      setPasswordForm({ userId: 0, newPassword: "", confirmPassword: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`修改失败：${error.message}`);
    },
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("用户删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const toggleStatusMutation = trpc.users.toggleStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.newStatus === "active" ? "用户已恢复填写权限" : "用户已暂停填写权限");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });

  const handleRoleChange = (userId: number, newRole: "user" | "admin") => {
    if (confirm(`确定要将该用户角色更改为 ${newRole === "admin" ? "管理员" : "普通用户"} 吗？`)) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  const handleEditUser = (u: any) => {
    setEditForm({ userId: u.id, name: u.name || "", username: u.username || "" });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.name.trim() || !editForm.username.trim()) {
      toast.error("姓名和用户名不能为空");
      return;
    }
    updateInfoMutation.mutate({
      userId: editForm.userId,
      name: editForm.name,
      username: editForm.username,
    });
  };

  const handleChangePassword = (u: any) => {
    setPasswordForm({ userId: u.id, newPassword: "", confirmPassword: "" });
    setPasswordDialogOpen(true);
  };

  const handleSavePassword = () => {
    if (passwordForm.newPassword.length < 6) {
      toast.error("密码长度至少为6位");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    updatePasswordMutation.mutate({
      userId: passwordForm.userId,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleDeleteUser = (userId: number, userName: string) => {
    if (confirm(`确定要删除用户 "${userName}" 吗？此操作不可恢复！`)) {
      deleteMutation.mutate({ userId });
    }
  };

  const handleToggleStatus = (userId: number, currentStatus: string, userName: string) => {
    const action = currentStatus === "active" ? "暂停" : "恢复";
    if (confirm(`确定要${action}用户 "${userName}" 的填写权限吗？`)) {
      toggleStatusMutation.mutate({ userId });
    }
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return <PermissionDenied message="仅管理员可访问用户管理页面" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
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
                      <TableHead>用户名</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>
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
                        <TableCell>{u.username || "-"}</TableCell>
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
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            u.status === "active" 
                              ? "bg-green-100 text-green-700" 
                              : "bg-red-100 text-red-700"
                          }`}>
                            {u.status === "active" ? "正常" : "已暂停"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(u.createdAt), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(u.lastSignedIn), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={u.role}
                              onValueChange={(value: "user" | "admin") => handleRoleChange(u.id, value)}
                              disabled={updateRoleMutation.isPending || u.id === user?.id}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">普通用户</SelectItem>
                                <SelectItem value="admin">管理员</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(u)}
                              title="编辑信息"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangePassword(u)}
                              title="修改密码"
                            >
                              <Lock className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(u.id, u.status, u.name || u.username || "")}
                              disabled={toggleStatusMutation.isPending || u.id === user?.id}
                              title={u.status === "active" ? "暂停填写" : "恢复填写"}
                            >
                              {u.status === "active" ? (
                                <UserX className="w-4 h-4 text-orange-600" />
                              ) : (
                                <UserCheck className="w-4 h-4 text-green-600" />
                              )}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(u.id, u.name || u.username || "")}
                              disabled={deleteMutation.isPending || u.id === user?.id}
                              title="删除用户"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
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

      {/* 编辑用户信息对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户信息</DialogTitle>
            <DialogDescription>修改用户的姓名和用户名</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="请输入用户名"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateInfoMutation.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改密码对话框 */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>为用户设置新密码（至少6位）</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="请输入新密码"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="请再次输入新密码"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSavePassword} disabled={updatePasswordMutation.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
