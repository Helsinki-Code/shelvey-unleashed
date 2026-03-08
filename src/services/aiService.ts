// AI Service Layer — SEO Agent War Room

import { supabase } from '@/integrations/supabase/client';
import type { InterventionCommand } from '@/types/agent';

// --- Builder Chat Service ---
export const sendChatMessage = async (
  prompt: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  const messages = [
    ...history.map(h => ({
      role: h.role === 'model' ? 'assistant' : h.role,
      content: h.parts.map(p => p.text).join('\n'),
    })),
    { role: 'user', content: prompt },
  ];
  const { data, error } = await supabase.functions.invoke('ai-chat', { body: { messages, mode: 'chat' } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data?.content || 'No response.';
};

export const sendBuilderRequest = async (
  prompt: string,
  history: { role: string; parts: { text: string }[] }[],
  currentCode: string = ''
): Promise<{ message: string; code: string; seo: { title: string; description: string; keywords: string[] } }> => {
  const messages = [
    ...history.map(h => ({
      role: h.role === 'model' ? 'assistant' : h.role,
      content: h.parts.map(p => p.text).join('\n'),
    })),
    { role: 'user', content: currentCode ? `CONTEXT: Previous code length: ${currentCode.length} chars.\n\nREQUEST: ${prompt}` : prompt },
  ];
  const { data, error } = await supabase.functions.invoke('ai-chat', { body: { messages, mode: 'builder' } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return {
    message: data?.message || 'Component generated.',
    code: data?.code || generateFallbackComponent(prompt),
    seo: data?.seo || { title: `${prompt.slice(0, 50)} | ShelVey`, description: `Generated: ${prompt.slice(0, 100)}`, keywords: ['shelvey'] },
  };
};

// --- War Room Service ---
export async function invokeWarRoom(action: string, payload: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('seo-war-room', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export const startWarRoomMission = (url: string, goals: string) =>
  invokeWarRoom('start_mission', { url, goals });

export const getWarRoomState = (sessionId: string) =>
  invokeWarRoom('get_state', { sessionId });

export const advanceWarRoom = (sessionId: string) =>
  invokeWarRoom('advance', { sessionId });

export const approveWarRoom = (sessionId: string, approvalId: string, optionId: string, userInput?: string) =>
  invokeWarRoom('approve', { sessionId, approvalId, optionId, userInput });

export const interveneWarRoom = (sessionId: string, command: InterventionCommand) =>
  invokeWarRoom('intervene', { sessionId, command });

export const getWarRoomReport = (sessionId: string) =>
  invokeWarRoom('get_report', { sessionId });

export const exportWarRoom = (sessionId: string, format: string) =>
  invokeWarRoom('export', { sessionId, format });

// --- Legacy compat ---
export const applyLinkSuggestions = async (content: string, suggestions: any[]): Promise<string> => {
  let newContent = content;
  const sorted = [...suggestions].sort((a, b) => b.anchorText.length - a.anchorText.length);
  for (const s of sorted) {
    if (!s.anchorText || !s.targetUrl) continue;
    const escaped = s.anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!\\[)${escaped}(?!\\])`, 'i');
    newContent = newContent.replace(regex, `[${s.anchorText}](${s.targetUrl})`);
  }
  return newContent;
};

export const generateImage = async (prompt: string): Promise<string> => {
  return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/800/600`;
};

const generateFallbackComponent = (prompt: string): string => `() => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">${prompt.slice(0, 40)}...</h1>
        <p className="text-gray-600 mb-6">This is a fallback component. Please try again.</p>
      </div>
    </div>
  );
}`;

export default {
  sendChatMessage,
  sendBuilderRequest,
  invokeWarRoom,
  startWarRoomMission,
  getWarRoomState,
  advanceWarRoom,
  approveWarRoom,
  interveneWarRoom,
  getWarRoomReport,
  exportWarRoom,
  applyLinkSuggestions,
  generateImage,
};
