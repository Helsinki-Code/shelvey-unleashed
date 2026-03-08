import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, FileText, Table, FileBarChart, Database, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WarRoomState } from '@/types/agent';

interface ExportPanelProps {
  state: WarRoomState;
  onExport?: (format: string) => Promise<any>;
  className?: string;
}

export function ExportPanel({ state, onExport, className }: ExportPanelProps) {
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

  const handleExport = async (id: string, filename: string, type: string) => {
    setExporting(id);
    try {
      if (onExport) {
        const result = await onExport(id);
        if (result?.content) downloadFile(result.content, filename, type);
      } else {
        // Client-side fallback
        let content = '';
        if (id === 'keywords') {
          content = 'Keyword,Volume,Difficulty,CPC,Intent,Cluster\n' +
            state.data.keywords.map(k => `"${k.keyword}",${k.volume},${k.difficulty},${k.cpc},"${k.intent}","${k.cluster || ''}"`).join('\n');
        } else if (id === 'articles') {
          content = state.data.articles.map(a => `# ${a.title}\n\n${a.content}`).join('\n\n---\n\n');
        } else if (id === 'strategy') {
          content = JSON.stringify(state.data.contentStrategy, null, 2);
        } else if (id === 'comms') {
          content = JSON.stringify(state.communications, null, 2);
        } else if (id === 'session') {
          content = JSON.stringify(state, null, 2);
        } else if (id === 'report') {
          content = [
            `# SEO War Room Session Report`,
            `\n**Target URL:** ${state.mission?.url}`,
            `**Goals:** ${state.mission?.goals || 'General SEO'}`,
            `**Progress:** ${Math.round(state.mission?.totalProgress || 0)}%`,
            `\n## Phases`,
            ...state.phases.map(p => `- **${p.name}**: ${p.status}`),
            `\n## Keywords: ${state.data.keywords.length}`,
            `## Articles: ${state.data.articles.length}`,
            `## SERP Results: ${state.data.serpResults.length}`,
          ].join('\n');
        }
        downloadFile(content, filename, type);
      }
    } finally {
      setTimeout(() => setExporting(null), 500);
    }
  };

  const exports = [
    { id: 'articles', label: 'Articles (Markdown)', icon: FileText, count: state.data.articles.length, filename: 'articles.md', type: 'text/markdown' },
    { id: 'keywords', label: 'Keywords (CSV)', icon: Table, count: state.data.keywords.length, filename: 'keywords.csv', type: 'text/csv' },
    { id: 'strategy', label: 'Strategy (JSON)', icon: FileBarChart, count: state.data.contentStrategy ? 1 : 0, filename: 'strategy.json', type: 'application/json' },
    { id: 'comms', label: 'Communications (JSON)', icon: MessageSquare, count: state.communications.length, filename: 'communications.json', type: 'application/json' },
    { id: 'session', label: 'Full Session (JSON)', icon: Database, count: 1, filename: 'full_session.json', type: 'application/json' },
    { id: 'report', label: 'Session Report', icon: Download, count: 1, filename: 'session-report.md', type: 'text/markdown' },
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
              <Button size="sm" variant="outline" onClick={() => handleExport(exp.id, exp.filename, exp.type)} disabled={exp.count === 0 || exporting === exp.id} className="gap-1">
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
