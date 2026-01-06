import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  Sparkles,
  Download,
  Maximize2,
  Crown,
  User,
  Palette,
  Type,
  Layers,
  Zap,
  Clock,
  Server,
  Upload,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeneratedImage {
  id: string;
  type: 'logo' | 'icon' | 'banner' | 'color_palette' | 'typography';
  name: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'uploading' | 'review' | 'approved' | 'rejected';
  progress: number;
  ceoApproved?: boolean;
  userApproved?: boolean;
  feedback?: string;
  generatedAt?: string;
  model?: string;
  colorData?: { primary: string; secondary: string; accent: string };
}

interface StreamEvent {
  type: string;
  assetId?: string;
  name?: string;
  message?: string;
  model?: string;
  imageUrl?: string;
  colorData?: { primary: string; secondary: string; accent: string };
  progress?: number;
  currentIndex?: number;
  totalAssets?: number;
  success?: boolean;
  timestamp?: string;
}

interface ImageGenerationStudioProps {
  projectId: string;
  phaseId?: string;
  agentName: string;
  onAssetApproved?: (asset: GeneratedImage) => void;
  triggerGenerationRef?: React.MutableRefObject<(() => void) | null>;
}

export const ImageGenerationStudio = ({ 
  projectId, 
  phaseId,
  agentName,
  onAssetApproved,
  triggerGenerationRef,
}: ImageGenerationStudioProps) => {
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCeoReviewing, setIsCeoReviewing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const [currentModel, setCurrentModel] = useState('');
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [ceoReviewComments, setCeoReviewComments] = useState<Record<string, string>>({});
  const [connectionError, setConnectionError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for elapsed time
  useEffect(() => {
    if (isGenerating) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGenerating]);

  // Fetch existing brand assets from deliverables
  useEffect(() => {
    const fetchExistingAssets = async () => {
      if (!phaseId) return;
      
      const { data, error } = await supabase
        .from('phase_deliverables')
        .select('id, generated_content, status, ceo_approved, user_approved')
        .eq('phase_id', phaseId)
        .eq('deliverable_type', 'brand_assets')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('[ImageGenerationStudio] Failed to load existing brand assets:', error);
        return;
      }

      const row = data?.[0] ?? null;

      if (row?.generated_content) {
        const content = row.generated_content as Record<string, unknown>;
        const assets: GeneratedImage[] = [];
        const comments: Record<string, string> = {};

        // Load all assets from the assets array with individual approval states
        if (Array.isArray(content.assets)) {
          content.assets.forEach((asset: Record<string, unknown>, idx: number) => {
            const assetCeoApproved = asset.ceoApproved === true;
            const assetUserApproved = asset.userApproved === true;
            const id = (asset.id as string) || `asset-${idx}`;

            const ceoFeedback = typeof asset.ceoFeedback === 'string' ? asset.ceoFeedback : undefined;
            if (ceoFeedback) comments[id] = ceoFeedback;

            // Use 'review' instead of 'pending_review' for valid DB status
            const derivedStatus: GeneratedImage['status'] = assetUserApproved ? 'approved' : 'review';

            assets.push({
              id,
              type: (asset.type as GeneratedImage['type']) || 'icon',
              name: (asset.name as string) || `Asset ${idx + 1}`,
              imageUrl: asset.imageUrl as string,
              status: derivedStatus,
              progress: 100,
              ceoApproved: assetCeoApproved,
              userApproved: assetUserApproved,
              model: asset.model as string,
              colorData: asset.colorData as GeneratedImage['colorData'],
            });
          });
        }

        if (assets.length > 0) {
          setGeneratedImages(assets);
          if (Object.keys(comments).length > 0) setCeoReviewComments(comments);
        }
      }
    };

    fetchExistingAssets();
  }, [phaseId]);

  // Expose startGeneration to parent via ref
  useEffect(() => {
    if (triggerGenerationRef) {
      triggerGenerationRef.current = startGeneration;
    }
    return () => {
      if (triggerGenerationRef) {
        triggerGenerationRef.current = null;
      }
    };
  }, [triggerGenerationRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startGeneration = async () => {
    setIsGenerating(true);
    setOverallProgress(0);
    setCurrentStatus('Connecting to generation service...');
    setStreamEvents([]);
    setConnectionError(false);
    
    // Initialize assets as pending
    const initialAssets: GeneratedImage[] = [
      { id: 'palette-1', type: 'color_palette', name: 'Color Palette', status: 'pending', progress: 0 },
      { id: 'logo-1', type: 'logo', name: 'Primary Logo', status: 'pending', progress: 0 },
      { id: 'logo-2', type: 'logo', name: 'Logo Variant', status: 'pending', progress: 0 },
      { id: 'icon-1', type: 'icon', name: 'App Icon', status: 'pending', progress: 0 },
      { id: 'banner-1', type: 'banner', name: 'Social Banner', status: 'pending', progress: 0 },
    ];
    setGeneratedImages(initialAssets);

    // Get auth token for authenticated SSE request
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const streamUrl = `${supabaseUrl}/functions/v1/brand-assets-stream?projectId=${projectId}${phaseId ? `&phaseId=${phaseId}` : ''}`;

    try {
      // Use fetch with streaming instead of EventSource to send auth headers
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
          'Accept': 'text/event-stream',
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamEvent = JSON.parse(line.slice(6));
              setStreamEvents(prev => [...prev.slice(-20), data]);

              switch (data.type) {
                case 'start':
                  setCurrentStatus(data.message || 'Starting generation...');
                  break;

                case 'context_loaded':
                case 'brand_context_loaded':
                case 'palette_generated':
                  setCurrentStatus(data.message || 'Loading brand context...');
                  break;

                case 'generating':
                  setCurrentStatus(data.message || `Generating ${data.name}...`);
                  setCurrentModel(data.model || '');
                  setOverallProgress(data.progress || 0);
                  
                  setGeneratedImages(prev => prev.map(img =>
                    img.id === data.assetId
                      ? { ...img, status: 'generating' as const, model: data.model }
                      : img
                  ));
                  break;

                case 'api_call':
                  setCurrentStatus(data.message || 'Calling AI API...');
                  break;

                case 'api_response':
                  setCurrentStatus(data.message || 'Processing response...');
                  break;

                case 'uploading':
                  setCurrentStatus(data.message || 'Uploading to storage...');
                  setGeneratedImages(prev => prev.map(img =>
                    img.id === data.assetId
                      ? { ...img, status: 'uploading' as const }
                      : img
                  ));
                  break;

                case 'asset_complete':
                  setOverallProgress(data.progress || 0);
                  setCurrentStatus(data.message || `${data.name} complete!`);
                  
                  setGeneratedImages(prev => prev.map(img =>
                    img.id === data.assetId
                      ? {
                          ...img,
                          status: 'review' as const,
                          progress: 100,
                          imageUrl: data.imageUrl,
                          colorData: data.colorData,
                          model: data.model,
                          generatedAt: data.timestamp,
                        }
                      : img
                  ));
                  break;

                case 'asset_error':
                  setGeneratedImages(prev => prev.map(img =>
                    img.id === data.assetId
                      ? { ...img, status: 'rejected' as const, feedback: data.message }
                      : img
                  ));
                  break;

                case 'saving':
                  setCurrentStatus(data.message || 'Saving to database...');
                  break;

                case 'complete':
                  setIsGenerating(false);
                  setOverallProgress(100);
                  setCurrentStatus('All assets generated! Starting CEO review...');
                  setCurrentModel('');
                  toast.success('Brand assets generated! CEO is now reviewing...');
                  // Auto-trigger CEO review
                  setTimeout(() => {
                    triggerCeoReview();
                  }, 1000);
                  break;

                case 'error':
                  setIsGenerating(false);
                  setCurrentStatus(`Error: ${data.message}`);
                  setConnectionError(true);
                  toast.error(data.message || 'Generation failed');
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Stream error:', error);
      if (error.name !== 'AbortError') {
        setIsGenerating(false);
        setCurrentStatus('Connection error - click Retry to try again');
        setConnectionError(true);
        toast.error('Connection to generation service lost');
      }
    }
  };

  const handleApprove = async (image: GeneratedImage, approver: 'ceo' | 'user') => {
    const updatedCeoApproved = approver === 'ceo' ? true : (image.ceoApproved || false);
    const updatedUserApproved = approver === 'user' ? true : (image.userApproved || false);

    // Update local state - user approval determines if fully approved
    setGeneratedImages((images) =>
      images.map((img) =>
        img.id === image.id
          ? {
              ...img,
              ceoApproved: updatedCeoApproved,
              userApproved: updatedUserApproved,
              status: updatedUserApproved ? 'approved' : 'review',
            }
          : img
      )
    );

    toast.success(`${approver === 'ceo' ? 'CEO' : 'You'} approved ${image.name}`);

    // Persist approval on the Phase 2 brand_assets deliverable
    if (phaseId) {
      try {
        const { data: deliverables, error: fetchError } = await supabase
          .from('phase_deliverables')
          .select('id, generated_content, ceo_approved, user_approved')
          .eq('phase_id', phaseId)
          .eq('deliverable_type', 'brand_assets')
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        const row = deliverables?.[0];
        if (!row?.id) return;

        const content = (row.generated_content || {}) as Record<string, unknown>;
        const assets = Array.isArray(content.assets) ? [...content.assets] : [];

        const assetIndex = assets.findIndex(
          (a: Record<string, unknown>) => a?.id === image.id || a?.name === image.name
        );

        const nextAsset = {
          id: image.id,
          type: image.type,
          name: image.name,
          imageUrl: image.imageUrl,
          model: image.model,
          colorData: image.colorData,
          ceoApproved: updatedCeoApproved,
          userApproved: updatedUserApproved,
        };

        if (assetIndex >= 0) {
          assets[assetIndex] = { ...(assets[assetIndex] as Record<string, unknown>), ...nextAsset };
        } else {
          assets.push(nextAsset);
        }

        const allUserApproved = assets.length > 0 && assets.every((a: Record<string, unknown>) => a.userApproved === true);

        // User-only gating: deliverable is approved when all assets are user-approved
        const updatePayload: Record<string, unknown> = {
          generated_content: { ...content, assets },
          status: allUserApproved ? 'approved' : 'review',
          user_approved: allUserApproved,
          updated_at: new Date().toISOString(),
        };

        // Also update ceo_approved if this is a CEO action
        if (approver === 'ceo') {
          const allCeoApproved = assets.length > 0 && assets.every((a: Record<string, unknown>) => a.ceoApproved === true);
          updatePayload.ceo_approved = allCeoApproved;
        }

        const { error: updateError } = await supabase
          .from('phase_deliverables')
          .update(updatePayload)
          .eq('id', row.id);

        if (updateError) throw updateError;
      } catch (e: any) {
        console.error('[ImageGenerationStudio] Failed to persist approval:', e);
        toast.error(e?.message || 'Failed to save approval');
      }
    }

    if (onAssetApproved) {
      onAssetApproved(image);
    }
  };

  const handleReject = async (image: GeneratedImage) => {
    setGeneratedImages(images =>
      images.map(img =>
        img.id === image.id
          ? { ...img, status: 'rejected' as const, feedback: feedbackText }
          : img
      )
    );

    toast.info(`${image.name} marked for regeneration`);
    setFeedbackText('');
  };

  const handleRegenerate = async (image: GeneratedImage) => {
    toast.info(`Regenerating ${image.name}...`);
    startGeneration();
  };

  // CEO Review function
  const triggerCeoReview = async () => {
    if (!phaseId) {
      toast.error('Missing phase context for CEO review');
      return;
    }

    setIsCeoReviewing(true);
    setCurrentStatus('Preparing CEO review...');

    try {
      const { data: deliverables, error: deliverableError } = await supabase
        .from('phase_deliverables')
        .select('id, generated_content')
        .eq('phase_id', phaseId)
        .eq('deliverable_type', 'brand_assets')
        .order('created_at', { ascending: false })
        .limit(1);

      if (deliverableError) throw deliverableError;
      const deliverableRow = deliverables?.[0];
      if (!deliverableRow?.id) {
        throw new Error('Brand assets deliverable not found');
      }

      setCurrentStatus('CEO Agent reviewing the brand assets deliverable...');

      const { data: result, error: fnError } = await supabase.functions.invoke('ceo-agent-chat', {
        body: {
          action: 'review_deliverable',
          deliverableId: deliverableRow.id,
          projectId,
        },
      });

      if (fnError) throw fnError;

      const review = result?.review as
        | { approved: boolean; feedback: string; qualityScore: number }
        | undefined;

      if (!review) throw new Error('CEO review did not return a result');

      const approved = review.approved === true;
      const feedback = (review.feedback || 'CEO review complete').trim();

      // Attach CEO comment to all assets shown in this studio
      setCeoReviewComments(() => {
        const next: Record<string, string> = {};
        generatedImages.forEach((img) => {
          if (img.status === 'review') next[img.id] = feedback;
        });
        return next;
      });

      setGeneratedImages((imgs) =>
        imgs.map((img) =>
          img.status === 'review'
            ? {
                ...img,
                ceoApproved: approved,
                feedback: approved ? undefined : feedback,
                status: img.userApproved ? 'approved' : 'review',
              }
            : img
        )
      );

      // Persist per-asset CEO review flags into generated_content.assets
      const content = (deliverableRow.generated_content || {}) as Record<string, unknown>;
      const assets = Array.isArray(content.assets) ? [...content.assets] : [];
      const updatedAssets = assets.map((a: Record<string, unknown>) => ({
        ...a,
        ceoApproved: approved,
        ceoFeedback: feedback,
      }));

      if (assets.length > 0) {
        await supabase
          .from('phase_deliverables')
          .update({
            generated_content: { ...content, assets: updatedAssets },
            ceo_approved: approved,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deliverableRow.id);
      }

      setCurrentStatus('CEO review complete');
      toast.success(approved ? 'CEO approved the brand assets' : 'CEO requested changes');
    } catch (error) {
      console.error('CEO review failed:', error);
      setCurrentStatus('CEO review failed');
      toast.error('CEO review failed');
    } finally {
      setIsCeoReviewing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'uploading': return <Upload className="w-4 h-4 animate-pulse" />;
      case 'review': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generating': return 'bg-blue-500';
      case 'uploading': return 'bg-purple-500';
      case 'review': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'logo': return <Image className="w-4 h-4" />;
      case 'icon': return <Layers className="w-4 h-4" />;
      case 'banner': return <Image className="w-4 h-4" />;
      case 'color_palette': return <Palette className="w-4 h-4" />;
      case 'typography': return <Type className="w-4 h-4" />;
      default: return <Image className="w-4 h-4" />;
    }
  };

  // Check if there are assets that can be generated or retried
  const hasNoAssets = generatedImages.length === 0;
  const hasPendingOrFailed = generatedImages.some(img => img.status === 'pending' || img.status === 'rejected');
  const showGenerateButton = !isGenerating && (hasNoAssets || connectionError || hasPendingOrFailed);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Image Generation Studio</CardTitle>
              <CardDescription>
                {agentName} is generating brand assets with Fal.ai
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {!isGenerating && !isCeoReviewing && generatedImages.length > 0 && generatedImages.some(img => !img.ceoApproved) && (
              <Button onClick={triggerCeoReview} variant="outline" className="gap-2">
                <Crown className="w-4 h-4" />
                CEO Review
              </Button>
            )}
            {showGenerateButton && (
              <Button onClick={startGeneration} className="gap-2">
                {connectionError ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {connectionError ? 'Retry Generation' : hasNoAssets ? 'Generate Assets' : 'Regenerate'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Connection Error Alert */}
        {connectionError && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-sm">Generation failed</p>
                <p className="text-xs text-muted-foreground">{currentStatus}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* CEO Reviewing Status */}
        {isCeoReviewing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Crown className="w-5 h-5 text-primary" />
                <div className="absolute inset-0 w-5 h-5 bg-primary/20 rounded-full animate-ping" />
              </div>
              <div>
                <p className="font-medium text-sm">CEO Agent Reviewing Assets</p>
                <p className="text-xs text-muted-foreground">{currentStatus}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Real-Time Generation Progress */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4"
          >
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <div className="absolute inset-0 w-5 h-5 bg-primary/20 rounded-full animate-ping" />
                </div>
                <div>
                  <p className="font-medium text-sm">{currentStatus}</p>
                  {currentModel && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      Model: {currentModel}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(elapsedTime)}
                </Badge>
                <Badge variant="outline">
                  {overallProgress}%
                </Badge>
              </div>
            </div>

            {/* Progress Bar */}
            <Progress value={overallProgress} className="h-2" />

            {/* Generation Timeline */}
            <div className="grid grid-cols-5 gap-2">
              {generatedImages.map((img) => (
                <div
                  key={img.id}
                  className={`p-2 rounded-md text-center transition-all ${
                    img.status === 'generating' 
                      ? 'bg-primary/20 ring-2 ring-primary' 
                      : img.status === 'review' 
                        ? 'bg-green-500/20' 
                        : img.status === 'uploading'
                          ? 'bg-purple-500/20'
                          : 'bg-muted/50'
                  }`}
                >
                  <div className="flex justify-center mb-1">
                    {getStatusIcon(img.status)}
                  </div>
                  <p className="text-xs truncate">{img.name}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Generated Assets Grid */}
        {generatedImages.length > 0 && !isGenerating && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <AnimatePresence>
              {generatedImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <Dialog>
                    <DialogTrigger asChild>
                      <Card 
                        className="cursor-pointer hover:border-primary/50 transition-all overflow-hidden"
                        onClick={() => setSelectedImage(image)}
                      >
                        {/* Image Preview */}
                        <div className="aspect-square bg-muted relative">
                          {image.type === 'color_palette' && image.colorData ? (
                            <div className="w-full h-full grid grid-cols-3">
                              <div style={{ backgroundColor: image.colorData.primary }} />
                              <div style={{ backgroundColor: image.colorData.secondary }} />
                              <div style={{ backgroundColor: image.colorData.accent }} />
                            </div>
                          ) : image.imageUrl ? (
                            <img
                              src={image.imageUrl}
                              alt={image.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getTypeIcon(image.type)}
                            </div>
                          )}
                          
                          {/* Status Badge */}
                          <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor(image.status)}`} />
                          
                          {/* Approval Badges */}
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            {image.ceoApproved && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                <Crown className="w-3 h-3" />
                              </Badge>
                            )}
                            {image.userApproved && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                <User className="w-3 h-3" />
                              </Badge>
                            )}
                          </div>

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-6 h-6" />
                          </div>
                        </div>

                        {/* Asset Info */}
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {getTypeIcon(image.type)}
                            <span className="text-sm font-medium truncate">{image.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {getStatusIcon(image.status)}
                            <span className="capitalize">{image.status === 'review' ? 'Pending Review' : image.status}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </DialogTrigger>

                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {getTypeIcon(image.type)}
                          {image.name}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        {/* Large Image Preview */}
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                          {image.type === 'color_palette' && image.colorData ? (
                            <div className="w-full h-full grid grid-cols-3">
                              <div style={{ backgroundColor: image.colorData.primary }} className="flex items-end justify-center pb-4">
                                <span className="bg-background/80 px-2 py-1 rounded text-xs">{image.colorData.primary}</span>
                              </div>
                              <div style={{ backgroundColor: image.colorData.secondary }} className="flex items-end justify-center pb-4">
                                <span className="bg-background/80 px-2 py-1 rounded text-xs">{image.colorData.secondary}</span>
                              </div>
                              <div style={{ backgroundColor: image.colorData.accent }} className="flex items-end justify-center pb-4">
                                <span className="bg-background/80 px-2 py-1 rounded text-xs">{image.colorData.accent}</span>
                              </div>
                            </div>
                          ) : image.imageUrl ? (
                            <img
                              src={image.imageUrl}
                              alt={image.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* CEO Comment */}
                        {ceoReviewComments[image.id] && (
                          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Crown className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">CEO Feedback</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{ceoReviewComments[image.id]}</p>
                          </div>
                        )}

                        {/* Asset Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <Badge className={`ml-2 ${getStatusColor(image.status)}`}>
                              {image.status === 'review' ? 'Pending Review' : image.status}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Model:</span>
                            <span className="ml-2">{image.model || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CEO Approved:</span>
                            <span className="ml-2">{image.ceoApproved ? '✓' : '✗'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Your Approval:</span>
                            <span className="ml-2">{image.userApproved ? '✓' : '✗'}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {!image.userApproved && (
                            <Button
                              onClick={() => handleApprove(image, 'user')}
                              className="flex-1 gap-2"
                            >
                              <ThumbsUp className="w-4 h-4" />
                              Approve
                            </Button>
                          )}
                          {image.userApproved && (
                            <Button variant="outline" className="flex-1 gap-2" disabled>
                              <CheckCircle2 className="w-4 h-4" />
                              Approved
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => handleRegenerate(image)}
                            className="gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Regenerate
                          </Button>
                          {image.imageUrl && (
                            <Button
                              variant="outline"
                              asChild
                            >
                              <a href={image.imageUrl} download={`${image.name}.png`} target="_blank">
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {generatedImages.length === 0 && !isGenerating && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No assets generated yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "Generate Assets" to create logos, icons, and banners for your brand
            </p>
            <Button onClick={startGeneration} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Brand Assets
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
