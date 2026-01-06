import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * ProjectDetailPage - Redirect to Project Overview page
 * This page serves as a router for /projects/:projectId to the overview page.
 */
const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
      // Redirect to Project Overview page (not Phase 1)
      navigate(`/projects/${projectId}/overview`, { replace: true });
    }
  }, [projectId, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default ProjectDetailPage;
