import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Zap, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_AGENTS, DIVISION_COLORS, DIVISION_NAMES, AgentConfig } from "@/lib/all-agents";

interface TaskDialogState {
  isOpen: boolean;
  agent: AgentConfig | null;
  taskDescription: string;
  isSubmitting: boolean;
}

export const AllAgentsGrid = () => {
  const [filter, setFilter] = useState<string>("all");
  const [taskDialog, setTaskDialog] = useState<TaskDialogState>({
    isOpen: false,
    agent: null,
    taskDescription: "",
    isSubmitting: false
  });
  const [taskResult, setTaskResult] = useState<string | null>(null);

  const divisions = ["all", ...Object.keys(DIVISION_NAMES)];

  const filteredAgents = filter === "all" 
    ? ALL_AGENTS 
    : ALL_AGENTS.filter(agent => agent.division === filter);

  const openTaskDialog = (agent: AgentConfig) => {
    setTaskDialog({
      isOpen: true,
      agent,
      taskDescription: "",
      isSubmitting: false
    });
    setTaskResult(null);
  };

  const closeTaskDialog = () => {
    setTaskDialog({
      isOpen: false,
      agent: null,
      taskDescription: "",
      isSubmitting: false
    });
  };

  const submitTask = async () => {
    if (!taskDialog.agent || !taskDialog.taskDescription.trim()) {
      toast.error("Please enter a task description");
      return;
    }

    setTaskDialog(prev => ({ ...prev, isSubmitting: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to assign tasks");
        return;
      }

      // Create task in database
      const { data: task, error: taskError } = await supabase
        .from('agent_tasks')
        .insert({
          user_id: session.user.id,
          assigned_agent_id: taskDialog.agent.id,
          task_type: taskDialog.agent.role,
          task_description: taskDialog.taskDescription,
          priority: 'medium',
          status: 'pending'
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Execute the task
      const response = await supabase.functions.invoke('execute-agent-task', {
        body: {
          taskId: task.id,
          agentId: taskDialog.agent.id,
          taskType: taskDialog.agent.role,
          taskDescription: taskDialog.taskDescription,
          inputData: { task: taskDialog.taskDescription }
        }
      });

      if (response.error) throw response.error;

      setTaskResult(response.data.output);
      toast.success(`${taskDialog.agent.name} completed the task!`);
    } catch (error: any) {
      console.error("Task error:", error);
      toast.error(error.message || "Failed to execute task");
    } finally {
      setTaskDialog(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Division Filter */}
      <div className="flex flex-wrap gap-2">
        {divisions.map((division) => (
          <Button
            key={division}
            variant={filter === division ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(division)}
            className="capitalize"
          >
            {division === "all" ? "All Agents" : DIVISION_NAMES[division]}
          </Button>
        ))}
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredAgents.map((agent, index) => {
            const Icon = agent.icon;
            const divisionColor = DIVISION_COLORS[agent.division];
            
            return (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card 
                  className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all cursor-pointer group h-full"
                  onClick={() => openTaskDialog(agent)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${divisionColor} shrink-0`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {agent.role}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                      {agent.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {agent.preferredMCP.slice(0, 3).map((mcp) => (
                        <Badge key={mcp} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {mcp}
                        </Badge>
                      ))}
                      {agent.preferredMCP.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          +{agent.preferredMCP.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Task Assignment Dialog */}
      <Dialog open={taskDialog.isOpen} onOpenChange={(open) => !open && closeTaskDialog()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {taskDialog.agent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${DIVISION_COLORS[taskDialog.agent.division]}`}>
                    <taskDialog.agent.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span>{taskDialog.agent.name}</span>
                    <p className="text-sm font-normal text-muted-foreground">
                      {taskDialog.agent.role}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {taskDialog.agent.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs text-muted-foreground">Capabilities:</span>
                    {taskDialog.agent.capabilities.map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs text-muted-foreground">MCP Servers:</span>
                    {taskDialog.agent.preferredMCP.map((mcp) => (
                      <Badge key={mcp} variant="secondary" className="text-xs">
                        {mcp}
                      </Badge>
                    ))}
                  </div>
                </div>

                {!taskResult ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Task Description</label>
                    <Textarea
                      placeholder={`Describe what you want ${taskDialog.agent.name} to do...`}
                      value={taskDialog.taskDescription}
                      onChange={(e) => setTaskDialog(prev => ({ ...prev, taskDescription: e.target.value }))}
                      rows={4}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Task Result
                    </label>
                    <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap">{taskResult}</pre>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                {!taskResult ? (
                  <Button
                    onClick={submitTask}
                    disabled={taskDialog.isSubmitting || !taskDialog.taskDescription.trim()}
                  >
                    {taskDialog.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Execute Task
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setTaskResult(null)}>
                      New Task
                    </Button>
                    <Button onClick={closeTaskDialog}>
                      Done
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
