import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  HardDrive, 
  Calendar, 
  MessageSquare, 
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type ConnectorType = 'gmail' | 'drive' | 'calendar' | 'teams' | 'outlook' | 'sharepoint';

interface Connector {
  id: ConnectorType;
  name: string;
  description: string;
  icon: React.ReactNode;
  provider: 'google' | 'microsoft';
  features: string[];
}

const connectors: Connector[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read, send, and search emails',
    icon: <Mail className="h-6 w-6" />,
    provider: 'google',
    features: ['Read emails', 'Send emails', 'Search inbox', 'Manage labels']
  },
  {
    id: 'drive',
    name: 'Google Drive',
    description: 'Access and manage files',
    icon: <HardDrive className="h-6 w-6" />,
    provider: 'google',
    features: ['List files', 'Upload files', 'Download files', 'Search']
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Manage events and availability',
    icon: <Calendar className="h-6 w-6" />,
    provider: 'google',
    features: ['View events', 'Create events', 'Check availability', 'Manage RSVPs']
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Team messaging and channels',
    icon: <Users className="h-6 w-6" />,
    provider: 'microsoft',
    features: ['Send messages', 'List channels', 'Create channels', 'Manage teams']
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Microsoft email and calendar',
    icon: <MessageSquare className="h-6 w-6" />,
    provider: 'microsoft',
    features: ['Read emails', 'Send emails', 'Calendar access', 'Contacts']
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    description: 'Document management and collaboration',
    icon: <FileText className="h-6 w-6" />,
    provider: 'microsoft',
    features: ['List documents', 'Access sites', 'Search content', 'Manage permissions']
  }
];

interface ConnectedToken {
  id: string;
  connector_type: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export const ConnectorAuth: React.FC = () => {
  const { user } = useAuth();
  const [connectedTokens, setConnectedTokens] = useState<ConnectedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<ConnectorType | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchConnectedTokens();
      
      // Listen for OAuth messages from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'oauth_success') {
          toast.success(`Connected to ${event.data.connector}`);
          fetchConnectedTokens();
          setConnecting(null);
        } else if (event.data?.type === 'oauth_error') {
          toast.error(`Connection failed: ${event.data.error}`);
          setConnecting(null);
        }
      };
      
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [user]);

  const fetchConnectedTokens = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_oauth_tokens')
        .select('id, connector_type, provider, created_at, updated_at')
        .eq('user_id', user.id);

      if (error) throw error;
      setConnectedTokens(data || []);
    } catch (err) {
      console.error('Error fetching tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectConnector = async (connector: Connector) => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    setConnecting(connector.id);

    try {
      const { data, error } = await supabase.functions.invoke('oauth-callback', {
        body: {
          userId: user.id,
          connector: connector.id,
          redirectUri: window.location.href
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth flow in popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(
          data.authUrl,
          'oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (err) {
      console.error('Error initiating OAuth:', err);
      toast.error('Failed to start authentication');
      setConnecting(null);
    }
  };

  const disconnectConnector = async (tokenId: string, connectorName: string) => {
    setDisconnecting(tokenId);

    try {
      const { error } = await supabase
        .from('user_oauth_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      toast.success(`Disconnected from ${connectorName}`);
      fetchConnectedTokens();
    } catch (err) {
      console.error('Error disconnecting:', err);
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(null);
    }
  };

  const isConnected = (connectorId: ConnectorType) => 
    connectedTokens.some(t => t.connector_type === connectorId);

  const getToken = (connectorId: ConnectorType) =>
    connectedTokens.find(t => t.connector_type === connectorId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border/50">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium">
            {connectedTokens.length} Connected
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {connectors.length - connectedTokens.length} Available
          </span>
        </div>
      </div>

      {/* Google Connectors */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-red-500/10 flex items-center justify-center text-xs">G</span>
          Google Workspace
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {connectors.filter(c => c.provider === 'google').map((connector, index) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              connected={isConnected(connector.id)}
              token={getToken(connector.id)}
              connecting={connecting === connector.id}
              disconnecting={disconnecting === getToken(connector.id)?.id}
              onConnect={() => connectConnector(connector)}
              onDisconnect={() => {
                const token = getToken(connector.id);
                if (token) disconnectConnector(token.id, connector.name);
              }}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Microsoft Connectors */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center text-xs">M</span>
          Microsoft 365
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {connectors.filter(c => c.provider === 'microsoft').map((connector, index) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              connected={isConnected(connector.id)}
              token={getToken(connector.id)}
              connecting={connecting === connector.id}
              disconnecting={disconnecting === getToken(connector.id)?.id}
              onConnect={() => connectConnector(connector)}
              onDisconnect={() => {
                const token = getToken(connector.id);
                if (token) disconnectConnector(token.id, connector.name);
              }}
              index={index + 3}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface ConnectorCardProps {
  connector: Connector;
  connected: boolean;
  token?: ConnectedToken;
  connecting: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  index: number;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({
  connector,
  connected,
  token,
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
  index
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`h-full transition-all duration-300 ${
        connected 
          ? 'bg-emerald-500/5 border-emerald-500/20' 
          : 'bg-card/50 border-border/50 hover:border-primary/30'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg ${
              connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
            }`}>
              {connector.icon}
            </div>
            {connected && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
          <CardTitle className="text-base mt-2">{connector.name}</CardTitle>
          <CardDescription className="text-xs">
            {connector.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Features */}
          <div className="flex flex-wrap gap-1">
            {connector.features.slice(0, 3).map((feature, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                {feature}
              </Badge>
            ))}
          </div>

          {/* Connection Time */}
          {connected && token && (
            <p className="text-[10px] text-muted-foreground">
              Connected {new Date(token.created_at).toLocaleDateString()}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  disabled
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Use
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 text-destructive hover:text-destructive"
                  onClick={onDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="w-full text-xs h-8"
                onClick={onConnect}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConnectorAuth;
