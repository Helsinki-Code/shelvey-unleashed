-- Deduplicate website_pages so each (project_id, user_id, page_name) has one authoritative row
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, user_id, page_name
      ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
    ) AS rn
  FROM public.website_pages
)
DELETE FROM public.website_pages wp
USING ranked r
WHERE wp.id = r.id
  AND r.rn > 1;

-- Enforce deterministic upsert target for builder saves
CREATE UNIQUE INDEX IF NOT EXISTS ux_website_pages_project_user_name
ON public.website_pages (project_id, user_id, page_name);
