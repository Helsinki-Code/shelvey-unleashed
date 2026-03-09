import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  WarRoomState, InterventionCommand,
} from '@/types/agent';
import { AGENT_DEFINITIONS, PhaseStatus, DEFAULT_PHASES } from '@/types/agent';

function createInitialState(): WarRoomState {
  return {
    mission: null,
    agents: AGENT_DEFINITIONS.map(def => ({
      id: def.id,
      name: def.name,
      codename: def.codename,
      icon: def.icon,
      status: 'idle' as const,
      currentTask: null,
      progress: 0,
      logs: [],
      lastHeartbeat: Date.now(),
      heartbeatInterval: def.heartbeatInterval,
      consecutiveMisses: 0,
      startTime: Date.now(),
      tasksCompleted: 0,
      tasksErrored: 0,
      dataProduced: {},
      report: null,
    })),
    phases: DEFAULT_PHASES.map(p => ({
      ...p,
      status: PhaseStatus.QUEUED,
      progress: 0,
      logs: [],
    })),
    data: {
      crawlData: null, keywords: [], keywordClusters: [],
      serpResults: [], contentStrategy: null, articles: [],
      images: [], linkSuggestions: [], rankingData: [],
      analyticsData: null, optimizationAudits: [],
    },
    approvals: [],
    communications: [],
    config: {
      approvalTimeoutMs: 1800000, heartbeatIntervalMs: 5000,
      heartbeatMissThreshold: 3, maxRetries: 3, parallelArticles: 2,
      minWordCount: 3000, minPAAQuestions: 7, minImages: 5,
      enableAutoApprove: false, autoApprovePhases: [],
      rankCheckIntervalMs: 3600000, optimizationCheckIntervalMs: 86400000,
    },
    health: { overallStatus: 'healthy', agents: [] },
    connected: false,
  };
}

async function invokeWarRoom(action: string, payload: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('seo-war-room', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useWarRoom() {
  const [state, setState] = useState<WarRoomState>(createInitialState);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const advancingRef = useRef(false);

  const mergeState = useCallback((serverState: any) => {
    if (!serverState) return;
    setState(prev => ({
      ...prev,
      mission: serverState.mission ?? prev.mission,
      agents: serverState.agents ?? prev.agents,
      phases: serverState.phases ?? prev.phases,
      data: serverState.data ?? prev.data,
      approvals: serverState.approvals ?? prev.approvals,
      communications: serverState.recentComms ?? prev.communications,
      config: serverState.config ?? prev.config,
      health: serverState.health ?? prev.health,
      connected: true,
    }));
  }, []);

  // One-shot advance: call once, don't poll
  const triggerAdvance = useCallback(async (sid?: string) => {
    const id = sid || sessionId;
    if (!id || advancingRef.current) return;
    advancingRef.current = true;
    try {
      const result = await invokeWarRoom('advance', { sessionId: id });
      mergeState(result.state);
    } catch (err) {
      console.error('Advance error:', err);
    } finally {
      advancingRef.current = false;
    }
  }, [sessionId, mergeState]);

  // Load session state, then trigger first advance
  const loadSession = useCallback(async (id: string) => {
    setSessionId(id);
    try {
      const result = await invokeWarRoom('get_state', { sessionId: id });
      mergeState(result.state);
      // Trigger advance once to kick off next phase if needed
      setTimeout(() => triggerAdvance(id), 500);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  }, [mergeState, triggerAdvance]);

  const approveRequest = useCallback(async (approvalId: string, optionId: string, userInput?: string) => {
    if (!sessionId) return;
    try {
      const result = await invokeWarRoom('approve', { sessionId, approvalId, optionId, userInput });
      mergeState(result.state);
      toast.success('Approval processed.');
      // After approval, trigger advance to start next phase
      setTimeout(() => triggerAdvance(), 1000);
    } catch (err) {
      toast.error('Approval failed.');
    }
  }, [sessionId, mergeState, triggerAdvance]);

  const intervene = useCallback(async (command: InterventionCommand) => {
    if (!sessionId) return;
    try {
      const result = await invokeWarRoom('intervene', { sessionId, command });
      mergeState(result.state);
    } catch (err) {
      toast.error('Intervention failed.');
    }
  }, [sessionId, mergeState]);

  const pauseMission = useCallback(async () => {
    setState(prev => ({
      ...prev,
      mission: prev.mission ? { ...prev.mission, status: 'paused' } : prev.mission,
    }));
  }, []);

  const resumeMission = useCallback(async () => {
    triggerAdvance();
  }, [triggerAdvance]);

  // Realtime subscription — primary state sync mechanism
  // When the background worker finishes and writes to DB, we get the update here
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`seo-session-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'seo_sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        const newState = (payload.new as any)?.workflow_state;
        if (newState) {
          mergeState(newState);
          // If background phase just finished and no pending approvals, auto-advance to next phase
          const hasPending = newState.approvals?.some((a: any) => a.status === "pending");
          const isRunning = newState.mission?.status === "running";
          const notProcessing = !newState.processingPhase;
          if (isRunning && !hasPending && notProcessing) {
            // A phase just completed without needing approval (e.g. monitor), trigger next
            setTimeout(() => triggerAdvance(), 500);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, mergeState, triggerAdvance]);

  return {
    state,
    sessionId,
    loadSession,
    pauseMission,
    resumeMission,
    approveRequest,
    intervene,
    triggerAdvance,
    isRunning: state.mission?.status === 'running',
  };
}
