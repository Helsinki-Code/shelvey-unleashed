import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Zap, 
  Globe, 
  Lock, 
  Unlock, 
  ExternalLink,
  CheckCircle,
  Clock,
  Server,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MCPServerRegistry {
  id: string;
  server_id: string;
  server_name: string;
  server_url: string;
  description: string | null;
  category: string;
  is_public: boolean;
  requires_auth: boolean;
  auth_type: string | null;
  tools: string[];
  enabled: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  finance: <span className="text-lg">💰</span>,
  development: <span className="text-lg">💻</span>,
  communication: <span className="text-lg">💬</span>,
  productivity: <span className="text-lg">📋</span>,
  design: <span className="text-lg">🎨</span>,
  crm: <span className="text-lg">👥</span>,
  support: <span className="text-lg">🎧</span>,
  marketing: <span className="text-lg">📣</span>,
  storage: <span className="text-lg">☁️</span>,
  general: <span className="text-lg">⚡</span>,
};

const categoryColors: Record<string, string> = {
  finance: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  development: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  communication: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  productivity: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  design: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  crm: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  support: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  marketing: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  storage: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  general: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export const MCPBrowser: React.FC = () => {
  const [servers, setServers] = useState<MCPServerRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [testingServer, setTestingServer] = useState<string | null>(null);

  useEffect(() => {
    fetchServers();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('mcp-registry-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mcp_server_registry'
      }, () => {
        fetchServers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('mcp_server_registry')
        .select('*')
        .eq('enabled', true)
        .order('server_name');

      if (error) throw error;
      
      // Parse tools JSON
      const parsedServers = (data || []).map(server => ({
        ...server,
        tools: typeof server.tools === 'string' 
          ? JSON.parse(server.tools) 
          : (server.tools || [])
      }));
      
      setServers(parsedServers);
    } catch (err) {
      console.error('Error fetching MCP servers:', err);
      toast.error('Failed to load MCP servers');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (server: MCPServerRegistry) => {
    setTestingServer(server.server_id);
    try {
      const { data, error } = await supabase.functions.invoke('openai-mcp-connector', {
        body: {
          serverId: server.server_id,
          tool: 'ping',
          arguments: {}
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Successfully connected to ${server.server_name}`);
      } else {
        toast.error(data?.error || 'Connection test failed');
      }
    } catch (err) {
      toast.error('Failed to test connection');
    } finally {
      setTestingServer(null);
    }
  };

  const categories = ['all', ...new Set(servers.map(s => s.category))];
  
  const filteredServers = servers.filter(server => {
    const matchesSearch = server.server_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         server.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: servers.length,
    public: servers.filter(s => s.is_public).length,
    requiresAuth: servers.filter(s => s.requires_auth).length,
    categories: new Set(servers.map(s => s.category)).size
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total MCPs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Globe className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.public}</p>
                <p className="text-xs text-muted-foreground">Public Access</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Lock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.requiresAuth}</p>
                <p className="text-xs text-muted-foreground">Needs Auth</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Sparkles className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.categories}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
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
        
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full md:w-auto">
          <TabsList className="h-10 bg-muted/50">
            {categories.slice(0, 6).map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs capitalize">
                {cat === 'all' ? 'All' : categoryIcons[cat] || cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Server Grid */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
          <AnimatePresence mode="popLayout">
            {filteredServers.map((server, index) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {categoryIcons[server.category] || <Zap className="h-5 w-5" />}
                        <CardTitle className="text-base">{server.server_name}</CardTitle>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${categoryColors[server.category] || categoryColors.general}`}
                      >
                        {server.category}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs line-clamp-2">
                      {server.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Auth Info */}
                    <div className="flex items-center gap-2 text-xs">
                      {server.requires_auth ? (
                        <>
                          <Lock className="h-3 w-3 text-amber-500" />
                          <span className="text-muted-foreground">
                            Requires {server.auth_type || 'authentication'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3 w-3 text-emerald-500" />
                          <span className="text-muted-foreground">Public access</span>
                        </>
                      )}
                    </div>
                    
                    {/* Tools Preview */}
                    {server.tools && server.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {server.tools.slice(0, 3).map((tool, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tool}
                          </Badge>
                        ))}
                        {server.tools.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            +{server.tools.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={() => testConnection(server)}
                        disabled={testingServer === server.server_id}
                      >
                        {testingServer === server.server_id ? (
                          <Clock className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => window.open(server.server_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {filteredServers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Server className="h-12 w-12 mb-4 opacity-50" />
            <p>No MCP servers found matching your criteria</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MCPBrowser;
