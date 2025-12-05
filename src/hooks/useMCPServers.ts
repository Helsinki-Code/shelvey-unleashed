import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { categoryColors } from '@/lib/mcp-servers';
import type { Json } from '@/integrations/supabase/types';

export interface MCPServerDB {
  id: string;
  server_id: string;
  server_name: string;
  status: string;
  latency_ms: number | null;
  requests_today: number | null;
  last_ping: string | null;
  updated_at: string;
  metadata: Json | null;
}

// Helper to extract metadata safely
export const getServerMetadata = (metadata: Json | null) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { category: 'general', toolCount: 0, envRequired: [] };
  }
  const obj = metadata as Record<string, unknown>;
  return {
    category: (obj.category as string) || 'general',
    toolCount: (obj.toolCount as number) || 0,
    envRequired: (obj.envRequired as string[]) || [],
  };
};

export const useMCPServers = () => {
  const [servers, setServers] = useState<MCPServerDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchServers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('mcp-servers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mcp_server_status',
        },
        (payload) => {
          console.log('MCP server update:', payload);
          if (payload.eventType === 'UPDATE') {
            setServers((prev) =>
              prev.map((s) =>
                s.server_id === (payload.new as MCPServerDB).server_id
                  ? (payload.new as MCPServerDB)
                  : s
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setServers((prev) => [...prev, payload.new as MCPServerDB]);
          } else if (payload.eventType === 'DELETE') {
            setServers((prev) =>
              prev.filter((s) => s.id !== (payload.old as MCPServerDB).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchServers = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('mcp_server_status')
      .select('*')
      .order('server_name', { ascending: true });

    if (fetchError) {
      console.error('Error fetching MCP servers:', fetchError);
      setError(fetchError.message);
    } else {
      setServers(data || []);
    }

    setIsLoading(false);
  };

  const refreshServers = () => {
    fetchServers();
  };

  // Trigger simulation
  const simulateActivity = async () => {
    try {
      const { error } = await supabase.functions.invoke('simulate-mcp-activity');
      if (error) throw error;
    } catch (err) {
      console.error('Error simulating activity:', err);
    }
  };

  // Compute stats
  const stats = {
    total: servers.length,
    connected: servers.filter((s) => s.status === 'connected').length,
    syncing: servers.filter((s) => s.status === 'syncing').length,
    requiresKey: servers.filter((s) => s.status === 'requires-key').length,
    totalRequests: servers.reduce((acc, s) => acc + (s.requests_today || 0), 0),
    avgLatency: servers.filter((s) => s.latency_ms).length > 0
      ? Math.round(
          servers.reduce((acc, s) => acc + (s.latency_ms || 0), 0) /
            servers.filter((s) => s.latency_ms).length
        )
      : 0,
  };

  return {
    servers,
    isLoading,
    error,
    stats,
    refreshServers,
    simulateActivity,
  };
};

// Helper to get category style
export const getCategoryStyle = (category: string) => {
  const categoryKey = category as keyof typeof categoryColors;
  return categoryColors[categoryKey] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
};
