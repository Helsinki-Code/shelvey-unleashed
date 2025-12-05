-- Create function to auto-create business phases when a project is created
CREATE OR REPLACE FUNCTION public.create_business_phases_for_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  research_team_id uuid;
  brand_team_id uuid;
  dev_team_id uuid;
  content_team_id uuid;
  marketing_team_id uuid;
  sales_team_id uuid;
  phase1_id uuid;
  phase2_id uuid;
  phase3_id uuid;
  phase4_id uuid;
  phase5_id uuid;
  phase6_id uuid;
BEGIN
  -- Get team IDs
  SELECT id INTO research_team_id FROM teams WHERE name = 'Research Team' LIMIT 1;
  SELECT id INTO brand_team_id FROM teams WHERE name = 'Brand & Design Team' LIMIT 1;
  SELECT id INTO dev_team_id FROM teams WHERE name = 'Development Team' LIMIT 1;
  SELECT id INTO content_team_id FROM teams WHERE name = 'Content Team' LIMIT 1;
  SELECT id INTO marketing_team_id FROM teams WHERE name = 'Marketing Team' LIMIT 1;
  SELECT id INTO sales_team_id FROM teams WHERE name = 'Sales Team' LIMIT 1;

  -- Create Phase 1: Research & Discovery (active by default)
  INSERT INTO business_phases (project_id, user_id, phase_number, phase_name, status, team_id, started_at)
  VALUES (NEW.id, NEW.user_id, 1, 'Research & Discovery', 'active', research_team_id, now())
  RETURNING id INTO phase1_id;

  -- Create Phase 2: Brand & Identity
  INSERT INTO business_phases (project_id, user_id, phase_number, phase_name, status, team_id)
  VALUES (NEW.id, NEW.user_id, 2, 'Brand & Identity', 'pending', brand_team_id)
  RETURNING id INTO phase2_id;

  -- Create Phase 3: Development & Build
  INSERT INTO business_phases (project_id, user_id, phase_number, phase_name, status, team_id)
  VALUES (NEW.id, NEW.user_id, 3, 'Development & Build', 'pending', dev_team_id)
  RETURNING id INTO phase3_id;

  -- Create Phase 4: Content Creation
  INSERT INTO business_phases (project_id, user_id, phase_number, phase_name, status, team_id)
  VALUES (NEW.id, NEW.user_id, 4, 'Content Creation', 'pending', content_team_id)
  RETURNING id INTO phase4_id;

  -- Create Phase 5: Marketing Launch
  INSERT INTO business_phases (project_id, user_id, phase_number, phase_name, status, team_id)
  VALUES (NEW.id, NEW.user_id, 5, 'Marketing Launch', 'pending', marketing_team_id)
  RETURNING id INTO phase5_id;

  -- Create Phase 6: Sales & Growth
  INSERT INTO business_phases (project_id, user_id, phase_number, phase_name, status, team_id)
  VALUES (NEW.id, NEW.user_id, 6, 'Sales & Growth', 'pending', sales_team_id)
  RETURNING id INTO phase6_id;

  -- Create deliverables for Phase 1: Research & Discovery
  INSERT INTO phase_deliverables (phase_id, user_id, name, deliverable_type, description, assigned_team_id) VALUES
    (phase1_id, NEW.user_id, 'Market Analysis', 'analysis', 'Comprehensive market research and opportunity assessment', research_team_id),
    (phase1_id, NEW.user_id, 'Competitor Report', 'report', 'Analysis of direct and indirect competitors', research_team_id),
    (phase1_id, NEW.user_id, 'Trend Forecast', 'report', 'Industry trends and future predictions', research_team_id),
    (phase1_id, NEW.user_id, 'Target Audience Profile', 'document', 'Detailed customer personas and segments', research_team_id);

  -- Create deliverables for Phase 2: Brand & Identity
  INSERT INTO phase_deliverables (phase_id, user_id, name, deliverable_type, description, assigned_team_id) VALUES
    (phase2_id, NEW.user_id, 'Brand Strategy', 'document', 'Brand positioning, values, and voice guidelines', brand_team_id),
    (phase2_id, NEW.user_id, 'Logo Design', 'design', 'Primary logo and variations', brand_team_id),
    (phase2_id, NEW.user_id, 'Color Palette', 'design', 'Brand colors and usage guidelines', brand_team_id),
    (phase2_id, NEW.user_id, 'Brand Guidelines', 'document', 'Complete brand style guide', brand_team_id);

  -- Create deliverables for Phase 3: Development & Build
  INSERT INTO phase_deliverables (phase_id, user_id, name, deliverable_type, description, assigned_team_id) VALUES
    (phase3_id, NEW.user_id, 'Website Design', 'design', 'UI/UX design for main website', dev_team_id),
    (phase3_id, NEW.user_id, 'Website Development', 'code', 'Fully functional responsive website', dev_team_id),
    (phase3_id, NEW.user_id, 'Payment Integration', 'code', 'Stripe payment processing setup', dev_team_id),
    (phase3_id, NEW.user_id, 'Analytics Setup', 'configuration', 'Google Analytics and tracking setup', dev_team_id);

  -- Create deliverables for Phase 4: Content Creation
  INSERT INTO phase_deliverables (phase_id, user_id, name, deliverable_type, description, assigned_team_id) VALUES
    (phase4_id, NEW.user_id, 'Website Copy', 'content', 'All website text content', content_team_id),
    (phase4_id, NEW.user_id, 'Blog Posts', 'content', 'Initial blog content for SEO', content_team_id),
    (phase4_id, NEW.user_id, 'Email Templates', 'content', 'Welcome, nurture, and promotional emails', content_team_id),
    (phase4_id, NEW.user_id, 'Social Media Content', 'content', 'Initial social media posts and calendar', content_team_id);

  -- Create deliverables for Phase 5: Marketing Launch
  INSERT INTO phase_deliverables (phase_id, user_id, name, deliverable_type, description, assigned_team_id) VALUES
    (phase5_id, NEW.user_id, 'Marketing Strategy', 'document', 'Go-to-market strategy and channel plan', marketing_team_id),
    (phase5_id, NEW.user_id, 'Social Media Campaigns', 'campaign', 'Launch campaigns for all social platforms', marketing_team_id),
    (phase5_id, NEW.user_id, 'Ad Creatives', 'design', 'Paid advertising creative assets', marketing_team_id),
    (phase5_id, NEW.user_id, 'Influencer Partnerships', 'partnerships', 'Influencer outreach and partnership agreements', marketing_team_id);

  -- Create deliverables for Phase 6: Sales & Growth
  INSERT INTO phase_deliverables (phase_id, user_id, name, deliverable_type, description, assigned_team_id) VALUES
    (phase6_id, NEW.user_id, 'Sales Playbook', 'document', 'Sales process, scripts, and objection handling', sales_team_id),
    (phase6_id, NEW.user_id, 'Lead Pipeline', 'data', 'Qualified leads and pipeline management', sales_team_id),
    (phase6_id, NEW.user_id, 'Revenue Report', 'report', 'Revenue tracking and growth metrics', sales_team_id),
    (phase6_id, NEW.user_id, 'Customer Onboarding', 'process', 'Customer onboarding process and materials', sales_team_id);

  RETURN NEW;
END;
$function$;

-- Create trigger on business_projects table
DROP TRIGGER IF EXISTS trigger_create_business_phases ON business_projects;
CREATE TRIGGER trigger_create_business_phases
  AFTER INSERT ON business_projects
  FOR EACH ROW
  EXECUTE FUNCTION create_business_phases_for_project();