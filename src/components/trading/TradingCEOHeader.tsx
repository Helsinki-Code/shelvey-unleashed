import { useState, useEffect } from 'react';
import { Bot, MessageSquare, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TRADING_PHASES, TRADING_AGENTS } from '@/lib/trading-agents';
import { formatDistanceToNow } from 'date-fns';

interface TradingCEOHeaderProps {
  onCompanyInit?: () => void;
}

interface CompanyData {
  id: string;
  name: string;
  status: string;
  total_revenue: number;
  total_clients: number;
}

interface CEOData {
  id: string;
  name: string;
  persona_type: string;
}

interface ActivityLog {
  id: string;
  action: string;
  status: string;
  created_at: string;
  ceo_name: string;
}

export const TradingCEOHeader = ({ onCompanyInit }: TradingCEOHeaderProps) => {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [ceo, setCeo] = useState<CEOData | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      initializeCompany();
    }
  }, [user]);

  const initializeCompany = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Check if trading company exists
      let { data: existingCompany } = await supabase
        .from('ai_companies')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_type', 'trading')
        .maybeSingle();

      if (!existingCompany) {
        // Create the company
        const { data: newCompany, error: companyError } = await supabase
          .from('ai_companies')
          .insert({
            user_id: user.id,
            company_type: 'trading',
            name: 'Trading Terminal',
            description: 'AI-powered autonomous trading strategies',
            status: 'active'
          })
          .select()
          .single();

        if (companyError) throw companyError;
        existingCompany = newCompany;

        // Create default CEO
        await supabase.from('company_ceos').insert({
          user_id: user.id,
          company_id: newCompany.id,
          name: 'Viktor',
          persona_type: 'Analytical',
          communication_style: 'data-driven'
        });

        // Log company creation
        await supabase.from('company_activity_logs').insert({
          user_id: user.id,
          company_id: newCompany.id,
          company_type: 'trading',
          ceo_name: 'Viktor',
          action: 'Trading Terminal initialized and ready for market analysis',
          status: 'completed'
        });

        toast.success('Trading Terminal activated! Your AI CEO Viktor is ready.');
        onCompanyInit?.();
      }

      setCompany(existingCompany as CompanyData);

      // Fetch CEO
      const { data: ceoData } = await supabase
        .from('company_ceos')
        .select('*')
        .eq('company_id', existingCompany.id)
        .maybeSingle();

      setCeo(ceoData as CEOData);

      // Fetch recent activities
      const { data: activityData } = await supabase
        .from('company_activity_logs')
        .select('*')
        .eq('company_id', existingCompany.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setActivities((activityData as ActivityLog[]) || []);

    } catch (error) {
      console.error('Error initializing trading company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !user || !company || !ceo) return;
    
    setSending(true);
    const userMessage = message;
    setMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const { data, error } = await supabase.functions.invoke('ceo-agent-chat', {
        body: {
          message: userMessage,
          userId: user.id,
          projectId: company.id,
          ceoName: ceo.name,
          ceoPersona: ceo.persona_type,
          context: 'trading',
          agentTeam: Object.values(TRADING_AGENTS).map(a => a.name).join(', ')
        }
      });

      if (error) throw error;

      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

      // Log activity
      await supabase.from('company_activity_logs').insert({
        user_id: user.id,
        company_id: company.id,
        company_type: 'trading',
        ceo_name: ceo.name,
        action: `Discussed: "${userMessage.substring(0, 50)}..."`,
        status: 'completed'
      });

    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I apologize, but I encountered an issue. Please try again.` 
      }]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6 animate-pulse">
        <CardContent className="h-32" />
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              📈
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{company?.name || 'Trading Terminal'}</h2>
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-500">
                  {ceo?.persona_type || 'Analytical'} CEO
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                CEO: <span className="font-medium text-foreground">{ceo?.name || 'Viktor'}</span> • 
                {' '}{Object.keys(TRADING_AGENTS).length} Agents • {TRADING_PHASES.length} Phases
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Total P&L</p>
                <p className="font-bold text-emerald-500">${Number(company?.total_revenue || 0).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Strategies</p>
                <p className="font-bold">{company?.total_clients || 0}</p>
              </div>
            </div>

            {/* Chat with CEO Button */}
            <Sheet open={chatOpen} onOpenChange={setChatOpen}>
              <SheetTrigger asChild>
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Talk to {ceo?.name || 'CEO'}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <span className="text-2xl">📈</span>
                    Chat with {ceo?.name || 'Viktor'}
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col h-[calc(100vh-120px)] mt-4">
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {chatMessages.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Hi! I'm {ceo?.name || 'Viktor'}, your Trading CEO.</p>
                          <p className="text-sm mt-2">Ask me about market analysis, trading strategies, risk management, or portfolio optimization.</p>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {sending && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-4 py-2">
                            <Activity className="h-4 w-4 animate-pulse" />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  <div className="pt-4 border-t mt-4">
                    <div className="flex gap-2">
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={`Ask ${ceo?.name || 'Viktor'} anything...`}
                        className="min-h-[60px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button onClick={handleSendMessage} disabled={sending || !message.trim()}>
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Recent Activity Bar */}
        {activities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Latest:</span>
              <span className="truncate">{activities[0]?.action}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {formatDistanceToNow(new Date(activities[0]?.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
