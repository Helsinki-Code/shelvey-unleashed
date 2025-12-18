import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, FileText, TrendingUp, DollarSign, Users, 
  BarChart3, PenTool, Search, Share2, PieChart
} from "lucide-react";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { BlogEmpireCEOHeader } from "@/components/blog/BlogEmpireCEOHeader";
import { BLOG_EMPIRE_AGENTS, BLOG_EMPIRE_PHASES } from "@/lib/blog-empire-agents";
import BlogArticleGenerator from "@/components/BlogArticleGenerator";

const BlogEmpirePage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock blog projects
  const blogProjects = [
    {
      id: '1',
      name: 'TechInsider Pro',
      niche: 'Technology',
      posts: 45,
      monthlyViews: 12500,
      revenue: 890,
      status: 'publishing',
      phase: 4
    },
    {
      id: '2', 
      name: 'HealthyLiving Hub',
      niche: 'Health & Wellness',
      posts: 32,
      monthlyViews: 8900,
      revenue: 650,
      status: 'growing',
      phase: 4
    },
    {
      id: '3',
      name: 'FinanceFlow',
      niche: 'Personal Finance',
      posts: 18,
      monthlyViews: 5200,
      revenue: 420,
      status: 'setup',
      phase: 3
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'publishing': return 'bg-green-500/10 text-green-500';
      case 'growing': return 'bg-blue-500/10 text-blue-500';
      case 'setup': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAgentIcon = (agentId: string) => {
    switch (agentId) {
      case 'content-strategist': return <BarChart3 className="h-5 w-5" />;
      case 'blog-writer': return <PenTool className="h-5 w-5" />;
      case 'seo-optimizer': return <Search className="h-5 w-5" />;
      case 'monetization-manager': return <DollarSign className="h-5 w-5" />;
      case 'social-distributor': return <Share2 className="h-5 w-5" />;
      case 'analytics-reporter': return <PieChart className="h-5 w-5" />;
      default: return <Users className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <SimpleDashboardSidebar />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* CEO Header */}
          <BlogEmpireCEOHeader />

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Blogs</p>
                    <p className="text-2xl font-bold">{blogProjects.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                    <p className="text-2xl font-bold">{blogProjects.reduce((sum, b) => sum + b.posts, 0)}</p>
                  </div>
                  <PenTool className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Views</p>
                    <p className="text-2xl font-bold">{(blogProjects.reduce((sum, b) => sum + b.monthlyViews, 0) / 1000).toFixed(1)}K</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    <p className="text-2xl font-bold">${blogProjects.reduce((sum, b) => sum + b.revenue, 0).toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Blog Projects</TabsTrigger>
              <TabsTrigger value="agents">AI Team</TabsTrigger>
              <TabsTrigger value="generator">Content Generator</TabsTrigger>
              <TabsTrigger value="phases">Workflow Phases</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Your Blog Projects</h2>
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Blog
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {blogProjects.map((blog) => (
                  <Card key={blog.id} className="hover:border-orange-500/50 transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{blog.name}</CardTitle>
                        <Badge className={getStatusColor(blog.status)}>
                          {blog.status}
                        </Badge>
                      </div>
                      <CardDescription>{blog.niche}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Phase Progress</span>
                          <span className="font-medium">Phase {blog.phase}/5</span>
                        </div>
                        <Progress value={(blog.phase / 5) * 100} className="h-2" />
                        
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <div className="text-center">
                            <p className="text-lg font-bold">{blog.posts}</p>
                            <p className="text-xs text-muted-foreground">Posts</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold">{(blog.monthlyViews / 1000).toFixed(1)}K</p>
                            <p className="text-xs text-muted-foreground">Views</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-500">${blog.revenue}</p>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="agents" className="space-y-4">
              <h2 className="text-xl font-semibold">Blog Empire AI Team</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BLOG_EMPIRE_AGENTS.map((agent) => (
                  <Card key={agent.id} className="hover:border-orange-500/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-orange-500">
                          {getAgentIcon(agent.id)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <CardDescription className="text-xs">{agent.role}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{agent.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="generator" className="space-y-4">
              <BlogArticleGenerator 
                projectId="demo"
                businessName="Blog Empire"
                industry="Content Publishing"
                brandVoice="Professional and engaging"
              />
            </TabsContent>

            <TabsContent value="phases" className="space-y-4">
              <h2 className="text-xl font-semibold">Blog Empire Workflow Phases</h2>
              <div className="space-y-4">
                {BLOG_EMPIRE_PHASES.map((phase, index) => (
                  <Card key={phase.phase} className={index === 0 ? "border-orange-500/50" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {phase.phase}
                          </div>
                          <div>
                            <CardTitle className="text-base">{phase.name}</CardTitle>
                            <CardDescription className="text-xs">{phase.description}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          {index === 0 ? "Active" : "Pending"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {phase.deliverables.map((deliverable) => (
                          <Badge key={deliverable} variant="outline" className="text-xs">
                            {deliverable}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default BlogEmpirePage;
