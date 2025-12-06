-- Fix auto_start_phase_work function to not use net.http_post which requires pg_net extension
-- Instead, we'll just log that the phase is ready to start and let the frontend trigger the work

CREATE OR REPLACE FUNCTION public.auto_start_phase_work()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger for active phases (Phase 1 starts active on project creation)
  IF NEW.status = 'active' AND NEW.started_at IS NOT NULL THEN
    -- Log that this phase is now active and ready for work
    -- The actual work will be triggered by the frontend calling phase-auto-worker
    INSERT INTO agent_activity_logs (agent_id, agent_name, action, status, metadata)
    VALUES (
      'coo-agent',
      'COO Agent',
      'Phase ' || NEW.phase_number || ' activated - ready for agent work',
      'completed',
      jsonb_build_object(
        'phase_id', NEW.id,
        'phase_number', NEW.phase_number,
        'project_id', NEW.project_id,
        'user_id', NEW.user_id,
        'activated_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;