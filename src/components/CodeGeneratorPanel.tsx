import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Code, Wand2, Search, FileCode, CheckCircle, XCircle, Clock, Copy, Download } from 'lucide-react';

interface CodePatch {
  id: string;
  file_path: string;
  patch_content: string;
  patch_type: string;
  status: string;
  created_at: string;
  metadata: any;
}

export const CodeGeneratorPanel = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [filePath, setFilePath] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [review, setReview] = useState('');
  const [codeToReview, setCodeToReview] = useState('');
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [originalCode, setOriginalCode] = useState('');
  const [patches, setPatches] = useState<CodePatch[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Error', description: 'Please enter a prompt', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('code-generator', {
        body: {
          action: 'generate',
          prompt,
          file_path: filePath || undefined
        }
      });

      if (error) throw error;

      setGeneratedCode(data.code);
      toast({ title: 'Success', description: 'Code generated successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async () => {
    if (!codeToReview.trim()) {
      toast({ title: 'Error', description: 'Please enter code to review', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('code-generator', {
        body: {
          action: 'review',
          original_content: codeToReview
        }
      });

      if (error) throw error;

      setReview(data.review);
      toast({ title: 'Success', description: 'Code review completed' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchReplace = async () => {
    if (!originalCode.trim() || !searchText.trim()) {
      toast({ title: 'Error', description: 'Please enter original code and search text', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('code-generator', {
        body: {
          action: 'search_replace',
          original_content: originalCode,
          search: searchText,
          replace: replaceText,
          file_path: filePath || undefined
        }
      });

      if (error) throw error;

      setOriginalCode(data.new_content);
      toast({ title: 'Success', description: `Replaced ${data.changes_count} occurrences` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatches = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('code-generator', {
        body: { action: 'get_patches' }
      });

      if (error) throw error;
      setPatches(data.patches || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Code copied to clipboard' });
  };

  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5 text-primary" />
          Code Generator
        </CardTitle>
        <CardDescription>
          AI-powered code generation, review, and patch management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generate" className="flex items-center gap-1">
              <Wand2 className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-1">
              <FileCode className="h-4 w-4" />
              Review
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              Search/Replace
            </TabsTrigger>
            <TabsTrigger value="patches" className="flex items-center gap-1" onClick={loadPatches}>
              <Code className="h-4 w-4" />
              Patches
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Input
                placeholder="File path (optional, e.g., src/components/MyComponent.tsx)"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
              />
              <Textarea
                placeholder="Describe the code you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
              />
              <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                {isLoading ? 'Generating...' : 'Generate Code'}
              </Button>
            </div>

            {generatedCode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Generated Code</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedCode)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadCode(generatedCode, filePath || 'generated.tsx')}>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-64 rounded-md border border-border bg-muted/30 p-4">
                  <pre className="text-sm font-mono whitespace-pre-wrap">{generatedCode}</pre>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-4 mt-4">
            <Textarea
              placeholder="Paste code to review..."
              value={codeToReview}
              onChange={(e) => setCodeToReview(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <Button onClick={handleReview} disabled={isLoading} className="w-full">
              {isLoading ? 'Reviewing...' : 'Review Code'}
            </Button>

            {review && (
              <ScrollArea className="h-64 rounded-md border border-border bg-muted/30 p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm">{review}</pre>
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-4 mt-4">
            <Textarea
              placeholder="Original code..."
              value={originalCode}
              onChange={(e) => setOriginalCode(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Search text..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Input
                placeholder="Replace with..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
              />
            </div>
            <Button onClick={handleSearchReplace} disabled={isLoading} className="w-full">
              {isLoading ? 'Replacing...' : 'Search & Replace'}
            </Button>
          </TabsContent>

          <TabsContent value="patches" className="mt-4">
            <ScrollArea className="h-80">
              {patches.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No patches found. Generate some code first!
                </div>
              ) : (
                <div className="space-y-2">
                  {patches.map((patch) => (
                    <div
                      key={patch.id}
                      className="p-3 rounded-lg border border-border bg-muted/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(patch.status)}
                          <span className="font-mono text-sm">{patch.file_path}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{patch.patch_type}</Badge>
                          <Badge variant={patch.status === 'applied' ? 'default' : 'secondary'}>
                            {patch.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(patch.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
