import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTranscript?: boolean;
}

interface UseOpenAIRealtimeOptions {
  agentId: string;
  agentName?: string;
  agentPersona?: string;
  onMessage?: (message: Message) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onError?: (error: Error) => void;
}

export const useOpenAIRealtime = ({
  agentId,
  agentName,
  agentPersona,
  onMessage,
  onSpeakingChange,
  onError,
}: UseOpenAIRealtimeOptions) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Audio level monitoring
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    analyserRef.current.fftSize = 256;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const checkLevel = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setInputLevel(average / 255);
      }
      if (isConnected) {
        requestAnimationFrame(checkLevel);
      }
    };
    checkLevel();
  }, [isConnected]);

  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    
    try {
      // Get ephemeral token from our edge function
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('voice-session', {
        body: { agentId },
      });

      if (sessionError || !sessionData?.success) {
        throw new Error(sessionError?.message || sessionData?.error || 'Failed to create voice session');
      }

      const ephemeralKey = sessionData.client_secret?.value;
      if (!ephemeralKey) {
        throw new Error('No ephemeral key received');
      }

      // Create peer connection
      pcRef.current = new RTCPeerConnection();

      // Set up remote audio
      audioRef.current = new Audio();
      audioRef.current.autoplay = true;
      
      pcRef.current.ontrack = (e) => {
        if (audioRef.current) {
          audioRef.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      const audioTrack = mediaStreamRef.current.getTracks()[0];
      pcRef.current.addTrack(audioTrack);

      // Start monitoring input levels
      startAudioLevelMonitoring(mediaStreamRef.current);

      // Set up data channel for events
      dcRef.current = pcRef.current.createDataChannel("oai-events");
      
      dcRef.current.addEventListener("open", () => {
        console.log("Data channel opened");
      });

      dcRef.current.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        handleRealtimeEvent(event);
      });

      // Create and set local description
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`Failed to connect to OpenAI Realtime: ${sdpResponse.status}`);
      }

      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
      
      await pcRef.current.setRemoteDescription(answer);
      
      setIsConnected(true);
      setIsConnecting(false);
      
      toast({
        title: "Connected",
        description: "Voice agent is ready. Start speaking!",
      });

    } catch (error) {
      console.error("Connection error:", error);
      setIsConnecting(false);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to voice agent",
        variant: "destructive",
      });
    }
  }, [agentId, isConnected, isConnecting, onError, startAudioLevelMonitoring, toast]);

  const handleRealtimeEvent = useCallback((event: any) => {
    console.log("Realtime event:", event.type, event);

    switch (event.type) {
      case 'session.created':
        console.log("Session created");
        break;

      case 'input_audio_buffer.speech_started':
        // User started speaking
        break;

      case 'input_audio_buffer.speech_stopped':
        // User stopped speaking
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User speech transcribed
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: event.transcript || '',
          timestamp: new Date(),
          isTranscript: true,
        };
        setMessages(prev => [...prev, userMessage]);
        onMessage?.(userMessage);
        break;

      case 'response.audio.delta':
        // AI is speaking
        setIsSpeaking(true);
        onSpeakingChange?.(true);
        setOutputLevel(0.5 + Math.random() * 0.5);
        break;

      case 'response.audio.done':
        // AI finished speaking
        setIsSpeaking(false);
        onSpeakingChange?.(false);
        setOutputLevel(0);
        break;

      case 'response.audio_transcript.delta':
        // Partial transcript of AI response
        break;

      case 'response.audio_transcript.done':
        // Complete AI response transcript
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: event.transcript || '',
          timestamp: new Date(),
          isTranscript: true,
        };
        setMessages(prev => [...prev, assistantMessage]);
        onMessage?.(assistantMessage);
        break;

      case 'response.function_call_arguments.done':
        // Handle function calls
        console.log("Function call:", event.name, event.arguments);
        handleFunctionCall(event.name, event.arguments, event.call_id);
        break;

      case 'error':
        console.error("Realtime error:", event.error);
        toast({
          title: "Error",
          description: event.error?.message || "An error occurred",
          variant: "destructive",
        });
        break;
    }
  }, [onMessage, onSpeakingChange, toast]);

  const handleFunctionCall = useCallback(async (name: string, args: string, callId: string) => {
    try {
      const parsedArgs = JSON.parse(args);
      let result: any = { success: true };

      switch (name) {
        case 'delegate_task':
          // Delegate to agent work executor
          const { data: taskResult } = await supabase.functions.invoke('agent-work-executor', {
            body: {
              taskDescription: parsedArgs.taskDescription,
              agentId: parsedArgs.targetAgent,
              priority: parsedArgs.priority || 'medium',
            },
          });
          result = taskResult;
          break;

        case 'search_knowledge':
          // Use Perplexity for search
          const { data: searchResult } = await supabase.functions.invoke('mcp-perplexity', {
            body: {
              tool: 'search',
              arguments: { query: parsedArgs.query },
            },
          });
          result = searchResult;
          break;

        case 'get_project_status':
          // Query project status
          const { data: projectData } = await supabase
            .from('business_projects')
            .select('*')
            .eq('id', parsedArgs.projectId)
            .single();
          result = { project: projectData };
          break;
      }

      // Send function result back
      if (dcRef.current?.readyState === 'open') {
        dcRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify(result),
          },
        }));
        dcRef.current.send(JSON.stringify({ type: 'response.create' }));
      }
    } catch (error) {
      console.error("Function call error:", error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    
    setIsConnected(false);
    setIsSpeaking(false);
    setInputLevel(0);
    setOutputLevel(0);
    
    toast({
      title: "Disconnected",
      description: "Voice session ended",
    });
  }, [toast]);

  const sendTextMessage = useCallback((text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') {
      console.warn("Data channel not ready");
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    onMessage?.(userMessage);

    // Send to OpenAI
    dcRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    }));
    dcRef.current.send(JSON.stringify({ type: 'response.create' }));
  }, [onMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    messages,
    inputLevel,
    outputLevel,
    connect,
    disconnect,
    sendTextMessage,
  };
};
