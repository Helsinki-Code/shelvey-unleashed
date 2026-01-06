import { useState, useEffect } from 'react';
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
  Layers
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
  status: 'generating' | 'pending_review' | 'approved' | 'rejected';
  progress: number;
  ceoApproved?: boolean;
  userApproved?: boolean;
  feedback?: string;
  generatedAt?: string;
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
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);

  // Simulate real-time image generation streaming
  useEffect(() => {
    if (isGenerating && currentGeneratingIndex !== null) {
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            // Mark current image as generated
            setGeneratedImages(images => 
              images.map((img, idx) => 
                idx === currentGeneratingIndex 
                  ? { ...img, status: 'pending_review' as const, progress: 100 }
                  : img
              )
            );
            // Move to next image or finish
            if (currentGeneratingIndex < generatedImages.length - 1) {
              setCurrentGeneratingIndex(currentGeneratingIndex + 1);
              setGenerationProgress(0);
            } else {
              setIsGenerating(false);
              setCurrentGeneratingIndex(null);
            }
            return 0;
          }
          // Update current image progress
          setGeneratedImages(images =>
            images.map((img, idx) =>
              idx === currentGeneratingIndex
                ? { ...img, progress: prev + 5 }
                : img
            )
          );
          return prev + 5;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isGenerating, currentGeneratingIndex, generatedImages.length]);

  // Fetch existing brand assets from deliverables
  useEffect(() => {
    const fetchExistingAssets = async () => {
      if (!phaseId) return;
      
      const { data } = await supabase
        .from('phase_deliverables')
        .select('generated_content, status, ceo_approved, user_approved')
        .eq('phase_id', phaseId)
        .eq('deliverable_type', 'brand_assets')
        .single();

      if (data?.generated_content) {
        const content = data.generated_content as any;
        const assets: GeneratedImage[] = [];
        
        if (content.primaryLogo) {
          assets.push({
            id: 'logo-primary',
            type: 'logo',
            name: 'Primary Logo',
            imageUrl: content.primaryLogo.imageUrl,
            status: data.ceo_approved && data.user_approved ? 'approved' : 'pending_review',
            progress: 100,
            ceoApproved: data.ceo_approved || false,
            userApproved: data.user_approved || false
          });
        }
        
        if (content.assets) {
          content.assets.forEach((asset: any, idx: number) => {
            assets.push({
              id: `asset-${idx}`,
              type: asset.type || 'icon',
              name: asset.name || `Asset ${idx + 1}`,
              imageUrl: asset.imageUrl,
              status: 'pending_review',
              progress: 100
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

  const startGeneration = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Initialize the assets to be generated
    const assetsToGenerate: GeneratedImage[] = [
      { id: 'logo-1', type: 'logo', name: 'Primary Logo', status: 'generating', progress: 0 },
      { id: 'logo-2', type: 'logo', name: 'Logo Variant', status: 'generating', progress: 0 },
      { id: 'icon-1', type: 'icon', name: 'App Icon', status: 'generating', progress: 0 },
      { id: 'banner-1', type: 'banner', name: 'Social Banner', status: 'generating', progress: 0 },
      { id: 'palette-1', type: 'color_palette', name: 'Color Palette', status: 'generating', progress: 0 },
    ];
    
    setGeneratedImages(assetsToGenerate);
    setCurrentGeneratingIndex(0);

    // Call the actual generation endpoint
    try {
      const { data, error } = await supabase.functions.invoke('brand-assets-generator', {
        body: { 
          projectId, 
          phaseId,
          action: 'generate-brand-assets'
        }
      });

      if (error) {
        console.error('Generation error:', error);
        toast.error('Failed to start asset generation');
      }
    } catch (err) {
      console.error('Generation error:', err);
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

    // Update in database
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

  const handleReject = async (image: GeneratedImage, approver: 'ceo' | 'user') => {
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
    setGeneratedImages(images =>
      images.map(img =>
        img.id === image.id
          ? { ...img, status: 'generating' as const, progress: 0, ceoApproved: false, userApproved: false }
          : img
      )
    );

    // Simulate regeneration
    const idx = generatedImages.findIndex(img => img.id === image.id);
    if (idx !== -1) {
      setCurrentGeneratingIndex(idx);
      setIsGenerating(true);
      setGenerationProgress(0);
    }

    toast.info(`Regenerating ${image.name}...`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generating': return 'bg-blue-500';
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
                {agentName} is generating brand assets
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
        {/* Generation Progress */}
        {isGenerating && currentGeneratingIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="font-medium">
                Generating: {generatedImages[currentGeneratingIndex]?.name}
              </span>
              <Badge variant="secondary" className="ml-auto">
                {currentGeneratingIndex + 1} / {generatedImages.length}
              </Badge>
            </div>
            <Progress value={generationProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              AI is creating your brand asset... {generationProgress}%
            </p>
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
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <Card className={`overflow-hidden transition-all ${
                    image.status === 'approved' ? 'ring-2 ring-green-500' :
                    image.status === 'rejected' ? 'ring-2 ring-red-500' : ''
                  }`}>
                    {/* Image Preview Area */}
                    <div className="aspect-square bg-muted relative">
                      {image.status === 'generating' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <Progress value={image.progress} className="w-3/4 h-1" />
                          <span className="text-xs text-muted-foreground">{image.progress}%</span>
                        </div>
                      ) : image.imageUrl ? (
                        <img 
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
                        <Badge className={`${getStatusColor(image.status)} text-white text-xs`}>
                          {image.status === 'generating' ? 'Generating...' :
                           image.status === 'pending_review' ? 'Review' :
                           image.status === 'approved' ? 'Approved' : 'Redo'}
                        </Badge>
                      </div>

                      {/* Hover Actions */}
                      {image.status !== 'generating' && (
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary">
                                <Maximize2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{image.name}</DialogTitle>
                              </DialogHeader>
                              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                                {image.imageUrl ? (
                                  <img src={image.imageUrl} alt={image.name} className="max-w-full max-h-full object-contain" />
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

                      {/* Approved State */}
                      {image.status === 'approved' && (
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Fully Approved</span>
                        </div>
                      )}

                      {/* Rejected State */}
                      {image.status === 'rejected' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <XCircle className="w-4 h-4" />
                            <span>Marked for Redo</span>
                          </div>
                          {image.feedback && (
                            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              {image.feedback}
                            </p>
                          )}
                          <Button 
                            size="sm" 
                            className="w-full gap-2"
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
                      handleReject(selectedImage, 'user');
                      setSelectedImage(null);
                    }
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Request Regeneration
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {generatedImages.length === 0 && !isGenerating && (
          <div className="text-center py-12">
            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Ready to Generate Brand Assets</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Click the button above to start generating logos, icons, and other brand assets
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
