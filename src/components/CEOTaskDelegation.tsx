import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ALL_AGENTS, DIVISION_COLORS, DIVISION_NAMES } from '@/lib/all-agents';
import { 
  Bot, Send, Loader2, ChevronDown, ChevronUp,
  Zap, Target, Clock, CheckCircle, Search
} from 'lucide-react';
import { toast } from 'sonner';

interface CEOTaskDelegationProps {
  projectId?: string;
  onTaskDelegated?: () => void;
}

interface QuickAction {
  label: string;
  taskType: string;
  description: string;
  suggestedAgent: string;
  priority: 'high' | 'medium' | 'low';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Market Research',
    taskType: 'market_research',
    description: 'Conduct comprehensive market analysis and competitive research',
    suggestedAgent: 'agent-1',
    priority: 'high'
  },
  {
    label: 'Brand Identity',
    taskType: 'brand_identity',
    description: 'Create brand guidelines, logo concepts, and visual identity',
    suggestedAgent: 'agent-6',
    priority: 'high'
  },
  {
    label: 'Content Creation',
    taskType: 'content_creation',
    description: 'Generate marketing content, blog posts, and social media content',
    suggestedAgent: 'agent-7',
    priority: 'medium'
  },
  {
    label: 'Website Design',
    taskType: 'website_design',
    description: 'Design and generate a professional business website',
    suggestedAgent: 'agent-8',
    priority: 'high'
  },
  {
    label: 'SEO Optimization',
    taskType: 'seo_optimization',
    description: 'Optimize website and content for search engines',
    suggestedAgent: 'agent-9',
    priority: 'medium'
  },
  {
    label: 'Lead Generation',
    taskType: 'lead_generation',
    description: 'Generate and qualify leads for the sales pipeline',
    suggestedAgent: 'agent-13',
    priority: 'high'
  }
];

export function CEOTaskDelegation({ projectId, onTaskDelegated }: CEOTaskDelegationProps) {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskType, setTaskType] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAgentList, setShowAgentList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAgents = ALL_AGENTS.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.division.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const agentsByDivision = filteredAgents.reduce((acc, agent) => {
    if (!acc[agent.division]) acc[agent.division] = [];
    acc[agent.division].push(agent);
    return acc;
  }, {} as Record<string, typeof ALL_AGENTS>);

  const handleQuickAction = (action: QuickAction) => {
    setTaskType(action.taskType);
    setTaskDescription(action.description);
    setSelectedAgent(action.suggestedAgent);
    setPriority(action.priority);
  };

  const handleDelegateTask = async () => {
    if (!selectedAgent || !taskDescription.trim() || !user) {
      toast.error('Please select an agent and provide task details');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedAgentData = ALL_AGENTS.find(a => a.id === selectedAgent);
      
      // Create task in database
      const { error: taskError } = await supabase.from('agent_tasks').insert({
        user_id: user.id,
        project_id: projectId || null,
        assigned_agent_id: selectedAgent,
        task_type: taskType || 'custom',
        task_description: taskDescription,
        priority,
        delegated_by: 'ceo',
        status: 'pending',
        mcp_servers_used: selectedAgentData?.preferredMCP || []
      });

      if (taskError) throw taskError;

      // Log the delegation activity
      await supabase.from('agent_activity_logs').insert({
        agent_id: 'ceo-agent',
        agent_name: 'CEO Agent',
        action: `Delegated "${taskType || 'custom task'}" to ${selectedAgentData?.name}`,
        status: 'completed',
        metadata: {
          target_agent: selectedAgent,
          priority,
          project_id: projectId
        }
      });

      // Also log for the receiving agent
      await supabase.from('agent_activity_logs').insert({
        agent_id: selectedAgent,
        agent_name: selectedAgentData?.name || 'Unknown Agent',
        action: `Received task: ${taskDescription.slice(0, 50)}...`,
        status: 'pending',
        metadata: {
          delegated_by: 'ceo',
          priority,
          project_id: projectId
        }
      });

      toast.success(`Task delegated to ${selectedAgentData?.name}`);
      
      // Reset form
      setSelectedAgent('');
      setTaskDescription('');
      setTaskType('');
      setPriority('medium');
      
      onTaskDelegated?.();
    } catch (error: any) {
      console.error('Delegation error:', error);
      toast.error(error.message || 'Failed to delegate task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAgentData = ALL_AGENTS.find(a => a.id === selectedAgent);

  return (
    <Card className="bg-card/50 backdrop-blur border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          CEO Task Delegation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div>
          <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {QUICK_ACTIONS.map(action => (
              <Button
                key={action.taskType}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="justify-start text-left h-auto py-2 hover:border-primary/50"
              >
                <Target className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Agent Selection */}
        <div>
          <h4 className="text-sm font-medium mb-2">Select Agent</h4>
          
          {selectedAgentData ? (
            <div 
              onClick={() => setShowAgentList(!showAgentList)}
              className="p-3 rounded-lg border border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${DIVISION_COLORS[selectedAgentData.division]} flex items-center justify-center`}>
                    <selectedAgentData.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{selectedAgentData.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedAgentData.role}</div>
                  </div>
                </div>
                {showAgentList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAgentList(!showAgentList)}
              className="w-full justify-between"
            >
              <span className="text-muted-foreground">Select an agent...</span>
              {showAgentList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          )}

          <AnimatePresence>
            {showAgentList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 border border-border rounded-lg overflow-hidden"
              >
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search agents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="p-2 space-y-4">
                    {Object.entries(agentsByDivision).map(([division, agents]) => (
                      <div key={division}>
                        <div className="text-xs font-medium text-muted-foreground uppercase mb-2 px-2">
                          {DIVISION_NAMES[division]}
                        </div>
                        <div className="space-y-1">
                          {agents.map(agent => (
                            <div
                              key={agent.id}
                              onClick={() => {
                                setSelectedAgent(agent.id);
                                setShowAgentList(false);
                                setSearchQuery('');
                              }}
                              className={`p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedAgent === agent.id 
                                  ? 'bg-primary/20 border border-primary/30' 
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${DIVISION_COLORS[agent.division]} flex items-center justify-center`}>
                                  <agent.icon className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{agent.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{agent.role}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Task Details */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Task Type</label>
            <Input
              placeholder="e.g., market_research, content_creation"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Task Description</label>
            <Textarea
              placeholder="Describe what you want the agent to accomplish..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    High Priority
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medium Priority
                  </div>
                </SelectItem>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Low Priority
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Delegate Button */}
        <Button 
          onClick={handleDelegateTask}
          disabled={!selectedAgent || !taskDescription.trim() || isSubmitting}
          className="w-full gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Delegate Task
        </Button>

        {/* Selected Agent Capabilities */}
        {selectedAgentData && (
          <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-medium mb-2">Agent Capabilities</h4>
            <div className="flex flex-wrap gap-1">
              {selectedAgentData.capabilities.map(cap => (
                <Badge key={cap} variant="outline" className="text-xs">
                  {cap}
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">MCP Servers:</span>
              {selectedAgentData.preferredMCP.map(mcp => (
                <Badge key={mcp} variant="secondary" className="text-xs">
                  {mcp}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}