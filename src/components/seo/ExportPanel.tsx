import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Table, FileBarChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WarRoomState } from '@/types/agent';

interface ExportPanelProps {
  state: WarRoomState;
  className?: string;
}

export function ExportPanel({ state, className }: ExportPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportArticles = () => {
    setExporting('articles');
    const md = state.articles.map(a => `# ${a.title}\n\n${a.content}`).join('\n\n---\n\n');
    downloadFile(md, 'articles.md', 'text/markdown');
    setTimeout(() => setExporting(null), 1000);
  };

  const exportKeywords = () => {
    setExporting('keywords');
    const header = 'Keyword,Volume,Difficulty,CPC,Intent,Cluster\n';
    const rows = state.keywords.map(k => `"${k.keyword}",${k.volume},${k.difficulty},${k.cpc},${k.intent},"${k.cluster || ''}"`).join('\n');
    downloadFile(header + rows, 'keywords.csv', 'text/csv');
    setTimeout(() => setExporting(null), 1000);
  };

  const exportStrategy = () => {
    setExporting('strategy');
    const content = state.strategy ? JSON.stringify(state.strategy, null, 2) : '{}';
    downloadFile(content, 'content-strategy.json', 'application/json');
    setTimeout(() => setExporting(null), 1000);
  };

  const exportSessionReport = () => {
    setExporting('report');
    const report = [
      `# SEO War Room Session Report`,
      `\n**Target URL:** ${state.targetUrl}`,
      `**Goals:** ${state.goals || 'General SEO improvement'}`,
      `**Progress:** ${Math.round(state.overallProgress)}%`,
      `\n## Keywords Found: ${state.keywords.length}`,
      `## Articles Generated: ${state.articles.length}`,
      `## SERP Results: ${state.serpResults.length}`,
      `\n## Agent Activity`,
      ...state.agentTasks.map(a => `- **${a.name}**: ${a.status} (${a.progress}%)`),
    ].join('\n');
    downloadFile(report, 'session-report.md', 'text/markdown');
    setTimeout(() => setExporting(null), 1000);
  };

  const exports = [
    { id: 'articles', label: 'Articles (Markdown)', icon: FileText, count: state.articles.length, action: exportArticles },
    { id: 'keywords', label: 'Keywords (CSV)', icon: Table, count: state.keywords.length, action: exportKeywords },
    { id: 'strategy', label: 'Strategy (JSON)', icon: FileBarChart, count: state.strategy ? 1 : 0, action: exportStrategy },
    { id: 'report', label: 'Session Report', icon: Download, count: 1, action: exportSessionReport },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {exports.map((exp) => {
        const Icon = exp.icon;
        return (
          <Card key={exp.id} className="border-border/50">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{exp.label}</p>
                  <p className="text-xs text-muted-foreground">{exp.count} item{exp.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={exp.action}
                disabled={exp.count === 0 || exporting === exp.id}
                className="gap-1"
              >
                <Download className="w-3 h-3" />
                {exporting === exp.id ? 'Exporting...' : 'Export'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
