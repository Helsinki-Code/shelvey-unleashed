import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Palette, 
  Type, 
  Image, 
  Download,
  Copy,
  CheckCircle2,
  Sparkles,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface BrandAssetsProps {
  branding?: {
    colorPalette?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
    typography?: {
      heading?: string;
      body?: string;
    };
    logoDescription?: string;
    designPrinciples?: string[];
  };
  businessName?: string;
  logo?: any;
}

export const BrandAssetsPanel = ({ 
  branding = {}, 
  businessName = 'Your Brand', 
  logo 
}: BrandAssetsProps) => {
  const colors = branding?.colorPalette || {};
  const typography = branding?.typography || {};

  const colorVariants = generateColorVariants(colors.primary || '#10B981');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const downloadAssets = () => {
    // Create CSS variables file content
    const cssContent = `:root {
  /* Primary Colors */
  --primary: ${colors.primary || '#10B981'};
  --primary-light: ${colorVariants.light};
  --primary-dark: ${colorVariants.dark};
  
  /* Secondary Colors */
  --secondary: ${colors.secondary || '#059669'};
  
  /* Accent Colors */
  --accent: ${colors.accent || '#34D399'};
  
  /* Typography */
  --font-heading: '${typography.heading || 'Inter'}', sans-serif;
  --font-body: '${typography.body || 'Inter'}', sans-serif;
}

/* Brand Gradients */
.brand-gradient {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
}

.brand-gradient-accent {
  background: linear-gradient(135deg, var(--primary), var(--accent));
}

/* Brand Text */
.brand-text-gradient {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
`;

    const blob = new Blob([cssContent], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-brand-variables.css`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Brand assets downloaded!');
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle>Brand Assets</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={downloadAssets}>
            <Download className="h-4 w-4 mr-2" />
            Export CSS
          </Button>
        </div>
        <CardDescription>
          Your complete brand identity system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="logo">Logo</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="mt-4 space-y-6">
            {/* Primary Color */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Primary Color
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: 'Lightest', color: colorVariants.lightest },
                  { name: 'Light', color: colorVariants.light },
                  { name: 'Primary', color: colors.primary || '#10B981' },
                  { name: 'Dark', color: colorVariants.dark },
                  { name: 'Darkest', color: colorVariants.darkest },
                ].map((variant) => (
                  <div key={variant.name} className="text-center">
                    <button
                      className="w-full aspect-square rounded-lg border-2 border-border hover:border-primary transition-colors mb-2"
                      style={{ backgroundColor: variant.color }}
                      onClick={() => copyToClipboard(variant.color, variant.name)}
                    />
                    <p className="text-xs text-muted-foreground">{variant.name}</p>
                    <p className="text-xs font-mono">{variant.color}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-3">
              <h4 className="font-medium">Brand Palette</h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'Primary', color: colors.primary || '#10B981' },
                  { name: 'Secondary', color: colors.secondary || '#059669' },
                  { name: 'Accent', color: colors.accent || '#34D399' },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="p-4 rounded-lg border border-border"
                  >
                    <div
                      className="w-full h-16 rounded-lg mb-3"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {item.color}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(item.color, item.name)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gradients */}
            <div className="space-y-3">
              <h4 className="font-medium">Brand Gradients</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border">
                  <div
                    className="w-full h-16 rounded-lg mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary || '#10B981'}, ${colors.secondary || '#059669'})`
                    }}
                  />
                  <p className="font-medium text-sm">Primary Gradient</p>
                  <p className="text-xs text-muted-foreground">Primary → Secondary</p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <div
                    className="w-full h-16 rounded-lg mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary || '#10B981'}, ${colors.accent || '#34D399'})`
                    }}
                  />
                  <p className="font-medium text-sm">Accent Gradient</p>
                  <p className="text-xs text-muted-foreground">Primary → Accent</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="mt-4 space-y-6">
            <div className="space-y-4">
              <div className="p-6 rounded-lg border border-border">
                <Badge className="mb-4">Heading Font</Badge>
                <h2 
                  className="text-4xl font-bold mb-2"
                  style={{ fontFamily: `'${typography.heading || 'Inter'}', sans-serif` }}
                >
                  {businessName}
                </h2>
                <p className="text-muted-foreground">
                  Font: {typography.heading || 'Inter'}
                </p>
                <div className="mt-4 space-y-1">
                  <p className="text-3xl font-bold" style={{ fontFamily: `'${typography.heading || 'Inter'}', sans-serif` }}>H1 - The quick brown fox</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: `'${typography.heading || 'Inter'}', sans-serif` }}>H2 - The quick brown fox</p>
                  <p className="text-xl font-semibold" style={{ fontFamily: `'${typography.heading || 'Inter'}', sans-serif` }}>H3 - The quick brown fox</p>
                </div>
              </div>

              <div className="p-6 rounded-lg border border-border">
                <Badge className="mb-4">Body Font</Badge>
                <p 
                  className="text-lg mb-2"
                  style={{ fontFamily: `'${typography.body || 'Inter'}', sans-serif` }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
                <p className="text-muted-foreground">
                  Font: {typography.body || 'Inter'}
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-base" style={{ fontFamily: `'${typography.body || 'Inter'}', sans-serif` }}>Regular - The quick brown fox jumps over the lazy dog.</p>
                  <p className="text-base font-medium" style={{ fontFamily: `'${typography.body || 'Inter'}', sans-serif` }}>Medium - The quick brown fox jumps over the lazy dog.</p>
                  <p className="text-sm" style={{ fontFamily: `'${typography.body || 'Inter'}', sans-serif` }}>Small - The quick brown fox jumps over the lazy dog.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logo" className="mt-4">
            {logo ? (
              <div className="space-y-4">
                <div className="p-8 rounded-lg border border-border bg-white">
                  <div
                    className="max-w-[200px] mx-auto"
                    dangerouslySetInnerHTML={{ __html: logo.svg }}
                  />
                </div>
                <div className="p-8 rounded-lg border border-border bg-gray-900">
                  <div
                    className="max-w-[200px] mx-auto"
                    dangerouslySetInnerHTML={{ __html: logo.svg }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {logo.name} - {logo.description}
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No logo selected yet. Use the Logo Generator to create one.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="guidelines" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-6 pr-4">
                {/* Logo Description */}
                {branding?.logoDescription && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Logo Concept
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                      {branding.logoDescription}
                    </p>
                  </div>
                )}

                {/* Design Principles */}
                {branding?.designPrinciples && branding.designPrinciples.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Design Principles</h4>
                    <div className="space-y-2">
                      {branding.designPrinciples.map((principle, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                          <p className="text-sm">{principle}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Usage Guidelines */}
                <div className="space-y-2">
                  <h4 className="font-medium">Usage Guidelines</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="p-3 bg-muted/30 rounded-lg">
                      ✓ Always maintain adequate contrast between text and backgrounds
                    </p>
                    <p className="p-3 bg-muted/30 rounded-lg">
                      ✓ Use the primary color for main CTAs and important elements
                    </p>
                    <p className="p-3 bg-muted/30 rounded-lg">
                      ✓ Reserve the accent color for highlights and special emphasis
                    </p>
                    <p className="p-3 bg-muted/30 rounded-lg">
                      ✗ Don't modify logo colors or proportions
                    </p>
                    <p className="p-3 bg-muted/30 rounded-lg">
                      ✗ Don't use more than two brand colors together
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Helper function to generate color variants
function generateColorVariants(hexColor: string) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const lighten = (amount: number) => {
    const newR = Math.min(255, Math.round(r + (255 - r) * amount));
    const newG = Math.min(255, Math.round(g + (255 - g) * amount));
    const newB = Math.min(255, Math.round(b + (255 - b) * amount));
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  const darken = (amount: number) => {
    const newR = Math.max(0, Math.round(r * (1 - amount)));
    const newG = Math.max(0, Math.round(g * (1 - amount)));
    const newB = Math.max(0, Math.round(b * (1 - amount)));
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  return {
    lightest: lighten(0.8),
    light: lighten(0.4),
    dark: darken(0.2),
    darkest: darken(0.4),
  };
}
