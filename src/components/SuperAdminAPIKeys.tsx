import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Save, Check, Key, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSuperAdmin, AdminAPIKey } from '@/hooks/useSuperAdmin';

const API_KEY_DEFINITIONS = [
  { key_name: 'OPENAI_API_KEY', display_name: 'OpenAI API Key', category: 'ai' },
  { key_name: 'ANTHROPIC_API_KEY', display_name: 'Anthropic API Key', category: 'ai' },
  { key_name: 'GITHUB_TOKEN', display_name: 'GitHub Token', category: 'development' },
  { key_name: 'STRIPE_API_KEY', display_name: 'Stripe API Key', category: 'finance' },
  { key_name: 'GOOGLE_MAPS_API_KEY', display_name: 'Google Maps API Key', category: 'location' },
  { key_name: 'LINEAR_API_KEY', display_name: 'Linear API Key', category: 'productivity' },
  { key_name: 'PERPLEXITY_API_KEY', display_name: 'Perplexity API Key', category: 'ai' },
  { key_name: 'CANVA_API_KEY', display_name: 'Canva API Key', category: 'design' },
  { key_name: 'TWITTER_API_KEY', display_name: 'Twitter/X API Key', category: 'social' },
  { key_name: 'TWITTER_API_SECRET', display_name: 'Twitter/X API Secret', category: 'social' },
  { key_name: 'YOUTUBE_API_KEY', display_name: 'YouTube API Key', category: 'social' },
  { key_name: 'LINKEDIN_ACCESS_TOKEN', display_name: 'LinkedIn Access Token', category: 'social' },
  { key_name: 'FAL_KEY', display_name: 'Fal AI Key', category: 'ai' },
  { key_name: 'ELEVENLABS_API_KEY', display_name: 'ElevenLabs API Key', category: 'voice' },
  { key_name: 'FACEBOOK_ACCESS_TOKEN', display_name: 'Facebook Access Token', category: 'social' },
];

const categoryColors: Record<string, string> = {
  ai: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  development: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  finance: 'bg-green-500/10 text-green-500 border-green-500/20',
  location: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  productivity: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  design: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  social: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  voice: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
};

export const SuperAdminAPIKeys = () => {
  const { adminAPIKeys, saveAdminAPIKey, deleteAdminAPIKey } = useSuperAdmin();
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});

  const handleSave = async (keyName: string, displayName: string, category: string) => {
    const value = inputValues[keyName];
    if (!value) {
      toast.error('Please enter a value');
      return;
    }

    setSavingKeys((prev) => ({ ...prev, [keyName]: true }));

    const { error } = await saveAdminAPIKey(keyName, displayName, value, category);

    if (error) {
      toast.error('Failed to save API key');
    } else {
      toast.success('API key saved successfully');
      setInputValues((prev) => ({ ...prev, [keyName]: '' }));
    }

    setSavingKeys((prev) => ({ ...prev, [keyName]: false }));
  };

  const handleDelete = async (keyName: string) => {
    const { error } = await deleteAdminAPIKey(keyName);

    if (error) {
      toast.error('Failed to delete API key');
    } else {
      toast.success('API key deleted');
    }
  };

  const isConfigured = (keyName: string) => {
    return adminAPIKeys.some((k) => k.key_name === keyName && k.is_configured);
  };

  const configuredCount = API_KEY_DEFINITIONS.filter((def) =>
    isConfigured(def.key_name)
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Admin API Keys (For DFY Plan Users)
        </CardTitle>
        <CardDescription>
          These API keys will be used by DFY plan subscribers. They won't need to enter
          their own keys.
        </CardDescription>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline">
            {configuredCount}/{API_KEY_DEFINITIONS.length} Configured
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {API_KEY_DEFINITIONS.map((def, index) => {
            const configured = isConfigured(def.key_name);

            return (
              <motion.div
                key={def.key_name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border ${
                  configured ? 'border-green-500/30 bg-green-500/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{def.display_name}</span>
                    <Badge
                      variant="outline"
                      className={categoryColors[def.category] || ''}
                    >
                      {def.category}
                    </Badge>
                    {configured && (
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        <Check className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    )}
                  </div>
                  {configured && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(def.key_name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={visibleKeys[def.key_name] ? 'text' : 'password'}
                      placeholder={configured ? '••••••••••••••••' : 'Enter API key...'}
                      value={inputValues[def.key_name] || ''}
                      onChange={(e) =>
                        setInputValues((prev) => ({
                          ...prev,
                          [def.key_name]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() =>
                        setVisibleKeys((prev) => ({
                          ...prev,
                          [def.key_name]: !prev[def.key_name],
                        }))
                      }
                    >
                      {visibleKeys[def.key_name] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleSave(def.key_name, def.display_name, def.category)}
                    disabled={!inputValues[def.key_name] || savingKeys[def.key_name]}
                  >
                    {savingKeys[def.key_name] ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
