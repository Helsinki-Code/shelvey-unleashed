import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, CheckCircle2, Loader2, Key, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface MCPServer {
  id: string;
  server_id: string;
  server_name: string;
  status: string;
  latency_ms: number | null;
  requests_today: number | null;
  metadata: Record<string, any> | null;
}

export const UserMCPServers = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchServers();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('user-mcp-servers')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_mcp_servers',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchServers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchServers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_mcp_servers')
      .select('*')
      .eq('user_id', user.id)
      .order('server_name');

    if (error) {
      console.error('Error fetching MCP servers:', error);
    } else {
      // Cast metadata to avoid type issues
      const typedServers = (data || []).map(s => ({
        ...s,
        metadata: (s.metadata && typeof s.metadata === 'object' && !Array.isArray(s.metadata)) 
          ? s.metadata as Record<string, any>
          : null
      }));
      setServers(typedServers);
    }
    
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchServers();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'connected':
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Connected' };
      case 'syncing':
        return { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Syncing' };
      default:
        return { icon: Key, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Requires Key' };
    }
  };

  const categoryColors: Record<string, string> = {
    ai: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    development: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    finance: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    location: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    productivity: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    design: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    social: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  const stats = {
    connected: servers.filter(s => s.status === 'connected').length,
    syncing: servers.filter(s => s.status === 'syncing').length,
    requiresKey: servers.filter(s => s.status === 'requires-key').length,
    totalRequests: servers.reduce((acc, s) => acc + (s.requests_today || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-morphism cyber-border">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{stats.connected}</div>
            <div className="text-sm text-muted-foreground">Connected</div>
          </CardContent>
        </Card>
        <Card className="glass-morphism cyber-border">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">{stats.syncing}</div>
            <div className="text-sm text-muted-foreground">Syncing</div>
          </CardContent>
        </Card>
        <Card className="glass-morphism cyber-border">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-rose-400">{stats.requiresKey}</div>
            <div className="text-sm text-muted-foreground">Needs Key</div>
          </CardContent>
        </Card>
        <Card className="glass-morphism cyber-border">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{stats.totalRequests}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </CardContent>
        </Card>
      </div>

      {/* Server List */}
      <Card className="glass-morphism cyber-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="cyber-text flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Your MCP Servers
              </CardTitle>
              <CardDescription>
                Configure API keys in the API Keys tab to connect servers
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-3">
            {servers.map((server, i) => {
              const statusConfig = getStatusConfig(server.status);
              const StatusIcon = statusConfig.icon;
              const metadata = server.metadata || {};
              const category = metadata.category || 'general';
              
              return (
                <motion.div
                  key={server.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg ${statusConfig.bg} flex items-center justify-center`}>
                      <StatusIcon className={`w-5 h-5 ${statusConfig.color} ${server.status === 'syncing' ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{server.server_name}</span>
                        <Badge variant="outline" className={categoryColors[category] || ''}>
                          {category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {metadata.toolCount || 0} tools available
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    {server.status === 'connected' && (
                      <>
                        <div className="text-center">
                          <div className="font-medium text-foreground">{server.latency_ms || 0}ms</div>
                          <div className="text-xs text-muted-foreground">Latency</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-foreground">{server.requests_today || 0}</div>
                          <div className="text-xs text-muted-foreground">Requests</div>
                        </div>
                      </>
                    )}
                    <Badge className={statusConfig.bg}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
            
            {servers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No MCP servers configured yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
