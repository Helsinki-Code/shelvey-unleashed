import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, Eye, EyeOff, Save, CheckCircle, AlertCircle, 
  Loader2, Shield, Settings, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface APIKey {
  id: string;
  key_name: string;
  display_name: string;
  description: string | null;
  is_configured: boolean;
  is_required: boolean;
  category: string;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  ai: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  voice: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  social: { bg: 'bg-sky-500/10', text: 'text-sky-400' },
  marketing: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  automation: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  payments: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  design: { bg: 'bg-pink-500/10', text: 'text-pink-400' },
  general: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

export const AdminAPIKeys = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } else {
      setApiKeys(data || []);
    }
    setIsLoading(false);
  };

  const handleSaveKey = async (keyName: string) => {
    const value = keyValues[keyName];
    if (!value || value.trim() === '') {
      toast.error('Please enter a value');
      return;
    }

    setSavingKey(keyName);

    // Update the is_configured status in database
    const { error } = await supabase
      .from('api_keys')
      .update({ is_configured: true, updated_at: new Date().toISOString() })
      .eq('key_name', keyName);

    if (error) {
      console.error('Error updating API key:', error);
      toast.error('Failed to save API key');
    } else {
      // Update local state
      setApiKeys(prev => prev.map(k => 
        k.key_name === keyName ? { ...k, is_configured: true } : k
      ));
      setEditingKey(null);
      setKeyValues(prev => ({ ...prev, [keyName]: '' }));
      toast.success(`${keyName} configured successfully`);

      // Check if this key enables any MCP servers and update their status
      await updateMCPServerStatus(keyName);
    }

    setSavingKey(null);
  };

  const updateMCPServerStatus = async (keyName: string) => {
    // Map key names to their corresponding MCP servers
    const keyToServers: Record<string, string[]> = {
      'OPENAI_API_KEY': ['mcp-browseruse', 'mcp-agentmcp', 'mcp-callcenter'],
      'ANTHROPIC_API_KEY': ['mcp-browseruse'],
      'PERPLEXITY_API_KEY': ['mcp-perplexity'],
      'FAL_KEY': ['mcp-falai'],
      '21ST_DEV_API_KEY': ['mcp-21stdev'],
      'GOOGLE_MAPS_API_KEY': ['mcp-maps'],
      'GOOGLE_CLIENT_ID': ['mcp-googlecalendar'],
      'GOOGLE_CLIENT_SECRET': ['mcp-googlecalendar'],
      'VAPI_TOKEN': ['mcp-vapi'],
      'STRIPE_SECRET_KEY': ['mcp-stripe'],
      'FACEBOOK_ACCESS_TOKEN': ['mcp-facebook'],
      'FACEBOOK_PAGE_ID': ['mcp-facebook'],
      'FACEBOOK_ADS_TOKEN': ['mcp-facebookads'],
      'GOOGLE_ADS_DEVELOPER_TOKEN': ['mcp-googleads'],
      'LINKED_API_TOKEN': ['mcp-linkedin'],
      'IDENTIFICATION_TOKEN': ['mcp-linkedin'],
      'YOUTUBE_CLIENT_SECRET_FILE': ['mcp-youtube'],
    };

    const servers = keyToServers[keyName];
    if (servers) {
      for (const serverId of servers) {
        await supabase
          .from('mcp_server_status')
          .update({ status: 'syncing', updated_at: new Date().toISOString() })
          .eq('server_id', serverId);
      }
    }
  };

  const categories = [...new Set(apiKeys.map(k => k.category))];
  const filteredKeys = categoryFilter === 'all' 
    ? apiKeys 
    : apiKeys.filter(k => k.category === categoryFilter);

  const configuredCount = apiKeys.filter(k => k.is_configured).length;
  const requiredCount = apiKeys.filter(k => k.is_required).length;
  const requiredConfigured = apiKeys.filter(k => k.is_required && k.is_configured).length;

  if (isLoading) {
    return (
      <Card className="glass-morphism cyber-border">
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-morphism cyber-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Key className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{configuredCount}/{apiKeys.length}</p>
              <p className="text-sm text-muted-foreground">Keys Configured</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-morphism cyber-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{requiredConfigured}/{requiredCount}</p>
              <p className="text-sm text-muted-foreground">Required Keys Set</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-morphism cyber-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Math.round((configuredCount / apiKeys.length) * 100)}%
              </p>
              <p className="text-sm text-muted-foreground">Setup Complete</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('all')}
        >
          All ({apiKeys.length})
        </Button>
        {categories.map(cat => (
          <Button
            key={cat}
            variant={categoryFilter === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)} ({apiKeys.filter(k => k.category === cat).length})
          </Button>
        ))}
      </div>

      {/* API Keys List */}
      <Card className="glass-morphism cyber-border">
        <CardHeader>
          <CardTitle className="cyber-text flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            API Keys Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredKeys.map((key, index) => {
              const catStyle = categoryColors[key.category] || categoryColors.general;
              const isEditing = editingKey === key.key_name;

              return (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-4 rounded-xl border transition-all ${
                    key.is_configured 
                      ? 'bg-emerald-500/5 border-emerald-500/30' 
                      : key.is_required 
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-card border-border/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <code className="text-sm font-mono text-foreground">{key.key_name}</code>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}>
                          {key.category}
                        </span>
                        {key.is_required && (
                          <Badge variant="outline" className="text-amber-400 border-amber-400/30">Required</Badge>
                        )}
                        {key.is_configured && (
                          <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Configured
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{key.description}</p>

                      {isEditing && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 flex gap-2"
                        >
                          <div className="relative flex-1">
                            <Input
                              type={showValues[key.key_name] ? 'text' : 'password'}
                              placeholder={`Enter ${key.display_name}...`}
                              value={keyValues[key.key_name] || ''}
                              onChange={(e) => setKeyValues(prev => ({ ...prev, [key.key_name]: e.target.value }))}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowValues(prev => ({ ...prev, [key.key_name]: !prev[key.key_name] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showValues[key.key_name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <Button 
                            onClick={() => handleSaveKey(key.key_name)}
                            disabled={savingKey === key.key_name}
                          >
                            {savingKey === key.key_name ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button variant="outline" onClick={() => setEditingKey(null)}>
                            Cancel
                          </Button>
                        </motion.div>
                      )}
                    </div>

                    {!isEditing && (
                      <Button
                        variant={key.is_configured ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => setEditingKey(key.key_name)}
                      >
                        {key.is_configured ? 'Update' : 'Configure'}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};
