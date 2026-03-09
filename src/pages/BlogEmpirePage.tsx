import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { PageHeader } from '@/components/PageHeader';
import { SEOWarRoom } from '@/components/seo/SEOWarRoom';

const BlogEmpirePage = () => {
  return (
    <div className="min-h-screen bg-background flex">
      <SimpleDashboardSidebar />

      <main className="flex-1 ml-[260px] p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">SEO War Room</h1>
          <PageHeader />
        </div>

        <div className="flex-1 min-h-0">
          <SEOWarRoom />
        </div>
      </main>
    </div>
  );
};

export default BlogEmpirePage;
