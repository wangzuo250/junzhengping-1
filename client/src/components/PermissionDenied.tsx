import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Navigation from "./Navigation";

interface PermissionDeniedProps {
  message?: string;
  redirectDelay?: number;
}

export default function PermissionDenied({ 
  message = "您没有权限访问此页面", 
  redirectDelay = 3 
}: PermissionDeniedProps) {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(redirectDelay);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <CardTitle>权限不足</CardTitle>
            </div>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {countdown} 秒后将自动跳转到首页...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
