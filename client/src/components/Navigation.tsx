import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Home, 
  FileEdit, 
  List, 
  Star, 
  User, 
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function Navigation() {
  const { user, isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("已退出登录");
      // 跳转到首页，避免刷新后自动跳转到 Manus 登录页
      window.location.href = "/";
    },
  });

  const navItems = [
    { path: "/", label: "首页", icon: Home },
    { path: "/form", label: "填写选题", icon: FileEdit, auth: true },
    { path: "/summary", label: "查看汇总", icon: List, auth: true },
    { path: "/selected", label: "入选选题", icon: Star, auth: true },
    { path: "/personal", label: "个人空间", icon: User, auth: true },
    { path: "/admin/users", label: "用户管理", icon: Settings, auth: true, admin: true },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.auth) return true;
    if (!isAuthenticated) return false;
    if (item.admin && user?.role !== "admin") return false;
    return true;
  });

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center space-x-2 text-xl font-bold text-blue-600 hover:text-blue-700">
              <FileEdit className="w-6 h-6" />
              <span>Jun正坪工作室选题系统</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {filteredNavItems.map(item => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <a
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {loading ? (
              <div className="text-sm text-gray-500">加载中...</div>
            ) : isAuthenticated && user ? (
              <>
                <span className="text-sm text-gray-700">
                  {user.name || user.email}
                  {user.role === "admin" && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                      管理员
                    </span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  退出
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm">登录</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-1">
              {filteredNavItems.map(item => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <a
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </a>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              {isAuthenticated && user ? (
                <div className="space-y-2">
                  <div className="px-3 text-sm text-gray-700">
                    {user.name || user.email}
                    {user.role === "admin" && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                        管理员
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      logoutMutation.mutate();
                      setMobileMenuOpen(false);
                    }}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button size="sm" className="w-full">登录</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
