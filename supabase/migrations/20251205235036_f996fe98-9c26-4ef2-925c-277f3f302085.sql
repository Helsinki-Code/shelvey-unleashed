-- Create a function to auto-start phase work via pg_net
CREATE OR REPLACE FUNCTION public.auto_start_phase_work()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger for active phases (Phase 1 starts active on project creation)
  IF NEW.status = 'active' AND NEW.started_at IS NOT NULL THEN
    -- Use pg_net to call the phase-auto-worker edge function asynchronously
    PERFORM net.http_post(
      url := 'https://isoafhjneixsoygrpgtt.supabase.co/functions/v1/phase-auto-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzb2FmaGpuZWl4c295Z3JwZ3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODAxNTQsImV4cCI6MjA4MDQ1NjE1NH0.2E1T2Dfw-cLybvpiqj6vcF7f6iROzJCe_aegYZ1z1fA'
      ),
      body := jsonb_build_object(
        'action', 'start_phase_work',
        'userId', NEW.user_id,
        'projectId', NEW.project_id,
        'phaseId', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-start work when phase becomes active
DROP TRIGGER IF EXISTS trigger_auto_start_phase_work ON business_phases;
CREATE TRIGGER trigger_auto_start_phase_work
  AFTER INSERT OR UPDATE OF status ON business_phases
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION auto_start_phase_work();