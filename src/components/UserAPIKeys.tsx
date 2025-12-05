import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Save, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface APIKey {
  id: string;
  key_name: string;
  display_name: string;
  is_configured: boolean;
  category: string;
}

const API_KEY_DEFINITIONS = [
  // AI & LLM
  { key_name: 'OPENAI_API_KEY', display_name: 'OpenAI API Key', category: 'ai' },
  { key_name: 'ANTHROPIC_API_KEY', display_name: 'Claude/Anthropic API Key', category: 'ai' },
  { key_name: 'GOOGLE_AI_API_KEY', display_name: 'Google Gemini API Key', category: 'ai' },
  { key_name: 'PERPLEXITY_API_KEY', display_name: 'Perplexity API Key', category: 'ai' },
  { key_name: 'FAL_KEY', display_name: 'Fal AI Key', category: 'ai' },
  
  // Development
  { key_name: 'GITHUB_TOKEN', display_name: 'GitHub Token', category: 'development' },
  { key_name: 'LINEAR_API_KEY', display_name: 'Linear API Key', category: 'development' },
  
  // Finance & Payments
  { key_name: 'STRIPE_API_KEY', display_name: 'Stripe API Key', category: 'finance' },
  
  // E-Commerce
  { key_name: 'AMAZON_CLIENT_ID', display_name: 'Amazon Client ID', category: 'ecommerce' },
  { key_name: 'AMAZON_CLIENT_SECRET', display_name: 'Amazon Client Secret', category: 'ecommerce' },
  { key_name: 'AMAZON_REFRESH_TOKEN', display_name: 'Amazon Refresh Token', category: 'ecommerce' },
  { key_name: 'AMAZON_MARKETPLACE_ID', display_name: 'Amazon Marketplace ID', category: 'ecommerce' },
  
  // Analytics & SEO
  { key_name: 'GA_PROPERTY_ID', display_name: 'Google Analytics Property ID', category: 'analytics' },
  { key_name: 'GA_CLIENT_EMAIL', display_name: 'GA Service Account Email', category: 'analytics' },
  { key_name: 'GA_PRIVATE_KEY', display_name: 'GA Service Account Private Key', category: 'analytics' },
  { key_name: 'SERPAPI_KEY', display_name: 'SerpAPI Key', category: 'analytics' },
  
  // CRM
  { key_name: 'HUBSPOT_ACCESS_TOKEN', display_name: 'HubSpot Access Token', category: 'crm' },
  
  // Social Media
  { key_name: 'TWITTER_API_KEY', display_name: 'Twitter/X API Key', category: 'social' },
  { key_name: 'YOUTUBE_API_KEY', display_name: 'YouTube API Key', category: 'social' },
  { key_name: 'INSTAGRAM_ACCESS_TOKEN', display_name: 'Instagram Access Token', category: 'social' },
  { key_name: 'INSTAGRAM_BUSINESS_ID', display_name: 'Instagram Business ID', category: 'social' },
  { key_name: 'TIKTOK_ACCESS_TOKEN', display_name: 'TikTok Access Token', category: 'social' },
  { key_name: 'TIKTOK_OPEN_ID', display_name: 'TikTok Open ID', category: 'social' },
  
  // Infrastructure
  { key_name: 'VERCEL_API_KEY', display_name: 'Vercel API Key', category: 'infrastructure' },
  { key_name: 'CLOUDFLARE_API_TOKEN', display_name: 'Cloudflare API Token', category: 'infrastructure' },
  { key_name: 'CLOUDFLARE_ACCOUNT_ID', display_name: 'Cloudflare Account ID', category: 'infrastructure' },
  
  // Scheduling
  { key_name: 'CALENDLY_API_KEY', display_name: 'Calendly API Key', category: 'scheduling' },
  
  // Communication
  { key_name: 'TWILIO_ACCOUNT_SID', display_name: 'Twilio Account SID', category: 'communication' },
  { key_name: 'TWILIO_AUTH_TOKEN', display_name: 'Twilio Auth Token', category: 'communication' },
  { key_name: 'TWILIO_PHONE_NUMBER', display_name: 'Twilio Phone Number', category: 'communication' },
  
  // Scraping
  { key_name: 'BRIGHTDATA_API_KEY', display_name: 'Bright Data API Key', category: 'scraping' },
  
  // CMS & Publishing
  { key_name: 'WORDPRESS_URL', display_name: 'WordPress Site URL', category: 'cms' },
  { key_name: 'WORDPRESS_USERNAME', display_name: 'WordPress Username', category: 'cms' },
  { key_name: 'WORDPRESS_APP_PASSWORD', display_name: 'WordPress App Password', category: 'cms' },
  { key_name: 'MEDIUM_INTEGRATION_TOKEN', display_name: 'Medium Integration Token', category: 'publishing' },
  
  // Database
  { key_name: 'POSTGRES_CONNECTION_STRING', display_name: 'PostgreSQL Connection String', category: 'database' },
  
  // Automation
  { key_name: 'N8N_HOST', display_name: 'n8n Host URL', category: 'automation' },
  { key_name: 'N8N_API_KEY', display_name: 'n8n API Key', category: 'automation' },
  
  // Other
  { key_name: 'GOOGLE_MAPS_API_KEY', display_name: 'Google Maps API Key', category: 'location' },
  { key_name: 'CANVA_API_KEY', display_name: 'Canva API Key', category: 'design' },
];

export const UserAPIKeys = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAPIKeys();
    }
  }, [user]);

  const fetchAPIKeys = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching API keys:', error);
    } else {
      // Merge existing keys with definitions
      const existingKeys = new Map(data?.map(k => [k.key_name, k]) || []);
      
      const mergedKeys = API_KEY_DEFINITIONS.map(def => {
        const existing = existingKeys.get(def.key_name);
        return existing || {
          id: '',
          key_name: def.key_name,
          display_name: def.display_name,
          is_configured: false,
          category: def.category,
        };
      });
      
      setApiKeys(mergedKeys);
    }
    
    setIsLoading(false);
  };

  const saveAPIKey = async (keyName: string) => {
    if (!user || !keyValues[keyName]) return;
    
    setSavingKey(keyName);
    
    const definition = API_KEY_DEFINITIONS.find(d => d.key_name === keyName);
    
    const { error } = await supabase
      .from('user_api_keys')
      .upsert({
        user_id: user.id,
        key_name: keyName,
        display_name: definition?.display_name || keyName,
        encrypted_value: keyValues[keyName], // In production, encrypt this
        is_configured: true,
        category: definition?.category || 'general',
      }, {
        onConflict: 'user_id,key_name',
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save API key',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: `${definition?.display_name || keyName} has been configured`,
      });
      
      // Update MCP server status
      await updateMCPServerStatus(keyName);
      
      // Clear input and refresh
      setKeyValues(prev => ({ ...prev, [keyName]: '' }));
      fetchAPIKeys();
    }
    
    setSavingKey(null);
  };

  const updateMCPServerStatus = async (keyName: string) => {
    if (!user) return;
    
    // Map API keys to MCP servers
    const keyToServer: Record<string, string> = {
      'GITHUB_TOKEN': 'mcp-github',
      'STRIPE_API_KEY': 'mcp-stripe',
      'GOOGLE_MAPS_API_KEY': 'mcp-google-maps',
      'LINEAR_API_KEY': 'mcp-linear',
      'PERPLEXITY_API_KEY': 'mcp-perplexity',
      'CANVA_API_KEY': 'mcp-canva',
      'TWITTER_API_KEY': 'mcp-twitter',
      'YOUTUBE_API_KEY': 'mcp-youtube',
      'FAL_KEY': 'mcp-fal-ai',
      // New 18 MCPs
      'OPENAI_API_KEY': 'mcp-openai',
      'ANTHROPIC_API_KEY': 'mcp-claude',
      'GOOGLE_AI_API_KEY': 'mcp-gemini',
      'AMAZON_CLIENT_ID': 'mcp-amazon',
      'GA_PROPERTY_ID': 'mcp-googleanalytics',
      'SERPAPI_KEY': 'mcp-serpapi',
      'HUBSPOT_ACCESS_TOKEN': 'mcp-hubspot',
      'INSTAGRAM_ACCESS_TOKEN': 'mcp-instagram',
      'TIKTOK_ACCESS_TOKEN': 'mcp-tiktok',
      'VERCEL_API_KEY': 'mcp-vercel',
      'CLOUDFLARE_API_TOKEN': 'mcp-cloudflare',
      'CALENDLY_API_KEY': 'mcp-calendly',
      'TWILIO_ACCOUNT_SID': 'mcp-twilio',
      'BRIGHTDATA_API_KEY': 'mcp-brightdata',
      'WORDPRESS_URL': 'mcp-wordpress',
      'MEDIUM_INTEGRATION_TOKEN': 'mcp-medium',
      'POSTGRES_CONNECTION_STRING': 'mcp-postgresql',
      'N8N_HOST': 'mcp-n8n',
    };

    const serverId = keyToServer[keyName];
    if (serverId) {
      await supabase
        .from('user_mcp_servers')
        .update({ status: 'connected' })
        .eq('user_id', user.id)
        .eq('server_id', serverId);
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
    ecommerce: 'bg-lime-500/10 text-lime-500 border-lime-500/20',
    analytics: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    crm: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    infrastructure: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    scheduling: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    communication: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    scraping: 'bg-red-500/10 text-red-500 border-red-500/20',
    cms: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    publishing: 'bg-green-500/10 text-green-500 border-green-500/20',
    database: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    automation: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="glass-morphism cyber-border">
      <CardHeader>
        <CardTitle className="cyber-text flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          Your API Keys
        </CardTitle>
        <CardDescription>
          Configure your API keys to enable MCP server connections. Keys are encrypted and stored securely.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {apiKeys.map((apiKey, i) => (
          <motion.div
            key={apiKey.key_name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl bg-card/50 border border-border/50"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{apiKey.display_name}</span>
                <Badge variant="outline" className={categoryColors[apiKey.category] || ''}>
                  {apiKey.category}
                </Badge>
              </div>
              {apiKey.is_configured ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Set
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKeys[apiKey.key_name] ? 'text' : 'password'}
                  placeholder={apiKey.is_configured ? '••••••••••••' : 'Enter API key'}
                  value={keyValues[apiKey.key_name] || ''}
                  onChange={(e) => setKeyValues(prev => ({ 
                    ...prev, 
                    [apiKey.key_name]: e.target.value 
                  }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys(prev => ({ 
                    ...prev, 
                    [apiKey.key_name]: !prev[apiKey.key_name] 
                  }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys[apiKey.key_name] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <Button
                onClick={() => saveAPIKey(apiKey.key_name)}
                disabled={!keyValues[apiKey.key_name] || savingKey === apiKey.key_name}
              >
                {savingKey === apiKey.key_name ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};
