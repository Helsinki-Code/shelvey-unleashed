import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MessageCircle, TrendingUp, FileText, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const BlogEmpireCEOHeader = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [ceo, setCeo] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    totalBlogs: 0,
    totalPosts: 0,
    monthlyRevenue: 0,
    totalViews: 0
  });
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (user) {
      initializeBlogEmpire();
    }
  }, [user]);

  const initializeBlogEmpire = async () => {
    if (!user) return;
    
    try {
      // Check if blog empire company exists
      const { data: existingCompany } = await supabase
        .from('ai_companies')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_type', 'blog_empire')
        .single();

      if (existingCompany) {
        setCompany(existingCompany);
        
        // Get CEO
        const { data: existingCeo } = await supabase
          .from('company_ceos')
          .select('*')
          .eq('company_id', existingCompany.id)
          .single();
        
        if (existingCeo) {
          setCeo(existingCeo);
        }
      } else {
        // Create new blog empire company
        const { data: newCompany, error: companyError } = await supabase
          .from('ai_companies')
          .insert({
            user_id: user.id,
            company_type: 'blog_empire',
            name: 'My Blog Empire',
            description: 'AI-powered content creation and monetization',
            status: 'active'
          })
          .select()
          .single();

        if (companyError) throw companyError;
        setCompany(newCompany);

        // Create CEO
        const { data: newCeo, error: ceoError } = await supabase
          .from('company_ceos')
          .insert({
            user_id: user.id,
            company_id: newCompany.id,
            name: 'Nova',
            persona_type: 'Creative',
            communication_style: 'inspiring',
            personality_traits: ['creative', 'strategic', 'data-driven', 'engaging']
          })
          .select()
          .single();

        if (ceoError) throw ceoError;
        setCeo(newCeo);
        
        toast.success("Blog Empire initialized! Meet Nova, your Chief Content Officer.");
      }

      // Load metrics
      const { data: projects } = await supabase
        .from('company_projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_type', 'blog_empire');

      const { data: revenue } = await supabase
        .from('company_revenue_logs')
        .select('amount')
        .eq('user_id', user.id)
        .eq('company_type', 'blog_empire');

      const totalRevenue = revenue?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      setMetrics({
        totalBlogs: projects?.length || 0,
        totalPosts: (projects?.length || 0) * 15, // Estimate
        monthlyRevenue: totalRevenue,
        totalViews: (projects?.length || 0) * 5000 // Estimate
      });

    } catch (error) {
      console.error('Error initializing blog empire:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-12 h-12 bg-muted rounded-full" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* CEO Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-2xl">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{ceo?.name || 'Nova'}</h3>
                <Badge variant="outline" className="text-orange-500 border-orange-500/50">
                  Chief Content Officer
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Blog Empire • {metrics.totalBlogs} Blogs Active
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="flex items-center gap-1 text-orange-500">
                <FileText className="h-4 w-4" />
                <span className="font-bold">{metrics.totalPosts}</span>
              </div>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-amber-500">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold">{(metrics.totalViews / 1000).toFixed(1)}K</span>
              </div>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-green-500">
                <DollarSign className="h-4 w-4" />
                <span className="font-bold">${metrics.monthlyRevenue.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </div>

          {/* Chat with CEO */}
          <Sheet>
            <SheetTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                <MessageCircle className="h-4 w-4 mr-2" />
                Talk to {ceo?.name || 'Nova'}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="text-2xl">📝</span>
                  Chat with {ceo?.name || 'Nova'}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 h-[calc(100vh-120px)] flex flex-col">
                <div className="flex-1 bg-muted/30 rounded-lg p-4 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-sm">
                        📝
                      </div>
                      <div className="flex-1 bg-background rounded-lg p-3">
                        <p className="text-sm">
                          Welcome to Blog Empire! I'm {ceo?.name || 'Nova'}, your Chief Content Officer. 
                          I manage a team of 6 specialized AI agents who can help you build and monetize 
                          profitable blogs. Ready to create your content empire?
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ask about content strategy, monetization..."
                    className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600">Send</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>
    </Card>
  );
};
