import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone, Mic, Bot, Users, Search, ArrowLeft, HelpCircle,
  MessageSquare, Volume2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { AllAgentVoiceCall } from '@/components/AllAgentVoiceCall';
import { HelpTooltip } from '@/components/HelpTooltip';
import { ALL_AGENTS, DIVISION_COLORS, DIVISION_NAMES } from '@/lib/all-agents';
import { useAuth } from '@/hooks/useAuth';

const VoicePage = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const filteredAgents = ALL_AGENTS.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDivision = !selectedDivision || agent.division === selectedDivision;
    return matchesSearch && matchesDivision;
  });

  const handleCallAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setShowVoiceCall(true);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>;
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />
      
      <main className="flex-1 ml-[260px] p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Phone className="w-6 h-6 text-primary" />
                  Voice Calls with AI Agents
                </h1>
                <p className="text-muted-foreground">
                  Have real-time voice conversations with any of your 25 AI agents
                </p>
              </div>
            </div>
            <HelpTooltip
              title="Voice Calls"
              description="Speak directly with any AI agent using real-time voice technology. Perfect for brainstorming, quick updates, or when typing feels too slow."
            />
          </div>

          {/* How It Works */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">How Voice Calls Work</h3>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Select an agent from the list below based on what you need help with</li>
                    <li>2. Click "Start Call" and allow microphone access when prompted</li>
                    <li>3. Start speaking naturally - the agent will respond in real-time</li>
                    <li>4. Click "End Call" when you're done</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Call - CEO */}
          <Card className="border-primary/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bot className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Ava - Your AI CEO</h3>
                    <p className="text-muted-foreground">Strategic leadership, business planning, and task delegation</p>
                    <Badge className="mt-2">Recommended for new users</Badge>
                  </div>
                </div>
                <Button size="lg" onClick={() => handleCallAgent('ceo')} className="gap-2">
                  <Phone className="w-5 h-5" />
                  Call CEO
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agents by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={!selectedDivision ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDivision(null)}
              >
                All
              </Button>
              {Object.entries(DIVISION_NAMES).map(([key, name]) => (
                <Button
                  key={key}
                  variant={selectedDivision === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDivision(key)}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${DIVISION_COLORS[agent.division]}`}>
                        <agent.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{agent.name}</h4>
                        <p className="text-sm text-muted-foreground">{agent.role}</p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {DIVISION_NAMES[agent.division]}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                      {agent.description}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => handleCallAgent(agent.id)}
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => navigate('/dashboard')}
                      >
                        <MessageSquare className="w-3 h-3" />
                        Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Voice Call Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-1">🎯 Be Specific</h4>
                  <p className="text-muted-foreground">Tell the agent exactly what you need help with for the best responses.</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-1">⏸️ Pause Between Thoughts</h4>
                  <p className="text-muted-foreground">The agent listens for pauses to know when you're done speaking.</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-1">🔄 You Can Interrupt</h4>
                  <p className="text-muted-foreground">Feel free to jump in anytime - just like a real conversation.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Voice Call Modal */}
      <AllAgentVoiceCall
        isOpen={showVoiceCall}
        onClose={() => setShowVoiceCall(false)}
        preselectedAgentId={selectedAgentId || undefined}
      />
    </div>
  );
};

export default VoicePage;
