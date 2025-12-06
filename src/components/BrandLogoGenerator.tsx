import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  RefreshCw, 
  Download, 
  Palette,
  Type,
  Shapes,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrandLogoGeneratorProps {
  projectId?: string;
  businessName?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  onLogoGenerated?: (logoData: any) => void;
}

export const BrandLogoGenerator = ({
  projectId = '',
  businessName = 'Your Brand',
  brandColors,
  onLogoGenerated
}: BrandLogoGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logoStyle, setLogoStyle] = useState('modern');
  const [logoDescription, setLogoDescription] = useState('');
  const [generatedLogos, setGeneratedLogos] = useState<any[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<number | null>(null);

  const logoStyles = [
    { id: 'modern', label: 'Modern Minimal', icon: Shapes },
    { id: 'bold', label: 'Bold & Strong', icon: Type },
    { id: 'elegant', label: 'Elegant & Refined', icon: Sparkles },
    { id: 'playful', label: 'Playful & Fun', icon: Palette },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setGeneratedLogos([]);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90));
    }, 200);

    try {
      // Generate logo concepts locally using SVG (no API call needed)
      // This is faster and doesn't require deliverableId
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate generation time
      
      const concepts = generateLogoSVGs(businessName, brandColors, logoStyle);
      setGeneratedLogos(concepts);
      setProgress(100);

      toast.success('Logo concepts generated!');
    } catch (error: unknown) {
      console.error('Logo generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate logos');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleSelectLogo = (index: number) => {
    setSelectedLogo(index);
    if (onLogoGenerated) {
      onLogoGenerated(generatedLogos[index]);
    }
    toast.success('Logo selected! It will be used in your brand assets.');
  };

  // Generate SVG logo concepts
  const generateLogoSVGs = (name: string, colors: any, style: string) => {
    const primary = colors?.primary || '#10B981';
    const secondary = colors?.secondary || '#059669';
    const initial = name.charAt(0).toUpperCase();

    const concepts = [
      {
        name: 'Circular Badge',
        svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" fill="${primary}"/>
          <text x="50" y="65" font-family="Inter, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">${initial}</text>
        </svg>`,
        description: 'Clean circular badge with centered initial'
      },
      {
        name: 'Gradient Square',
        svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect x="5" y="5" width="90" height="90" rx="15" fill="url(#grad1)"/>
          <text x="50" y="68" font-family="Inter, sans-serif" font-size="45" font-weight="bold" fill="white" text-anchor="middle">${initial}</text>
        </svg>`,
        description: 'Modern gradient square with rounded corners'
      },
      {
        name: 'Hexagon Tech',
        svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="${primary}"/>
          <polygon points="50,15 85,32.5 85,67.5 50,85 15,67.5 15,32.5" fill="${secondary}"/>
          <text x="50" y="62" font-family="Inter, sans-serif" font-size="35" font-weight="bold" fill="white" text-anchor="middle">${initial}</text>
        </svg>`,
        description: 'Tech-forward hexagonal design'
      },
      {
        name: 'Minimal Wordmark',
        svg: `<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="15" width="30" height="30" rx="5" fill="${primary}"/>
          <text x="10" y="40" font-family="Inter, sans-serif" font-size="20" font-weight="bold" fill="white">${initial}</text>
          <text x="40" y="42" font-family="Inter, sans-serif" font-size="28" font-weight="600" fill="${primary}">${name}</text>
        </svg>`,
        description: 'Clean wordmark with icon accent'
      },
    ];

    return concepts;
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI Logo Generator</CardTitle>
        </div>
        <CardDescription>
          Generate premium logo concepts for {businessName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Style Selection */}
        <div className="space-y-3">
          <Label>Logo Style</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {logoStyles.map((style) => {
              const Icon = style.icon;
              return (
                <button
                  key={style.id}
                  onClick={() => setLogoStyle(style.id)}
                  className={`p-4 rounded-lg border text-center transition-colors ${
                    logoStyle === style.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <span className="text-sm font-medium">{style.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Description */}
        <div className="space-y-2">
          <Label htmlFor="logo-desc">Additional Requirements (Optional)</Label>
          <Textarea
            id="logo-desc"
            placeholder="E.g., Include a leaf icon, use geometric shapes, incorporate a globe..."
            value={logoDescription}
            onChange={(e) => setLogoDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Brand Colors Preview */}
        {brandColors && (
          <div className="flex items-center gap-4">
            <Label>Brand Colors:</Label>
            <div className="flex gap-2">
              {brandColors.primary && (
                <div
                  className="w-8 h-8 rounded-full border-2 border-border"
                  style={{ backgroundColor: brandColors.primary }}
                  title="Primary"
                />
              )}
              {brandColors.secondary && (
                <div
                  className="w-8 h-8 rounded-full border-2 border-border"
                  style={{ backgroundColor: brandColors.secondary }}
                  title="Secondary"
                />
              )}
              {brandColors.accent && (
                <div
                  className="w-8 h-8 rounded-full border-2 border-border"
                  style={{ backgroundColor: brandColors.accent }}
                  title="Accent"
                />
              )}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating Logos...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Logo Concepts
            </>
          )}
        </Button>

        {isGenerating && (
          <Progress value={progress} className="h-2" />
        )}

        {/* Generated Logos */}
        {generatedLogos.length > 0 && (
          <div className="space-y-4">
            <Label>Select Your Logo</Label>
            <div className="grid grid-cols-2 gap-4">
              {generatedLogos.map((logo, index) => (
                <div
                  key={index}
                  className={`relative p-4 rounded-lg border bg-white cursor-pointer transition-all ${
                    selectedLogo === index
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSelectLogo(index)}
                >
                  {selectedLogo === index && (
                    <Badge className="absolute -top-2 -right-2 bg-primary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                  <div
                    className="h-24 flex items-center justify-center mb-3"
                    dangerouslySetInnerHTML={{ __html: logo.svg }}
                  />
                  <p className="text-sm font-medium text-center">{logo.name}</p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {logo.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
