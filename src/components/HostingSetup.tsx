import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Server, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  RefreshCw,
  AlertCircle,
  Shield,
  Settings,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface HostingSetupProps {
  website: {
    id: string;
    name: string;
    deployed_url?: string | null;
    hosting_type?: string | null;
    custom_domain?: string | null;
    dns_records?: any;
    ssl_status?: string | null;
    status: string;
  };
  onUpdate: () => void;
}

export const HostingSetup = ({ website, onUpdate }: HostingSetupProps) => {
  const [customDomain, setCustomDomain] = useState(website.custom_domain || '');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDnsSetup, setShowDnsSetup] = useState(false);

  const handleSetupCustomDomain = async () => {
    if (!customDomain.trim()) {
      toast.error('Please enter your custom domain');
      return;
    }

    setIsSettingUp(true);
    try {
      const response = await supabase.functions.invoke('setup-hosting', {
        body: {
          websiteId: website.id,
          hostingType: 'custom',
          customDomain: customDomain.trim(),
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      setShowDnsSetup(true);
      toast.success('Custom domain configured! Please set up DNS records.');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to set up custom domain');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleVerifyDns = async () => {
    setIsVerifying(true);
    try {
      const response = await supabase.functions.invoke('verify-dns', {
        body: { websiteId: website.id },
      });

      if (response.error) throw response.error;

      const data = response.data;

      if (data.verified) {
        toast.success(`🎉 DNS verified! Your site is live at ${data.liveUrl}`);
        onUpdate();
      } else {
        toast.info(data.message || 'DNS not yet verified. Please wait for propagation.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify DNS');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // DNS records for custom domain
  const dnsRecords = website.dns_records || {};
  const hasDnsRecords = Object.keys(dnsRecords).length > 0;
  const isPendingDns = website.status === 'pending-dns';
  const hasCustomDomain = website.hosting_type === 'custom' && website.custom_domain;

  // Show DNS verification UI for pending custom domains
  if (isPendingDns && hasCustomDomain) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-amber-500" />
            <CardTitle>DNS Configuration Required</CardTitle>
          </div>
          <CardDescription>
            Configure the following DNS records at your domain registrar for <strong>{website.custom_domain}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* DNS Records */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Required DNS Records:</h4>
            
            {/* A Record for root */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 bg-background/80 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">A</Badge>
                  <span className="font-mono text-sm font-medium">@</span>
                  <span className="text-xs text-muted-foreground">(root domain)</span>
                </div>
                <p className="font-mono text-sm text-muted-foreground">185.158.133.1</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard('185.158.133.1')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* A Record for www */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-3 bg-background/80 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">A</Badge>
                  <span className="font-mono text-sm font-medium">www</span>
                </div>
                <p className="font-mono text-sm text-muted-foreground">185.158.133.1</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard('185.158.133.1')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* TXT Record for verification */}
            {dnsRecords.txt_record && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between p-3 bg-background/80 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">TXT</Badge>
                    <span className="font-mono text-sm font-medium">_shelvey-verify</span>
                  </div>
                  <p className="font-mono text-sm text-muted-foreground break-all">{dnsRecords.txt_record.value}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(dnsRecords.txt_record.value)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* Instructions */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Setup Instructions
            </h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
              <li>Navigate to DNS settings for <strong>{website.custom_domain}</strong></li>
              <li>Add the A records and TXT record shown above</li>
              <li>Wait for DNS propagation (can take up to 48 hours)</li>
              <li>Click "Verify DNS" once records are configured</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleVerifyDns} disabled={isVerifying} className="gap-2">
              {isVerifying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Verify DNS
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              DNS changes can take up to 48 hours to propagate
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show custom domain setup form
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-500" />
          <CardTitle>Custom Domain</CardTitle>
        </div>
        <CardDescription>
          Connect your own domain for a professional presence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCustomDomain && website.status === 'deployed' ? (
          // Custom domain is active
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-lg bg-green-500/10 border border-green-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">Custom Domain Active</p>
                  <a 
                    href={`https://${website.custom_domain}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                  >
                    https://{website.custom_domain}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-300">
                  <Shield className="w-3 h-3 mr-1" />
                  SSL Active
                </Badge>
              </div>
            </div>
          </motion.div>
        ) : (
          // Setup form
          <>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Professional</Badge>
                  <Badge variant="outline">SSL Included</Badge>
                  <Badge variant="outline">DNS Required</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDomain">Your Domain</Label>
              <div className="flex gap-2">
                <Input
                  id="customDomain"
                  placeholder="example.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, ''))}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSetupCustomDomain} 
                  disabled={isSettingUp || !customDomain.trim()}
                  className="gap-2"
                >
                  {isSettingUp ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {isSettingUp ? 'Setting up...' : 'Configure'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your domain without http:// or www (e.g., mybusiness.com)
              </p>
            </div>

            {!website.deployed_url && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Deploy to a ShelVey subdomain first, then you can add a custom domain.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
