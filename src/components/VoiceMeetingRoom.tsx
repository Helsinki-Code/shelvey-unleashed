import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { agents } from '@/lib/agents-data';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';

const meetingParticipants = agents.slice(0, 8);

interface Transcript {
  id: string;
  speaker: string;
  message: string;
  timestamp: Date;
}

const initialTranscripts: Transcript[] = [
  { id: '1', speaker: 'Director Agent', message: 'Good morning team. Let\'s review our progress on the AI Content Studio business.', timestamp: new Date(Date.now() - 180000) },
  { id: '2', speaker: 'Research Agent', message: 'Market analysis shows 34% growth potential in the content automation space.', timestamp: new Date(Date.now() - 150000) },
  { id: '3', speaker: 'Code Builder Agent', message: 'Core API is deployed. 98.7% test coverage achieved.', timestamp: new Date(Date.now() - 120000) },
  { id: '4', speaker: 'Sales Agent', message: 'We have 12 enterprise leads in the pipeline. 3 demos scheduled this week.', timestamp: new Date(Date.now() - 90000) },
  { id: '5', speaker: 'Marketing Agent', message: 'Social media engagement up 45%. Launching influencer campaign tomorrow.', timestamp: new Date(Date.now() - 60000) },
];

export const VoiceMeetingRoom = () => {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>('Marketing Agent');
  const [transcripts, setTranscripts] = useState<Transcript[]>(initialTranscripts);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-cyber text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">VOICE MEETING ROOM</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            AI agents hold real voice meetings to coordinate, share insights, and make decisions. 
            Join the conversation and speak directly with your AI workforce.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main meeting view */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-cyber">
              {/* Meeting header */}
              <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-cyber text-sm">DAILY STANDUP</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{meetingParticipants.length} participants</span>
                      <span>•</span>
                      <span>00:12:45</span>
                    </div>
                  </div>
                </div>
                <motion.div
                  className="px-3 py-1 rounded-full bg-red-500/20 text-red-500 text-xs font-mono"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ● LIVE
                </motion.div>
              </div>

              {/* Participants grid */}
              <div className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {meetingParticipants.map((agent, index) => {
                    const isSpeaking = agent.name === activeSpeaker;
                    return (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className={`relative p-4 rounded-xl border transition-all duration-300 
                          ${isSpeaking 
                            ? 'bg-primary/10 border-primary shadow-cyber' 
                            : 'bg-background/50 border-border'}`}
                      >
                        {/* Speaking indicator */}
                        {isSpeaking && (
                          <motion.div
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                          />
                        )}

                        <div className="flex flex-col items-center text-center">
                          {/* Avatar with audio visualizer */}
                          <div className="relative w-14 h-14 rounded-full bg-card border-2 border-border flex items-center justify-center text-2xl mb-2">
                            {agent.icon}
                            {isSpeaking && (
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    className="w-1 bg-primary rounded-full"
                                    animate={{ height: [4, 12 + Math.random() * 8, 4] }}
                                    transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.05 }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-mono text-foreground truncate w-full">
                            {agent.name.replace(' Agent', '')}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{agent.role}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Join controls */}
                <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-background/50 border border-border">
                  {isJoined ? (
                    <>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setIsMuted(!isMuted)}
                        className={`rounded-full w-14 h-14 p-0 ${isMuted ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/10 border-primary/30'}`}
                      >
                        {isMuted ? <MicOff className="w-6 h-6 text-destructive" /> : <Mic className="w-6 h-6 text-primary" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-full w-14 h-14 p-0 bg-primary/10 border-primary/30"
                      >
                        <Volume2 className="w-6 h-6 text-primary" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={() => setIsJoined(false)}
                        className="rounded-full w-14 h-14 p-0"
                      >
                        <PhoneOff className="w-6 h-6" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="lg"
                      onClick={() => setIsJoined(true)}
                      className="gap-2 font-cyber"
                    >
                      <Phone className="w-5 h-5" />
                      JOIN MEETING
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Transcript panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-cyber h-full">
              <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-cyber text-sm">LIVE TRANSCRIPT</h3>
              </div>

              <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {transcripts.map((transcript, index) => (
                    <motion.div
                      key={transcript.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          {transcript.speaker.replace(' Agent', '')}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatTime(transcript.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground pl-2 border-l-2 border-primary/30">
                        {transcript.message}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Meeting metrics */}
              <div className="p-4 border-t border-border bg-background/50">
                <h4 className="text-xs font-mono text-muted-foreground mb-3">MEETING METRICS</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-card/50">
                    <div className="text-lg font-cyber text-primary">12:45</div>
                    <div className="text-[10px] text-muted-foreground">Duration</div>
                  </div>
                  <div className="p-2 rounded-lg bg-card/50">
                    <div className="text-lg font-cyber text-foreground">8</div>
                    <div className="text-[10px] text-muted-foreground">Speakers</div>
                  </div>
                  <div className="p-2 rounded-lg bg-card/50">
                    <div className="text-lg font-cyber text-green-500">5</div>
                    <div className="text-[10px] text-muted-foreground">Action Items</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
