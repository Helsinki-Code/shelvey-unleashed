import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import VoiceAgentInterface from '@/components/VoiceAgentInterface';

const VoicePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <VoiceAgentInterface />
      </main>
      <Footer />
    </div>
  );
};

export default VoicePage;
