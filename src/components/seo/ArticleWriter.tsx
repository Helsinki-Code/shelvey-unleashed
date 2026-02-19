import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Image, Link2, Download, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { GeneratedArticle, ArticleSection, LinkSuggestion } from '@/types/agent';

interface ArticleWriterProps {
  article: GeneratedArticle;
  onUpdate: (article: GeneratedArticle) => void;
  className?: string;
}

function useStreamingText(text: string, speed: number = 30) {
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!text) { setDisplayedText(''); return; }
    setIsStreaming(true);
    setDisplayedText('');
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsStreaming(false);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayedText, isStreaming };
}

interface SectionWriterProps {
  section: ArticleSection;
  isWriting: boolean;
  onComplete: (content: string) => void;
}

function SectionWriter({ section, isWriting, onComplete }: SectionWriterProps) {
  const { displayedText, isStreaming } = useStreamingText(section.content, 20);

  useEffect(() => {
    if (!isStreaming && isWriting && section.content) {
      onComplete(section.content);
    }
  }, [isStreaming, isWriting, section.content, onComplete]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{section.heading}</h3>
        {section.visualType && section.visualType !== 'none' && (
          <Badge variant="outline" className="text-xs">
            {section.visualType === 'chart' ? '📊 Chart' : section.visualType === 'image' ? '🖼️ Image' : '📋 Table'}
          </Badge>
        )}
        {isStreaming && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Writing...
          </span>
        )}
      </div>
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap">{displayedText}</div>
        {isStreaming && <span className="inline-block w-0.5 h-4 bg-primary ml-1" />}
      </div>
    </div>
  );
}

interface ImageGeneratorProps {
  prompt: string;
  onImageGenerated: (url: string) => void;
}

function ImageGenerator({ prompt, onImageGenerated }: ImageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setTimeout(() => {
      const url = `https://picsum.photos/seed/${encodeURIComponent(prompt)}/800/450`;
      setImageUrl(url);
      onImageGenerated(url);
      setIsGenerating(false);
    }, 2000);
  }, [prompt, onImageGenerated]);

  return (
    <Card className="overflow-hidden">
      {!imageUrl ? (
        <div className="p-4 text-center">
          <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">{prompt}</p>
          <Button size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </Button>
        </div>
      ) : (
        <div className="relative">
          <img src={imageUrl} alt={prompt} className="w-full h-auto" />
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />Generated
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
}

interface LinkSuggestionsProps {
  suggestions: LinkSuggestion[];
  onApply: (suggestions: LinkSuggestion[]) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function LinkSuggestionsPanel({ suggestions, onApply }: LinkSuggestionsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(suggestions.map(s => s.id)));

  const toggleSelected = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelected(newSelected);
  };

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className={cn(
            "p-3 rounded-lg border transition-all cursor-pointer",
            selected.has(suggestion.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
          onClick={() => toggleSelected(suggestion.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">{suggestion.anchorText}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{suggestion.targetUrl}</p>
              <p className="text-xs text-muted-foreground mt-1 italic">"{suggestion.context}"</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {Math.round(suggestion.confidence * 100)}% match
            </Badge>
          </div>
        </div>
      ))}
      {suggestions.length > 0 && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => onApply(suggestions.filter(s => selected.has(s.id)))}>
            Apply Selected ({selected.size})
          </Button>
        </div>
      )}
    </div>
  );
}

export function ArticleWriter({ article, onUpdate, className }: ArticleWriterProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [showLinks, setShowLinks] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const wordCount = article.content.split(/\s+/).filter(w => w.length > 0).length;
  const targetWordCount = 3000;
  const progressPercent = Math.min((wordCount / targetWordCount) * 100, 100);

  const handleSectionComplete = useCallback((content: string) => {
    const updatedSections = [...article.sections];
    updatedSections[activeSection] = { ...updatedSections[activeSection], content };
    onUpdate({
      ...article,
      sections: updatedSections,
      content: updatedSections.map(s => s.content).join('\n\n'),
    });
  }, [article, activeSection, onUpdate]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeSection]);

  return (
    <div className={cn("flex h-full gap-4", className)}>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">{article.title || article.keyword}</h2>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={article.status === 'completed' ? 'default' : 'secondary'}>
                {article.status.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {wordCount.toLocaleString()} / {targetWordCount.toLocaleString()} words
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowLinks(!showLinks)}>
              <Link2 className="w-4 h-4 mr-2" />Internal Links
            </Button>
            <Button size="sm">
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Word Count Progress</span>
            <span className="font-mono">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <Tabs value={activeSection.toString()} className="flex-1 flex flex-col">
          <TabsList className="grid grid-flow-col auto-cols-max gap-1 h-auto p-1">
            {article.sections.map((_, index) => (
              <TabsTrigger key={index} value={index.toString()} onClick={() => setActiveSection(index)} className="text-xs px-3 py-1.5">
                {index === 0 ? 'Intro' : `H2-${index}`}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea ref={scrollRef as any} className="flex-1 mt-4">
            <TabsContent value={activeSection.toString()} className="mt-0">
              <SectionWriter
                section={article.sections[activeSection]}
                isWriting={article.status === 'drafting'}
                onComplete={handleSectionComplete}
              />
              {article.sections[activeSection]?.visualType === 'image' && article.sections[activeSection]?.imagePrompt && (
                <div className="mt-4">
                  <ImageGenerator
                    prompt={article.sections[activeSection].imagePrompt!}
                    onImageGenerated={(url) => {
                      const updatedSections = [...article.sections];
                      updatedSections[activeSection] = { ...updatedSections[activeSection], imageUrl: url };
                      onUpdate({ ...article, sections: updatedSections });
                    }}
                  />
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {showLinks && (
        <Card className="w-80 shrink-0">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Internal Link Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-4">
            <LinkSuggestionsPanel
              suggestions={article.linkSuggestions || []}
              onApply={(suggestions) => console.log('Applying links:', suggestions)}
              onApprove={(id) => console.log('Approved:', id)}
              onReject={(id) => console.log('Rejected:', id)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ArticleWriter;
