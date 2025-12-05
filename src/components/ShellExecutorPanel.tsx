import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Terminal, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ShellCommand {
  id: string;
  command: string;
  working_directory: string;
  risk_level: string;
  status: string;
  output: string | null;
  error: string | null;
  created_at: string;
  executed_at: string | null;
}

export const ShellExecutorPanel = () => {
  const { toast } = useToast();
  const [command, setCommand] = useState('');
  const [workingDir, setWorkingDir] = useState('/');
  const [isLoading, setIsLoading] = useState(false);
  const [commands, setCommands] = useState<ShellCommand[]>([]);
  const [pendingApproval, setPendingApproval] = useState<ShellCommand | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  useEffect(() => {
    loadHistory();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('shell-commands')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shell_command_approvals'
        },
        () => {
          loadHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('shell-executor', {
        body: { action: 'history', limit: 20 }
      });

      if (error) throw error;
      setCommands(data.commands || []);
    } catch (error: any) {
      console.error('Failed to load history:', error);
    }
  };

  const handleSubmit = async () => {
    if (!command.trim()) {
      toast({ title: 'Error', description: 'Please enter a command', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shell-executor', {
        body: {
          action: 'submit',
          command,
          working_directory: workingDir
        }
      });

      if (error) throw error;

      if (data.requires_approval) {
        // Find the pending command and show approval dialog
        const pendingCmd = {
          id: data.command_id,
          command,
          working_directory: workingDir,
          risk_level: data.risk_level,
          status: 'pending',
          output: null,
          error: null,
          created_at: new Date().toISOString(),
          executed_at: null
        };
        setPendingApproval(pendingCmd);
        setShowApprovalDialog(true);
        toast({ 
          title: 'Approval Required', 
          description: `Command requires approval due to ${data.risk_level} risk level`,
          variant: 'destructive'
        });
      } else {
        toast({ 
          title: 'Executed', 
          description: data.output || 'Command executed successfully'
        });
        setCommand('');
      }

      loadHistory();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!pendingApproval) return;

    setIsLoading(true);
    try {
      // First approve
      await supabase.functions.invoke('shell-executor', {
        body: { action: 'approve', command_id: pendingApproval.id }
      });

      // Then execute
      const { data, error } = await supabase.functions.invoke('shell-executor', {
        body: { action: 'execute', command_id: pendingApproval.id }
      });

      if (error) throw error;

      toast({ 
        title: data.success ? 'Executed' : 'Failed', 
        description: data.output || data.error || 'Command executed',
        variant: data.success ? 'default' : 'destructive'
      });

      setShowApprovalDialog(false);
      setPendingApproval(null);
      setCommand('');
      loadHistory();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!pendingApproval) return;

    try {
      await supabase.functions.invoke('shell-executor', {
        body: { action: 'reject', command_id: pendingApproval.id }
      });

      toast({ title: 'Rejected', description: 'Command was rejected' });
      setShowApprovalDialog(false);
      setPendingApproval(null);
      loadHistory();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getRiskBadge = (level: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      low: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
      medium: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: AlertTriangle },
      high: { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: ShieldAlert },
      critical: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: ShieldAlert }
    };
    const config = variants[level] || variants.low;
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {level}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      approved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
      executed: 'bg-green-500/10 text-green-500 border-green-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    
    return (
      <Badge variant="outline" className={variants[status] || ''}>
        {status}
      </Badge>
    );
  };

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Shell Executor
          </CardTitle>
          <CardDescription>
            Execute shell commands with approval workflow for dangerous operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Working directory"
                value={workingDir}
                onChange={(e) => setWorkingDir(e.target.value)}
                className="w-32"
              />
              <Input
                placeholder="Enter command..."
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="font-mono flex-1"
              />
              <Button onClick={handleSubmit} disabled={isLoading}>
                <Play className="h-4 w-4 mr-1" />
                Run
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              High-risk commands (rm -rf, sudo, etc.) require approval before execution
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Command History</span>
            <Button size="sm" variant="ghost" onClick={loadHistory}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-80 rounded-md border border-border">
            {commands.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No commands executed yet
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {commands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="p-3 rounded-lg border border-border bg-muted/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono bg-background/50 px-2 py-1 rounded">
                        {cmd.command}
                      </code>
                      <div className="flex items-center gap-2">
                        {getRiskBadge(cmd.risk_level)}
                        {getStatusBadge(cmd.status)}
                      </div>
                    </div>
                    
                    {cmd.output && (
                      <div className="bg-background/50 rounded p-2 text-xs font-mono text-muted-foreground">
                        <pre className="whitespace-pre-wrap">{cmd.output}</pre>
                      </div>
                    )}
                    
                    {cmd.error && (
                      <div className="bg-destructive/10 text-destructive rounded p-2 text-xs font-mono">
                        <pre className="whitespace-pre-wrap">{cmd.error}</pre>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>Dir: {cmd.working_directory}</span>
                      <span>{new Date(cmd.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Approval Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This command has been flagged as potentially dangerous:</p>
              <code className="block bg-muted p-3 rounded font-mono text-sm">
                {pendingApproval?.command}
              </code>
              <div className="flex items-center gap-2">
                <span>Risk Level:</span>
                {pendingApproval && getRiskBadge(pendingApproval.risk_level)}
              </div>
              <p className="text-destructive">
                Are you sure you want to execute this command? This action may be irreversible.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleReject}>
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} className="bg-destructive hover:bg-destructive/90">
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve & Execute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
