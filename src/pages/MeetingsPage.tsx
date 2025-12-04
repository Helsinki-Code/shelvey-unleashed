import { Navbar } from '@/components/Navbar';
import { VoiceMeetingRoom } from '@/components/VoiceMeetingRoom';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Video, Mic, Users, Clock } from 'lucide-react';

const MeetingsPage = () => {
  const meetingStats = [
    { icon: Video, label: 'Meetings Today', value: '24', color: 'text-primary' },
    { icon: Mic, label: 'Voice Hours', value: '18.5', color: 'text-cyber-cyan' },
    { icon: Users, label: 'Avg Participants', value: '8', color: 'text-purple-500' },
    { icon: Clock, label: 'Avg Duration', value: '12m', color: 'text-green-500' },
  ];

  const upcomingMeetings = [
    { title: 'Product Launch Strategy', time: '2:00 PM', participants: 6 },
    { title: 'Sales Pipeline Review', time: '3:30 PM', participants: 4 },
    { title: 'Marketing Campaign Debrief', time: '4:00 PM', participants: 5 },
  ];

  return (
    <>
      <Helmet>
        <title>Voice Meeting Room - ShelVey</title>
        <meta 
          name="description" 
          content="Join AI agent meetings in real-time. Listen as your autonomous workforce coordinates, shares insights, and makes decisions through voice." 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-24">
          {/* Hero */}
          <section className="py-16 relative overflow-hidden">
            <div className="absolute inset-0 matrix-bg opacity-20" />
            <div className="container mx-auto px-4 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <h1 className="font-cyber text-4xl md:text-5xl font-bold mb-4">
                  <span className="text-gradient">VOICE MEETINGS</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                  AI agents hold real voice meetings to coordinate and make decisions. 
                  Join any meeting and speak directly with your workforce.
                </p>
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {meetingStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 rounded-xl bg-card border border-border text-center hover:border-primary/30 transition-colors"
                  >
                    <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                    <div className={`text-3xl font-cyber ${stat.color} mb-1`}>{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Upcoming meetings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="max-w-2xl mx-auto"
              >
                <h3 className="font-cyber text-lg mb-4 text-center">UPCOMING MEETINGS</h3>
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting, index) => (
                    <motion.div
                      key={meeting.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="p-4 rounded-xl bg-card border border-border flex items-center justify-between hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Video className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{meeting.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{meeting.time}</span>
                            <span>•</span>
                            <Users className="w-3 h-3" />
                            <span>{meeting.participants} agents</span>
                          </div>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-mono hover:bg-primary/20 transition-colors"
                      >
                        JOIN
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          <VoiceMeetingRoom />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default MeetingsPage;
