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
  Upload
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
  status: 'pending' | 'generating' | 'uploading' | 'pending_review' | 'approved' | 'rejected';
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
}

export const ImageGenerationStudio = ({ 
  projectId, 
  phaseId,
  agentName,
  onAssetApproved 
}: ImageGenerationStudioProps) => {
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const [currentModel, setCurrentModel] = useState('');
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
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
        .select('generated_content, status, ceo_approved, user_approved')
        .eq('phase_id', phaseId)
        .eq('deliverable_type', 'brand_assets')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[ImageGenerationStudio] Failed to load existing brand assets:', error);
        return;
      }

      if (data?.generated_content) {
        const content = data.generated_content as Record<string, unknown>;
        const assets: GeneratedImage[] = [];
        
        if (content.primaryLogo && typeof content.primaryLogo === 'object') {
          const logo = content.primaryLogo as Record<string, unknown>;
          assets.push({
            id: 'logo-primary',
            type: 'logo',
            name: 'Primary Logo',
            imageUrl: logo.imageUrl as string,
            status: data.ceo_approved && data.user_approved ? 'approved' : 'pending_review',
            progress: 100,
            ceoApproved: data.ceo_approved || false,
            userApproved: data.user_approved || false,
            model: logo.model as string,
          });
        }
        
        if (Array.isArray(content.assets)) {
          content.assets.forEach((asset: Record<string, unknown>, idx: number) => {
            assets.push({
              id: `asset-${idx}`,
              type: (asset.type as GeneratedImage['type']) || 'icon',
              name: (asset.name as string) || `Asset ${idx + 1}`,
              imageUrl: asset.imageUrl as string,
              status: 'pending_review',
              progress: 100,
              model: asset.model as string,
            });
          });
        }

        if (assets.length > 0) {
          setGeneratedImages(assets);
        }
      }
    };

    fetchExistingAssets();
  }, [phaseId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startGeneration = async () => {
    setIsGenerating(true);
    setOverallProgress(0);
    setCurrentStatus('Connecting to generation service...');
    setStreamEvents([]);
    
    // Initialize assets as pending
    const initialAssets: GeneratedImage[] = [
      { id: 'logo-1', type: 'logo', name: 'Primary Logo', status: 'pending', progress: 0 },
      { id: 'logo-2', type: 'logo', name: 'Logo Variant', status: 'pending', progress: 0 },
      { id: 'icon-1', type: 'icon', name: 'App Icon', status: 'pending', progress: 0 },
      { id: 'banner-1', type: 'banner', name: 'Social Banner', status: 'pending', progress: 0 },
      { id: 'palette-1', type: 'color_palette', name: 'Color Palette', status: 'pending', progress: 0 },
    ];
    setGeneratedImages(initialAssets);

    // Get Supabase URL from the client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const streamUrl = `${supabaseUrl}/functions/v1/brand-assets-stream?projectId=${projectId}${phaseId ? `&phaseId=${phaseId}` : ''}`;

    try {
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);
          setStreamEvents(prev => [...prev.slice(-20), data]); // Keep last 20 events

          switch (data.type) {
            case 'start':
              setCurrentStatus(data.message || 'Starting generation...');
              break;

            case 'context_loaded':
            case 'brand_context_loaded':
              setCurrentStatus(data.message || 'Loading brand context...');
              break;

            case 'generating':
              setCurrentStatus(data.message || `Generating ${data.name}...`);
              setCurrentModel(data.model || '');
              setOverallProgress(data.progress || 0);
              
              // Update specific asset to generating
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
                      status: 'pending_review' as const,
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
              setCurrentStatus('All assets generated!');
              setCurrentModel('');
              eventSource.close();
              toast.success('Brand assets generated successfully!');
              break;

            case 'error':
              setIsGenerating(false);
              setCurrentStatus(`Error: ${data.message}`);
              eventSource.close();
              toast.error(data.message || 'Generation failed');
              break;
          }
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        setIsGenerating(false);
        setCurrentStatus('Connection error');
        eventSource.close();
        toast.error('Connection to generation service lost');
      };

    } catch (error) {
      console.error('Failed to start generation:', error);
      setIsGenerating(false);
      toast.error('Failed to start generation');
    }
  };

  const handleApprove = async (image: GeneratedImage, approver: 'ceo' | 'user') => {
    setGeneratedImages(images =>
      images.map(img =>
        img.id === image.id
          ? { 
              ...img, 
              [approver === 'ceo' ? 'ceoApproved' : 'userApproved']: true,
              status: (approver === 'ceo' ? img.userApproved : img.ceoApproved) ? 'approved' : img.status
            }
          : img
      )
    );

    toast.success(`${approver === 'ceo' ? 'CEO' : 'You'} approved ${image.name}`);

    if (phaseId) {
      await supabase
        .from('phase_deliverables')
        .update({
          [approver === 'ceo' ? 'ceo_approved' : 'user_approved']: true,
          updated_at: new Date().toISOString()
        })
        .eq('phase_id', phaseId)
        .eq('deliverable_type', 'brand_assets');
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
    // For now, trigger a full regeneration
    toast.info(`Regenerating ${image.name}...`);
    startGeneration();
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
      case 'pending_review': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generating': return 'bg-blue-500';
      case 'uploading': return 'bg-purple-500';
      case 'pending_review': return 'bg-yellow-500';
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
          {!isGenerating && generatedImages.length === 0 && (
            <Button onClick={startGeneration} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Assets
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
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
              {generatedImages.map((img, idx) => (
                <div
                  key={img.id}
                  className={`p-2 rounded-md text-center transition-all ${
                    img.status === 'generating' 
                      ? 'bg-primary/20 ring-2 ring-primary' 
                      : img.status === 'pending_review' 
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
                  {img.model && img.status !== 'pending' && (
                    <p className="text-[10px] text-muted-foreground truncate">{img.model}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Live Event Log */}
            <div className="bg-background/50 rounded-md p-2 max-h-24 overflow-y-auto">
              <div className="space-y-1">
                {streamEvents.slice(-5).map((event, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Zap className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground truncate">{event.message}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Generated Images Grid */}
        <ScrollArea className="h-[500px]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <AnimatePresence>
              {generatedImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group"
                >
                  <Card className={`overflow-hidden transition-all ${
                    image.status === 'approved' ? 'ring-2 ring-green-500' :
                    image.status === 'rejected' ? 'ring-2 ring-red-500' : 
                    image.status === 'generating' ? 'ring-2 ring-primary animate-pulse' : ''
                  }`}>
                    {/* Image Preview Area */}
                    <div className="aspect-square bg-muted relative">
                      {image.status === 'generating' || image.status === 'uploading' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/5 to-primary/10">
                          <div className="relative">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <div className="absolute inset-0 w-10 h-10 bg-primary/10 rounded-full animate-ping" />
                          </div>
                          <div className="text-center px-4">
                            <p className="text-sm font-medium">
                              {image.status === 'uploading' ? 'Uploading...' : 'Generating...'}
                            </p>
                            {image.model && (
                              <p className="text-xs text-muted-foreground">{image.model}</p>
                            )}
                          </div>
                        </div>
                      ) : image.status === 'pending' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/50">
                          <Clock className="w-8 h-8 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Waiting...</span>
                        </div>
                      ) : image.type === 'color_palette' && image.colorData ? (
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                          <div className="flex gap-2 w-full">
                            <div 
                              className="flex-1 h-20 rounded-lg shadow-inner" 
                              style={{ backgroundColor: image.colorData.primary }}
                            />
                            <div 
                              className="flex-1 h-20 rounded-lg shadow-inner" 
                              style={{ backgroundColor: image.colorData.secondary }}
                            />
                            <div 
                              className="flex-1 h-20 rounded-lg shadow-inner" 
                              style={{ backgroundColor: image.colorData.accent }}
                            />
                          </div>
                        </div>
                      ) : image.imageUrl ? (
                        <motion.img 
                          initial={{ opacity: 0, filter: 'blur(10px)' }}
                          animate={{ opacity: 1, filter: 'blur(0px)' }}
                          transition={{ duration: 0.5 }}
                          src={image.imageUrl} 
                          alt={image.name}
                          className="w-full h-full object-contain p-4"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="p-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                            {getTypeIcon(image.type)}
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        <Badge className={`${getStatusColor(image.status)} text-white text-xs gap-1`}>
                          {getStatusIcon(image.status)}
                          {image.status === 'generating' ? 'Generating' :
                           image.status === 'uploading' ? 'Uploading' :
                           image.status === 'pending' ? 'Waiting' :
                           image.status === 'pending_review' ? 'Review' :
                           image.status === 'approved' ? 'Approved' : 'Redo'}
                        </Badge>
                      </div>

                      {/* Model Badge */}
                      {image.model && image.status === 'pending_review' && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="text-xs">
                            {image.model}
                          </Badge>
                        </div>
                      )}

                      {/* Hover Actions */}
                      {image.status !== 'generating' && image.status !== 'pending' && image.status !== 'uploading' && (
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary">
                                <Maximize2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  {image.name}
                                  {image.model && (
                                    <Badge variant="outline" className="text-xs font-normal">
                                      {image.model}
                                    </Badge>
                                  )}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                                {image.imageUrl ? (
                                  <img src={image.imageUrl} alt={image.name} className="max-w-full max-h-full object-contain" />
                                ) : image.type === 'color_palette' && image.colorData ? (
                                  <div className="flex gap-4 w-full p-8">
                                    <div className="flex-1 flex flex-col items-center gap-2">
                                      <div 
                                        className="w-full h-32 rounded-lg shadow-lg" 
                                        style={{ backgroundColor: image.colorData.primary }}
                                      />
                                      <span className="text-sm font-mono">{image.colorData.primary}</span>
                                      <span className="text-xs text-muted-foreground">Primary</span>
                                    </div>
                                    <div className="flex-1 flex flex-col items-center gap-2">
                                      <div 
                                        className="w-full h-32 rounded-lg shadow-lg" 
                                        style={{ backgroundColor: image.colorData.secondary }}
                                      />
                                      <span className="text-sm font-mono">{image.colorData.secondary}</span>
                                      <span className="text-xs text-muted-foreground">Secondary</span>
                                    </div>
                                    <div className="flex-1 flex flex-col items-center gap-2">
                                      <div 
                                        className="w-full h-32 rounded-lg shadow-lg" 
                                        style={{ backgroundColor: image.colorData.accent }}
                                      />
                                      <span className="text-sm font-mono">{image.colorData.accent}</span>
                                      <span className="text-xs text-muted-foreground">Accent</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                                    {getTypeIcon(image.type)}
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          {image.imageUrl && (
                            <Button size="sm" variant="secondary" asChild>
                              <a href={image.imageUrl} download={`${image.name}.png`}>
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Asset Info */}
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(image.type)}
                        <span className="font-medium text-sm truncate">{image.name}</span>
                      </div>

                      {/* Approval Status */}
                      {image.status === 'pending_review' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Crown className="w-3 h-3" />
                            <span>CEO:</span>
                            {image.ceoApproved ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <span className="text-muted-foreground">Pending</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <User className="w-3 h-3" />
                            <span>You:</span>
                            {image.userApproved ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <span className="text-muted-foreground">Pending</span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(image, 'user')}
                              disabled={image.userApproved}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedImage(image);
                              }}
                            >
                              <ThumbsDown className="w-3 h-3" />
                              Redo
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Rejected State */}
                      {image.status === 'rejected' && (
                        <div className="space-y-2">
                          <p className="text-xs text-red-500">{image.feedback || 'Marked for regeneration'}</p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full gap-1"
                            onClick={() => handleRegenerate(image)}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Regenerate
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {generatedImages.length === 0 && !isGenerating && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">No Assets Generated Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click "Generate Assets" to create your brand visuals with AI
              </p>
              <Button onClick={startGeneration} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Generate Assets
              </Button>
            </div>
          )}
        </ScrollArea>

        {/* Feedback Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Changes for {selectedImage?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Describe what changes you'd like to see..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedImage(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedImage) {
                      handleReject(selectedImage);
                      setSelectedImage(null);
                    }
                  }}
                >
                  Submit Feedback
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
