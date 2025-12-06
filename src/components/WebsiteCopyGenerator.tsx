import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type, Sparkles, Copy, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WebsiteCopyGeneratorProps {
  projectId: string;
  businessName?: string;
  industry?: string;
  brandVoice?: string;
}

const SECTIONS = [
  { id: 'hero', name: 'Hero Section', description: 'Main headline, subheadline, and CTA' },
  { id: 'features', name: 'Features', description: 'Product/service features and benefits' },
  { id: 'about', name: 'About Us', description: 'Company story and mission' },
  { id: 'testimonials', name: 'Testimonials', description: 'Customer reviews and social proof' },
  { id: 'pricing', name: 'Pricing', description: 'Pricing tiers and descriptions' },
  { id: 'cta', name: 'Call to Action', description: 'Final conversion section' },
  { id: 'faq', name: 'FAQ', description: 'Frequently asked questions' },
];

export default function WebsiteCopyGenerator({ projectId, businessName, industry, brandVoice }: WebsiteCopyGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState('hero');
  const [generatedCopy, setGeneratedCopy] = useState<Record<string, any>>({});
  const [customPrompt, setCustomPrompt] = useState('');

  const generateCopy = async (section: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('blog-generator', {
        body: { 
          action: 'generate_article',
          topic: `${section} section copy for ${businessName || 'website'}`,
          businessName,
          industry,
          brandVoice,
          targetLength: 300
        }
      });

      if (error) throw error;
      
      setGeneratedCopy(prev => ({
        ...prev,
        [section]: data.result?.article || data.result
      }));
      toast.success(`${section} copy generated!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate copy");
    } finally {
      setLoading(false);
    }
  };

  const generateAllSections = async () => {
    setLoading(true);
    for (const section of SECTIONS) {
      await generateCopy(section.id);
    }
    setLoading(false);
    toast.success("All sections generated!");
  };

  const copySectionToClipboard = (section: string) => {
    const content = generatedCopy[section];
    if (content) {
      navigator.clipboard.writeText(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
      toast.success("Copied to clipboard!");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Website Copy Generator</h2>
          <p className="text-muted-foreground">AI-powered copy for every section of your website</p>
        </div>
        <Button onClick={generateAllSections} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate All Sections
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Section Selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Sections</CardTitle>
            <CardDescription>Select a section to generate or edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedSection === section.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{section.name}</div>
                    <div className={`text-xs ${selectedSection === section.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {section.description}
                    </div>
                  </div>
                  {generatedCopy[section.id] && (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Copy Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{SECTIONS.find(s => s.id === selectedSection)?.name} Copy</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copySectionToClipboard(selectedSection)}
                  disabled={!generatedCopy[selectedSection]}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button 
                  size="sm"
                  onClick={() => generateCopy(selectedSection)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedCopy[selectedSection] ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto">
                  {typeof generatedCopy[selectedSection] === 'string' 
                    ? generatedCopy[selectedSection]
                    : JSON.stringify(generatedCopy[selectedSection], null, 2)
                  }
                </div>
                
                {/* Variant Generator */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Generate Variant</h4>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Describe the variation you want..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                    />
                    <Button variant="secondary" disabled={loading}>
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Type className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click the refresh button to generate copy for this section</p>
                <Button 
                  className="mt-4"
                  onClick={() => generateCopy(selectedSection)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate {SECTIONS.find(s => s.id === selectedSection)?.name}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      {Object.keys(generatedCopy).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Full Page Preview</CardTitle>
            <CardDescription>Preview all generated copy sections together</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8 max-h-[600px] overflow-y-auto">
              {SECTIONS.filter(s => generatedCopy[s.id]).map((section) => (
                <div key={section.id} className="border-l-4 border-primary pl-4">
                  <h3 className="font-bold text-lg mb-2">{section.name}</h3>
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {typeof generatedCopy[section.id] === 'string' 
                      ? generatedCopy[section.id].slice(0, 500) + (generatedCopy[section.id].length > 500 ? '...' : '')
                      : JSON.stringify(generatedCopy[section.id], null, 2).slice(0, 500)
                    }
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
