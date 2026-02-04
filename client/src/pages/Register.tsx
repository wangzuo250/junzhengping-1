import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Register() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("注册成功！请登录");
      setLocation("/login");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !confirmPassword || !name) {
      toast.error("请填写所有必填字段");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (password.length < 6) {
      toast.error("密码长度至少为6位");
      return;
    }

    if (username.length < 2) {
      toast.error("用户名长度至少为2位");
      return;
    }

    registerMutation.mutate({
      username,
      email: email || undefined,
      password,
      name,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">注册</CardTitle>
          <CardDescription className="text-center">
            创建您的账号
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                用户名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="输入用户名（至少2位）"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                真实姓名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="输入真实姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱（可选）</Label>
              <Input
                id="email"
                type="email"
                placeholder="输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                密码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="输入密码（至少6位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                确认密码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={registerMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "注册中..." : "注册"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              已有账号？{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                立即登录
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
