import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadedAsset {
  id: string;
  name: string;
  url: string;
  type: 'logo' | 'image' | 'document';
  uploadedAt: string;
}

interface BrandAssetsUploaderProps {
  projectId: string;
  userId: string;
}

export const BrandAssetsUploader = ({ projectId, userId }: BrandAssetsUploaderProps) => {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing assets on mount
  useEffect(() => {
    loadExistingAssets();
  }, [projectId]);

  const loadExistingAssets = async () => {
    try {
      // Get project metadata
      const { data: project } = await supabase
        .from('business_projects')
        .select('business_model')
        .eq('id', projectId)
        .single();

      if (project?.business_model) {
        const metadata = typeof project.business_model === 'string' 
          ? JSON.parse(project.business_model) 
          : project.business_model;
        
        if (metadata?.uploaded_assets) {
          setAssets(metadata.uploaded_assets);
        }
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAssets: UploadedAsset[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${userId}/${projectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('project-assets')
          .getPublicUrl(filePath);

        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt?.toLowerCase() || '');
        const isLogo = file.name.toLowerCase().includes('logo');

        const asset: UploadedAsset = {
          id: crypto.randomUUID(),
          name: file.name,
          url: urlData.publicUrl,
          type: isLogo ? 'logo' : isImage ? 'image' : 'document',
          uploadedAt: new Date().toISOString(),
        };

        newAssets.push(asset);
      }

      // Update project metadata with new assets
      const updatedAssets = [...assets, ...newAssets];
      
      const { data: project } = await supabase
        .from('business_projects')
        .select('business_model')
        .eq('id', projectId)
        .single();

      const existingMetadata = project?.business_model || {};
      const metadata = typeof existingMetadata === 'string' 
        ? JSON.parse(existingMetadata) 
        : existingMetadata;

      await supabase
        .from('business_projects')
        .update({
          business_model: {
            ...metadata,
            uploaded_assets: updatedAssets,
          },
        })
        .eq('id', projectId);

      setAssets(updatedAssets);
      toast.success(`Uploaded ${newAssets.length} asset(s) successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload some files');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAsset = async (assetId: string) => {
    try {
      const assetToRemove = assets.find(a => a.id === assetId);
      if (!assetToRemove) return;

      // Extract file path from URL for deletion
      const urlParts = assetToRemove.url.split('/project-assets/');
      if (urlParts[1]) {
        await supabase.storage
          .from('project-assets')
          .remove([decodeURIComponent(urlParts[1])]);
      }

      const updatedAssets = assets.filter(a => a.id !== assetId);

      const { data: project } = await supabase
        .from('business_projects')
        .select('business_model')
        .eq('id', projectId)
        .single();

      const existingMetadata = project?.business_model || {};
      const metadata = typeof existingMetadata === 'string' 
        ? JSON.parse(existingMetadata) 
        : existingMetadata;

      await supabase
        .from('business_projects')
        .update({
          business_model: {
            ...metadata,
            uploaded_assets: updatedAssets,
          },
        })
        .eq('id', projectId);

      setAssets(updatedAssets);
      toast.success('Asset removed');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove asset');
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'logo':
        return <Badge variant="secondary" className="text-xs">Logo</Badge>;
      case 'image':
        return <Image className="w-4 h-4 text-muted-foreground" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Brand Assets
        </CardTitle>
        <CardDescription>
          Upload your existing logos, images, or documents to use in this project
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Upload Area */}
        <div 
          className="border-2 border-dashed border-muted rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors mb-4"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Uploading...</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, SVG, PDF, DOC up to 10MB
              </p>
            </>
          )}
        </div>

        {/* Uploaded Assets */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : assets.length > 0 ? (
          <div className="space-y-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                {asset.type !== 'document' ? (
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getAssetIcon(asset.type)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(asset.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAsset(asset.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No assets uploaded yet. Your uploaded logos will be used in Phase 2 branding.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
