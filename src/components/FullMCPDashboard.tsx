import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search, Server, Zap, CheckCircle, Clock, AlertCircle, 
  Activity, Wifi, WifiOff, RefreshCw, ExternalLink, Lock, Unlock
} from 'lucide-react';
import { mcpServers, categoryColors, MCPServer } from '@/lib/mcp-servers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HelpTooltip, HELP_CONTENT } from './HelpTooltip';

interface ServerStatus {
  server_id: string;
  status: 'connected' | 'syncing' | 'error' | 'offline';
  latency_ms: number | null;
  requests_today: number;
  last_ping: string | null;
}

export function FullMCPDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [serverStatuses, setServerStatuses] = useState<Record<string, ServerStatus>>({});
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get all unique categories
  const categories = ['all', ...new Set(mcpServers.map(s => s.category))];

  useEffect(() => {
    fetchServerStatuses();
    
    const channel = supabase
      .channel('mcp-status-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'mcp_server_status' 
      }, () => {
        fetchServerStatuses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchServerStatuses = async () => {
    try {
      const { data } = await supabase
        .from('mcp_server_status')
        .select('*');
      
      if (data) {
        const statusMap: Record<string, ServerStatus> = {};
        data.forEach(s => {
          statusMap[s.server_id] = s as ServerStatus;
        });
        setServerStatuses(statusMap);
      }
    } catch (error) {
      console.error('Error fetching server statuses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async (server: MCPServer) => {
    setTestingServer(server.id);
    try {
      const { data, error } = await supabase.functions.invoke('mcp-health-check', {
        body: { serverId: server.id }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`${server.name} is online! (${data.latency}ms)`);
        fetchServerStatuses();
      } else {
        toast.error(data?.error || 'Connection failed');
      }
    } catch (err) {
      toast.error('Failed to test connection');
    } finally {
      setTestingServer(null);
    }
  };

  const filteredServers = mcpServers.filter(server => {
    const matchesSearch = 
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const connectedCount = mcpServers.filter(s => s.status === 'connected').length;
  const requiresKeyCount = mcpServers.filter(s => s.status === 'requires-key').length;
  const totalTools = mcpServers.reduce((acc, s) => acc + (s.toolCount || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-emerald-500';
      case 'syncing': return 'bg-yellow-500 animate-pulse';
      case 'requires-key': return 'bg-orange-500';
      default: return 'bg-muted-foreground';
    }
  };

  const getStatusBadge = (server: MCPServer) => {
    const status = serverStatuses[server.id];
    if (status?.status === 'error') {
      return <Badge variant="destructive" className="text-xs">Error</Badge>;
    }
    
    switch (server.status) {
      case 'connected':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-xs">
            <Wifi className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case 'syncing':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-xs">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        );
      case 'requires-key':
        return (
          <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 text-xs">
            <Lock className="w-3 h-3 mr-1" />
            Needs Key
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">MCP Server Network</h2>
          <HelpTooltip {...HELP_CONTENT.mcp} />
        </div>
        <Button variant="outline" size="sm" onClick={fetchServerStatuses}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{mcpServers.length}</p>
                <p className="text-xs text-muted-foreground">Total MCP Servers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Wifi className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{connectedCount}</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Lock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{requiresKeyCount}</p>
                <p className="text-xs text-muted-foreground">Needs API Key</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{totalTools}+</p>
                <p className="text-xs text-muted-foreground">Available Tools</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search MCP servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50"
          />
        </div>
        
        <ScrollArea className="w-full md:w-auto">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="h-10 bg-muted/50 flex-wrap">
              {categories.slice(0, 10).map(cat => (
                <TabsTrigger 
                  key={cat} 
                  value={cat} 
                  className="text-xs capitalize whitespace-nowrap"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </ScrollArea>
      </div>

      {/* Server Grid */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-4">
          <AnimatePresence mode="popLayout">
            {filteredServers.map((server, index) => {
              const status = serverStatuses[server.id];
              const catColor = categoryColors[server.category];
              
              return (
                <motion.div
                  key={server.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="h-full bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-all duration-300">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl flex-shrink-0">{server.icon}</span>
                          <CardTitle className="text-sm truncate">{server.name}</CardTitle>
                        </div>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(server.status)}`} />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {server.description}
                      </p>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* Category & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] ${catColor?.bg} ${catColor?.text} ${catColor?.border}`}
                        >
                          {server.category}
                        </Badge>
                        {getStatusBadge(server)}
                      </div>

                      {/* Metrics */}
                      {status && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {status.latency_ms || server.latency || '—'}ms
                          </span>
                          <span>{status.requests_today || server.requestsToday || 0} req</span>
                        </div>
                      )}

                      {/* Tool Count */}
                      {server.toolCount && (
                        <div className="text-xs text-muted-foreground">
                          {server.toolCount} tools available
                        </div>
                      )}

                      {/* Required Keys */}
                      {server.envRequired && server.envRequired.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {server.envRequired.slice(0, 2).map(key => (
                            <Badge key={key} variant="secondary" className="text-[9px] px-1">
                              {key}
                            </Badge>
                          ))}
                          {server.envRequired.length > 2 && (
                            <Badge variant="secondary" className="text-[9px] px-1">
                              +{server.envRequired.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* User Keys Warning */}
                      {server.requiresUserKeys && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-500">
                          <AlertCircle className="w-3 h-3" />
                          Connects to your account
                        </div>
                      )}

                      {/* Test Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-7"
                        onClick={() => testConnection(server)}
                        disabled={testingServer === server.id}
                      >
                        {testingServer === server.id ? (
                          <Clock className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        Test Connection
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        {filteredServers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Server className="h-12 w-12 mb-4 opacity-50" />
            <p>No MCP servers found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}