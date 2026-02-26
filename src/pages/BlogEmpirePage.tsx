import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText, TrendingUp, Share2, Search, DollarSign, BarChart3,
  RefreshCw, Plus, Zap, Globe, Trash2, Play, Settings, Users,
  GitBranch, BookOpen, Link2, MessageSquare,
} from "lucide-react";
import { BlogAgentTeamGrid } from "@/components/blog/BlogAgentTeamGrid";
import { BlogWorkflowEngine } from "@/components/blog/BlogWorkflowEngine";
import { BlogFeaturesGrid } from "@/components/blog/BlogFeaturesGrid";
import { BlogContentPipeline } from "@/components/blog/BlogContentPipeline";
import { BrowserPublishingPanel } from "@/components/blog/BrowserPublishingPanel";
import { AnalyticsDashboard } from "@/components/blog/AnalyticsDashboard";
import { BacklinkMonitor } from "@/components/blog/BacklinkMonitor";
import { SocialDistributionManager } from "@/components/blog/SocialDistributionManager";
import { SEOMonitorDashboard } from "@/components/blog/SEOMonitorDashboard";
import { CommentModerationPanel } from "@/components/blog/CommentModerationPanel";
import { RealTimeBlogAgentExecutor } from "@/components/blog/RealTimeBlogAgentExecutor";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface BlogProject {
  id: string;
  name: string;
  niche: string | null;
  domain: string | null;
  platform: string;
  status: string;
  current_phase: number;
  total_posts: number;
  total_revenue: number;
  monthly_traffic: number;
  created_at: string;
}

const BlogEmpirePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [blogProjects, setBlogProjects] = useState<BlogProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<BlogProject | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", niche: "", domain: "", platform: "wordpress" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBlogProjects();
      const channel = supabase
        .channel('blog-projects-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_projects', filter: `user_id=eq.${user.id}` }, () => fetchBlogProjects())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchBlogProjects = async () => {
    try {
      const { data, error } = await supabase.from('blog_projects').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      setBlogProjects(data || []);
      if (data && data.length > 0 && !selectedProject) setSelectedProject(data[0]);
    } catch (error) {
      console.error("Error fetching blog projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const createBlogProject = async () => {
    if (!newProject.name.trim()) { toast.error("Please enter a blog name"); return; }
    try {
      setCreating(true);
      const { data, error } = await supabase.from('blog_projects').insert({
        user_id: user?.id, name: newProject.name, niche: newProject.niche || null,
        domain: newProject.domain || null, platform: newProject.platform, status: 'active',
        current_phase: 1, total_posts: 0, total_revenue: 0, monthly_traffic: 0,
      }).select().single();
      if (error) throw error;
      toast.success(`Blog "${newProject.name}" created!`);
      setNewProject({ name: "", niche: "", domain: "", platform: "wordpress" });
      setShowCreateDialog(false);
      setSelectedProject(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to create blog project");
    } finally {
      setCreating(false);
    }
  };

  const deleteBlogProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this blog project?")) return;
    try {
      const { error } = await supabase.from('blog_projects').delete().eq('id', projectId);
      if (error) throw error;
      toast.success("Blog project deleted");
      if (selectedProject?.id === projectId) setSelectedProject(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const totalPosts = blogProjects.reduce((s, p) => s + (p.total_posts || 0), 0);
  const totalTraffic = blogProjects.reduce((s, p) => s + (p.monthly_traffic || 0), 0);
  const totalRevenue = blogProjects.reduce((s, p) => s + (p.total_revenue || 0), 0);
  const activeBlogs = blogProjects.filter(p => p.status === 'active').length;

  const statsData = [
    { label: "Active Blogs", value: activeBlogs.toString(), icon: Globe, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { label: "Total Posts", value: totalPosts.toLocaleString(), icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Monthly Traffic", value: totalTraffic.toLocaleString(), icon: TrendingUp, color: "text-green-500", bgColor: "bg-green-500/10" },
    { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <SimpleDashboardSidebar />
      <main className="flex-1 ml-[260px]">
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-r from-orange-500/5 to-amber-500/5">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">
                  🤖 Autonomous Blogger AI Agent Team
                </h1>
                <p className="text-muted-foreground mt-2">
                  Your 24/7 Digital Content Workforce — Never Sleeps, Never Stops, Always Delivers
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                      <Plus className="h-4 w-4 mr-2" />New Blog
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Blog Project</DialogTitle>
                      <DialogDescription>Let the AI agent team handle content creation, SEO, and promotion.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Blog Name *</Label>
                        <Input id="name" placeholder="e.g., Tech Insights Blog" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="niche">Niche / Topic</Label>
                        <Input id="niche" placeholder="e.g., AI & Machine Learning" value={newProject.niche} onChange={(e) => setNewProject({ ...newProject, niche: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="domain">Domain (optional)</Label>
                        <Input id="domain" placeholder="e.g., myblog.com" value={newProject.domain} onChange={(e) => setNewProject({ ...newProject, domain: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="platform">Platform</Label>
                        <Select value={newProject.platform} onValueChange={(v) => setNewProject({ ...newProject, platform: v })}>
                          <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="wordpress">WordPress</SelectItem>
                            <SelectItem value="ghost">Ghost</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="substack">Substack</SelectItem>
                            <SelectItem value="webflow">Webflow</SelectItem>
                            <SelectItem value="hubspot">HubSpot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                      <Button onClick={createBlogProject} disabled={creating}>{creating ? "Creating..." : "Create Blog"}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <PageHeader />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {statsData.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                    <Card className="border-border/30 hover:border-border/80 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                          </div>
                          <div className={`p-2 rounded-lg ${stat.bgColor}`}><Icon className={`h-5 w-5 ${stat.color}`} /></div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between overflow-x-auto">
              <TabsList className="bg-background border border-border">
                <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4" />Dashboard</TabsTrigger>
                <TabsTrigger value="agents" className="gap-2"><Users className="h-4 w-4" />Agent Team (12)</TabsTrigger>
                <TabsTrigger value="workflow" className="gap-2"><GitBranch className="h-4 w-4" />Workflow</TabsTrigger>
                <TabsTrigger value="blogs" className="gap-2"><Globe className="h-4 w-4" />My Blogs ({blogProjects.length})</TabsTrigger>
                <TabsTrigger value="pipeline" className="gap-2"><BookOpen className="h-4 w-4" />Pipeline</TabsTrigger>
                <TabsTrigger value="seo" className="gap-2"><Search className="h-4 w-4" />SEO</TabsTrigger>
                <TabsTrigger value="social" className="gap-2"><Share2 className="h-4 w-4" />Social</TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2"><TrendingUp className="h-4 w-4" />Analytics</TabsTrigger>
                <TabsTrigger value="backlinks" className="gap-2"><Link2 className="h-4 w-4" />Backlinks</TabsTrigger>
                <TabsTrigger value="automation" className="gap-2 bg-gradient-to-r from-orange-500/10 to-amber-500/10"><Zap className="h-4 w-4" />Automation</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={() => fetchBlogProjects()} disabled={refreshing} className="ml-4 flex-shrink-0">
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Refresh
              </Button>
            </div>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BlogWorkflowEngine />
                <BlogContentPipeline />
              </div>
              <BlogFeaturesGrid />
            </TabsContent>

            {/* Agent Team Tab */}
            <TabsContent value="agents" className="space-y-6">
              <BlogAgentTeamGrid />
            </TabsContent>

            {/* Workflow Tab */}
            <TabsContent value="workflow" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BlogWorkflowEngine />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">🏆 The Bottom Line</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      The Autonomous Blogger AI Agent Team is not just a tool — it is a <strong>complete, self-running digital workforce</strong>. It replicates every role in a professional content marketing department.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border border-border/50 text-center">
                        <p className="text-2xl font-bold">12</p>
                        <p className="text-xs text-muted-foreground">Specialized Agents</p>
                      </div>
                      <div className="p-3 rounded-lg border border-border/50 text-center">
                        <p className="text-2xl font-bold">24/7</p>
                        <p className="text-xs text-muted-foreground">Operation</p>
                      </div>
                      <div className="p-3 rounded-lg border border-border/50 text-center">
                        <p className="text-2xl font-bold">100+</p>
                        <p className="text-xs text-muted-foreground">Posts/Day Capacity</p>
                      </div>
                      <div className="p-3 rounded-lg border border-border/50 text-center">
                        <p className="text-2xl font-bold">∞</p>
                        <p className="text-xs text-muted-foreground">Scalable Blogs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* My Blogs Tab */}
            <TabsContent value="blogs" className="space-y-6">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
                  ))}
                </div>
              ) : blogProjects.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Blogs Yet</h3>
                    <p className="text-muted-foreground text-center mb-4">Create your first blog and let the 12-agent AI team handle everything.</p>
                    <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-orange-500 to-amber-500">
                      <Plus className="h-4 w-4 mr-2" />Create Your First Blog
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {blogProjects.map((project) => (
                    <motion.div key={project.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02 }}>
                      <Card className={`cursor-pointer transition-all ${selectedProject?.id === project.id ? "border-orange-500 bg-orange-500/5" : "hover:border-border"}`} onClick={() => setSelectedProject(project)}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-orange-500" />{project.name}</CardTitle>
                              <CardDescription className="text-xs mt-1">{project.niche || "General"}</CardDescription>
                            </div>
                            <Badge className={project.status === "active" ? "bg-green-500" : "bg-muted-foreground"}>{project.status}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                            <div className="p-2 bg-muted rounded"><p className="text-muted-foreground">Posts</p><p className="font-bold">{project.total_posts}</p></div>
                            <div className="p-2 bg-muted rounded"><p className="text-muted-foreground">Traffic</p><p className="font-bold">{project.monthly_traffic}</p></div>
                            <div className="p-2 bg-muted rounded"><p className="text-muted-foreground">Revenue</p><p className="font-bold text-green-500">${project.total_revenue}</p></div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                            <span>🤖 12 Agents Active</span>
                            <Badge variant="outline" className="text-[10px]">{project.platform}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={(e) => { e.stopPropagation(); setSelectedProject(project); setActiveTab("automation"); }}>
                              <Play className="h-3 w-3 mr-1" />Launch
                            </Button>
                            <Button size="sm" variant="outline"><Settings className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteBlogProject(project.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  <Card className="border-dashed border-2 cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-all" onClick={() => setShowCreateDialog(true)}>
                    <CardContent className="flex flex-col items-center justify-center h-full py-12">
                      <Plus className="h-8 w-8 text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Add New Blog</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Pipeline Tab */}
            <TabsContent value="pipeline" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BlogContentPipeline />
                <BrowserPublishingPanel />
              </div>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-6"><SEOMonitorDashboard /></TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-6"><SocialDistributionManager /></TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6"><AnalyticsDashboard /></TabsContent>

            {/* Backlinks Tab */}
            <TabsContent value="backlinks" className="space-y-6"><BacklinkMonitor /></TabsContent>

            {/* Automation Tab */}
            <TabsContent value="automation" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {selectedProject ? (
                  <RealTimeBlogAgentExecutor
                    projectId={selectedProject.id}
                    projectName={selectedProject.name}
                    currentPhase={selectedProject.current_phase}
                    niche={selectedProject.niche}
                    platform={selectedProject.platform}
                    onPhaseChange={async (newPhase) => {
                      await supabase.from("blog_projects").update({ current_phase: newPhase }).eq("id", selectedProject.id);
                      setSelectedProject({ ...selectedProject, current_phase: newPhase });
                    }}
                  />
                ) : (
                  <Card><CardContent className="p-6 text-center"><p className="text-muted-foreground">Select a blog project from the "My Blogs" tab to run agents</p></CardContent></Card>
                )}
                <div className="space-y-4">
                  <BlogWorkflowEngine />
                  <Card>
                    <CardHeader><CardTitle className="text-base">🤖 Agent System Status</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {['Orchestrator', 'Content Writer', 'SEO Specialist', 'Social Distribution', 'Analytics Agent', 'Publishing Manager'].map((name) => (
                        <div key={name} className="flex items-center justify-between p-2 rounded bg-muted text-sm">
                          <span>{name}</span>
                          <Badge className="bg-green-500 text-[10px]">Online</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default BlogEmpirePage;
