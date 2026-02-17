import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProjectFile } from './V0Builder';
import { ensureViteScaffold } from './vite-scaffold';

interface DeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  files: ProjectFile[];
  onSuccess: (url: string) => void;
}

type DeploymentStatus = 'idle' | 'deploying' | 'success' | 'error';

export function DeploymentModal({
  open,
  onOpenChange,
  projectId,
  projectName,
  files,
  onSuccess,
}: DeploymentModalProps) {
  const [status, setStatus] = useState<DeploymentStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [deployedUrl, setDeployedUrl] = useState('');
  const [error, setError] = useState('');

  const handleDeploy = async () => {
    setStatus('deploying');
    setProgress(10);
    setMessage('Preparing deployment…');
    setError('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const deployFiles = ensureViteScaffold(files, projectName);

      setProgress(30);
      setMessage('Building Vite project…');

      const response = await supabase.functions.invoke('deploy-vite-project', {
        body: {
          projectId,
          projectName,
          files: deployFiles.map((f) => ({
            path: f.path,
            content: f.content,
            fileType: f.type,
          })),
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setProgress(70);
      setMessage('Deploying to Vercel…');

      await new Promise((r) => setTimeout(r, 1000));
      setProgress(90);
      setMessage('Configuring domain…');

      await new Promise((r) => setTimeout(r, 500));
      setProgress(100);

      const url =
        response.data?.deploymentUrl || response.data?.productionUrl;
      if (url) {
        setDeployedUrl(url);
        setStatus('success');
        setMessage('Deployment complete!');
        onSuccess(url);
        toast.success('Website deployed successfully!');
      } else {
        throw new Error('No deployment URL returned');
      }
    } catch (err) {
      console.error('Deployment error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Deployment failed');
      toast.error('Deployment failed');
    }
  };

  const handleClose = () => {
    if (status === 'deploying') return;
    setStatus('idle');
    setProgress(0);
    setMessage('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Deploy to Production
          </DialogTitle>
          <DialogDescription>
            Deploy your website to Vercel with a custom subdomain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <h4 className="font-medium text-sm mb-2.5">
                    Project Summary
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      {files.length} files ready for deployment
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      React + Vite + Tailwind CSS
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      Automatic SSL certificate
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      CDN-powered delivery
                    </li>
                  </ul>
                </div>

                <Button onClick={handleDeploy} className="w-full gap-2">
                  <Rocket className="h-4 w-4" />
                  Deploy Now
                </Button>
              </motion.div>
            )}

            {status === 'deploying' && (
              <motion.div
                key="deploying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="text-center py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                  <p className="font-medium text-sm">{message}</p>
                </div>
                <Progress value={progress} className="h-1.5" />
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-7 w-7 text-green-500" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">
                    Deployment Successful!
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Your website is now live
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <Label className="text-xs text-muted-foreground">
                    Live URL
                  </Label>
                  <a
                    href={deployedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline mt-1 text-sm"
                  >
                    {deployedUrl}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button asChild className="flex-1">
                    <a
                      href={deployedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit Site
                    </a>
                  </Button>
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-7 w-7 text-destructive" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">
                    Deployment Failed
                  </h4>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleDeploy} className="flex-1">
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}