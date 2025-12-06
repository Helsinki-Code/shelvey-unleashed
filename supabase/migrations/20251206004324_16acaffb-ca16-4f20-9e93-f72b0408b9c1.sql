-- Step 2: Create the missing database trigger for auto_start_phase_work
-- This trigger fires when a phase transitions to 'active' status

-- First drop the trigger if it exists to avoid duplicates
DROP TRIGGER IF EXISTS on_phase_activated ON business_phases;

-- Create trigger that fires AFTER update when status changes to 'active'
CREATE TRIGGER on_phase_activated
  AFTER UPDATE ON business_phases
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND OLD.status != 'active')
  EXECUTE FUNCTION auto_start_phase_work();