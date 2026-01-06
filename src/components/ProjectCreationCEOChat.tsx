import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ProjectCreationCEOChatProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export const ProjectCreationCEOChat = ({ open, onClose, onProjectCreated }: ProjectCreationCEOChatProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your CEO, and I'm excited to help you create a new business project! 🚀

Tell me about your business idea, or if you're not sure yet, I can suggest some profitable opportunities based on current market trends.

What would you like to do?
• Describe your business idea
• Get business suggestions from me
• Explore trending markets`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedProject, setExtractedProject] = useState<any>(null);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ceo-agent-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: userMessage }].map(m => ({
              role: m.role,
              content: m.content,
            })),
            currentPage: '/projects/new',
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantMessage = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant' && prev.length > 1) {
                    return [...prev.slice(0, -1), { role: 'assistant', content: assistantMessage }];
                  }
                  return [...prev, { role: 'assistant', content: assistantMessage }];
                });
              }
            } catch {}
          }
        }
      }

      // Try to extract project details from conversation
      if (assistantMessage.toLowerCase().includes('create') && 
          (assistantMessage.toLowerCase().includes('project') || assistantMessage.toLowerCase().includes('business'))) {
        // Attempt to extract project info
        const projectInfo = extractProjectInfo(assistantMessage, userMessage);
        if (projectInfo) {
          setExtractedProject(projectInfo);
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const extractProjectInfo = (aiMessage: string, userMessage: string): any => {
    // Simple extraction - in production, use AI for this
    const words = userMessage.split(' ');
    const name = words.slice(0, 3).join(' ') || 'New Business Project';
    
    return {
      name,
      description: userMessage,
      industry: 'E-commerce', // Default
      target_market: 'General consumers',
    };
  };

  const createProject = async () => {
    if (!extractedProject || !user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('business_projects')
        .insert({
          user_id: user.id,
          name: extractedProject.name,
          description: extractedProject.description,
          industry: extractedProject.industry,
          target_market: extractedProject.target_market,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Project created successfully!');
      onProjectCreated();
      // Navigate with state to trigger CEO onboarding dialog
      navigate(`/projects/${data.id}/overview`, { state: { newProject: true } });
    } catch (error) {
      console.error('Create project error:', error);
      toast.error('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Create Project with CEO
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Extracted Project Preview */}
        {extractedProject && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium">Project Ready to Create</span>
            </div>
            <div className="text-sm space-y-1 mb-3">
              <p><strong>Name:</strong> {extractedProject.name}</p>
              <p><strong>Industry:</strong> {extractedProject.industry}</p>
            </div>
            <Button onClick={createProject} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </Card>
        )}

        {/* Input */}
        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Describe your business idea..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};