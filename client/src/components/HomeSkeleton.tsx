import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Skeleton */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-6">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section Skeleton */}
        <div className="text-center mb-12">
          <div className="h-10 w-96 bg-gray-200 rounded mx-auto mb-4 animate-pulse"></div>
          <div className="h-6 w-[500px] bg-gray-200 rounded mx-auto animate-pulse"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-12 bg-gray-200 rounded mb-2 animate-pulse"></div>
                <div className="h-3 w-40 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4 animate-pulse"></div>
                <div className="h-6 w-24 bg-gray-200 rounded mb-2 animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded mb-1 animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
