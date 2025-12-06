import { useState } from 'react';
import { Download, FileText, FileJson, Code, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReportExporterProps {
  deliverableId: string;
  deliverableName: string;
}

export const ReportExporter = ({ deliverableId, deliverableName }: ReportExporterProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportReport = async (format: 'pdf' | 'docx' | 'json' | 'html') => {
    setIsExporting(true);

    try {
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-deliverable-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            deliverableId,
            options: {
              format,
              includeScreenshots: true,
              includeCitations: true,
              includeAgentActivity: true,
            },
          }),
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const contentType = response.headers.get('content-type');
      
      if (format === 'json' || format === 'html') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deliverableName.replace(/\s+/g, '_')}_report.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${format.toUpperCase()} report downloaded!`);
      } else {
        const data = await response.json();
        // For PDF/DOCX, we'd need a proper document generation library
        // For now, download as HTML
        const blob = new Blob([data.content || JSON.stringify(data, null, 2)], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deliverableName.replace(/\s+/g, '_')}_report.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Report downloaded!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportReport('html')} className="gap-2">
          <Code className="w-4 h-4" />
          Export as HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportReport('json')} className="gap-2">
          <FileJson className="w-4 h-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportReport('pdf')} className="gap-2">
          <FileText className="w-4 h-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};