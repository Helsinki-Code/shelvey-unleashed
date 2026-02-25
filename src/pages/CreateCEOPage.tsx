import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  User, Sparkles, Mic, Globe, ArrowRight, ArrowLeft, 
  Check, Wand2, Crown, Heart, Target, Eye, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import shelveyLogo from '@/assets/shelvey-logo.png';

const CEO_AVATARS = [
  { id: 'avatar-1', url: 'https://api.dicebear.com/7.x/personas/svg?seed=maya&backgroundColor=c0aede', name: 'Maya Style' },
  { id: 'avatar-2', url: 'https://api.dicebear.com/7.x/personas/svg?seed=alex&backgroundColor=b6e3f4', name: 'Alex Style' },
  { id: 'avatar-3', url: 'https://api.dicebear.com/7.x/personas/svg?seed=jordan&backgroundColor=ffd5dc', name: 'Jordan Style' },
  { id: 'avatar-4', url: 'https://api.dicebear.com/7.x/personas/svg?seed=taylor&backgroundColor=d1d4f9', name: 'Taylor Style' },
  { id: 'avatar-5', url: 'https://api.dicebear.com/7.x/personas/svg?seed=sam&backgroundColor=c1f4d1', name: 'Sam Style' },
  { id: 'avatar-6', url: 'https://api.dicebear.com/7.x/personas/svg?seed=riley&backgroundColor=ffeeb4', name: 'Riley Style' },
  { id: 'avatar-7', url: 'https://api.dicebear.com/7.x/personas/svg?seed=quinn&backgroundColor=ffb4b4', name: 'Quinn Style' },
  { id: 'avatar-8', url: 'https://api.dicebear.com/7.x/personas/svg?seed=avery&backgroundColor=b4ffed', name: 'Avery Style' },
];

const PERSONAS = [
  { id: 'friendly', name: 'Friendly', icon: Heart, description: 'Warm, approachable, and encouraging', color: 'text-pink-500' },
  { id: 'professional', name: 'Professional', icon: Crown, description: 'Polished, formal, and business-focused', color: 'text-blue-500' },
  { id: 'direct', name: 'Direct', icon: Target, description: 'Straightforward, efficient, no fluff', color: 'text-orange-500' },
  { id: 'nurturing', name: 'Nurturing', icon: Heart, description: 'Supportive, patient, and caring', color: 'text-green-500' },
  { id: 'visionary', name: 'Visionary', icon: Eye, description: 'Inspiring, big-picture thinking', color: 'text-purple-500' },
];

const VOICES = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', gender: 'female', description: 'Warm and expressive' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', description: 'Soft and professional' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', description: 'Friendly and clear' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'female', description: 'Elegant and refined' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'female', description: 'Young and energetic' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', description: 'Deep and authoritative' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'male', description: 'Warm British accent' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', description: 'American professional' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'male', description: 'Deep American voice' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', description: 'British narrator' },
];

const COMMUNICATION_STYLES = [
  { id: 'casual', name: 'Casual', description: 'Relaxed, friendly tone with emojis' },
  { id: 'formal', name: 'Formal', description: 'Professional and polished language' },
  { id: 'inspirational', name: 'Inspirational', description: 'Motivating and uplifting' },
  { id: 'data-driven', name: 'Data-Driven', description: 'Facts and metrics focused' },
];

const LANGUAGES = [
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'es', name: 'Spanish', flag: '🇪🇸' },
  { id: 'fr', name: 'French', flag: '🇫🇷' },
  { id: 'de', name: 'German', flag: '🇩🇪' },
  { id: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { id: 'it', name: 'Italian', flag: '🇮🇹' },
];

const RANDOM_NAMES = [
  'Maya Chen', 'Alex Rivera', 'Jordan Blake', 'Taylor Morgan', 
  'Sam Wilson', 'Riley Cooper', 'Quinn Adams', 'Avery Brooks',
  'Casey Mitchell', 'Drew Parker', 'Jamie Reed', 'Morgan Ellis'
];

const CreateCEOPage = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // CEO configuration state
  const [ceoName, setCeoName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(CEO_AVATARS[0].url);
  const [selectedPersona, setSelectedPersona] = useState('friendly');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [selectedStyle, setSelectedStyle] = useState('casual');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedGender, setSelectedGender] = useState('female');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const generateRandomName = () => {
    const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    setCeoName(randomName);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const { data, error: upsertError } = await supabase.functions.invoke('ceo-profile-gateway', {
        body: {
          action: 'upsert',
          ceo: {
            ceo_name: ceoName,
            ceo_image_url: selectedAvatar,
            persona: selectedPersona,
            voice_id: selectedVoice,
            language: selectedLanguage,
            communication_style: selectedStyle,
            gender: selectedGender,
            personality_traits: {
              humor_level: 'medium',
              emoji_usage: selectedStyle === 'casual',
              enthusiasm: selectedPersona === 'friendly' ? 'high' : 'medium'
            }
          }
        }
      });

      if (upsertError || !data?.success) {
        throw upsertError || new Error(data?.error || 'Failed to save CEO profile');
      }

      // Trigger welcome email generation in background
      supabase.functions.invoke('generate-ceo-welcome', {
        body: { userId: user.id }
      }).catch(err => console.error('Welcome email error:', err));

      toast({
        title: `Welcome! ${ceoName} is ready`,
        description: 'Your AI CEO has been created successfully.',
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating CEO:', error);
      toast({
        title: 'Error creating CEO',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !ceoName.trim()) {
      toast({ title: 'Please enter a name for your CEO', variant: 'destructive' });
      return;
    }
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Create Your AI CEO - ShelVey</title>
      </Helmet>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={shelveyLogo} alt="ShelVey" className="h-10 w-auto" />
            <span className="text-lg font-bold text-foreground">ShelVey</span>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-8 h-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 container mx-auto px-4 max-w-4xl">
        <AnimatePresence mode="wait">
          {/* Step 1: Name */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">Name Your AI CEO</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Give your AI CEO a name. This will be how they introduce themselves and sign all communications.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ceo-name">CEO Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ceo-name"
                      value={ceoName}
                      onChange={(e) => setCeoName(e.target.value)}
                      placeholder="e.g., Maya Chen"
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={generateRandomName}>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Random
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Avatar */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">Choose Appearance</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Select an avatar for {ceoName}. This will be their visual identity.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4 max-w-xl mx-auto">
                {CEO_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar.url)}
                    className={`relative p-2 rounded-xl border-2 transition-all ${
                      selectedAvatar === avatar.url
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className="w-full aspect-square rounded-lg"
                    />
                    {selectedAvatar === avatar.url && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Persona */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">Select Personality</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Choose how {ceoName} will communicate with you.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {PERSONAS.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPersona === persona.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <persona.icon className={`w-8 h-8 mb-3 ${persona.color}`} />
                    <h3 className="font-semibold mb-1">{persona.name}</h3>
                    <p className="text-sm text-muted-foreground">{persona.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4: Voice */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">Choose Voice</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Select a voice for {ceoName}. This will be used for voice messages.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      setSelectedVoice(voice.id);
                      setSelectedGender(voice.gender);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                      selectedVoice === voice.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      voice.gender === 'female' ? 'bg-pink-500/20' : 'bg-blue-500/20'
                    }`}>
                      <Mic className={`w-5 h-5 ${
                        voice.gender === 'female' ? 'text-pink-500' : 'text-blue-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{voice.name}</h3>
                      <p className="text-sm text-muted-foreground">{voice.description}</p>
                    </div>
                    {selectedVoice === voice.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 5: Style & Language */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">Final Touches</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Choose {ceoName}'s communication style and primary language.
                </p>
              </div>

              <div className="max-w-xl mx-auto space-y-8">
                {/* Communication Style */}
                <div className="space-y-4">
                  <Label>Communication Style</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {COMMUNICATION_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedStyle === style.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <h3 className="font-semibold mb-1">{style.name}</h3>
                        <p className="text-xs text-muted-foreground">{style.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="space-y-4">
                  <Label>Primary Language</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setSelectedLanguage(lang.id)}
                        className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                          selectedLanguage === lang.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="font-medium">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Card */}
                <Card className="mt-8">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedAvatar}
                        alt={ceoName}
                        className="w-16 h-16 rounded-full"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{ceoName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Your AI CEO • {PERSONAS.find(p => p.id === selectedPersona)?.name} • {VOICES.find(v => v.id === selectedVoice)?.name}
                        </p>
                      </div>
                      <Badge variant="secondary">Ready</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border p-4">
          <div className="container mx-auto max-w-4xl flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <span className="text-sm text-muted-foreground">
              Step {step} of 5
            </span>

            {step < 5 ? (
              <Button onClick={nextStep} className="gap-2">
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Meet {ceoName}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateCEOPage;
