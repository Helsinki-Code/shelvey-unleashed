import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * ProjectDetailPage - Redirect to Phase 1 page
 * This page no longer exists as a separate entity.
 * Users are redirected to the Phase 1 page for their project.
 */
const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
      // Redirect to Phase 1 page
      navigate(`/projects/${projectId}/phase/1`, { replace: true });
    }
  }, [projectId, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default ProjectDetailPage;
