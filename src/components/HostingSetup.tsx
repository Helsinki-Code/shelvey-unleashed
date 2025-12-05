import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Globe, 
  Server, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  RefreshCw,
  AlertCircle,
  Zap,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HostingSetupProps {
  website: {
    id: string;
    name: string;
    deployed_url?: string;
    hosting_type?: string;
    custom_domain?: string;
    dns_records?: any;
    ssl_status?: string;
    status: string;
  };
  onUpdate: () => void;
}

export const HostingSetup = ({ website, onUpdate }: HostingSetupProps) => {
  const [hostingType, setHostingType] = useState<'subdomain' | 'custom'>(
    (website.hosting_type as 'subdomain' | 'custom') || 'subdomain'
  );
  const [customDomain, setCustomDomain] = useState(website.custom_domain || '');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<any[]>([]);
  const [instructions, setInstructions] = useState('');

  const handleSetupHosting = async () => {
    if (hostingType === 'custom' && !customDomain.trim()) {
      toast.error('Please enter your custom domain');
      return;
    }

    setIsSettingUp(true);
    try {
      const response = await supabase.functions.invoke('setup-hosting', {
        body: {
          websiteId: website.id,
          hostingType,
          customDomain: hostingType === 'custom' ? customDomain.trim() : undefined,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;

      if (data.isLive) {
        toast.success(`🎉 Your website is live at ${data.liveUrl}`);
      } else {
        setDnsRecords(data.dnsRecords || []);
        setInstructions(data.instructions || '');
        toast.success('Hosting configured! Please set up DNS records.');
      }

      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to set up hosting');
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
        toast.info(data.message);
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

  const statusColors: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    'pending-dns': 'bg-amber-500/20 text-amber-400',
    'dns-verified': 'bg-blue-500/20 text-blue-400',
    deployed: 'bg-emerald-500/20 text-emerald-400',
  };

  const sslColors: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    provisioning: 'bg-amber-500/20 text-amber-400',
    active: 'bg-emerald-500/20 text-emerald-400',
  };

  // Already deployed
  if (website.deployed_url && website.status === 'deployed') {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-500" />
            <CardTitle>Website is Live!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="font-medium">{website.deployed_url}</p>
                <p className="text-sm text-muted-foreground">
                  {website.hosting_type === 'custom' ? 'Custom Domain' : 'ShelVey Subdomain'}
                </p>
              </div>
            </div>
            <a 
              href={website.deployed_url} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Site
              </Button>
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Badge className={statusColors[website.status]}>
              Status: {website.status}
            </Badge>
            <Badge className={sslColors[website.ssl_status || 'pending']}>
              <Shield className="h-3 w-3 mr-1" />
              SSL: {website.ssl_status || 'pending'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending DNS verification
  if (website.status === 'pending-dns') {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-amber-500" />
            <CardTitle>DNS Configuration Required</CardTitle>
          </div>
          <CardDescription>
            Configure the following DNS records at your domain registrar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* DNS Records Table */}
          <div className="space-y-3">
            {Object.entries(website.dns_records || {}).map(([key, record]: [string, any]) => {
              if (!record) return null;
              return (
                <div 
                  key={key}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{record.type}</Badge>
                      <span className="font-mono text-sm">{record.name}</span>
                    </div>
                    <p className="font-mono text-sm text-muted-foreground">{record.value}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(record.value)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Instructions */}
          {instructions && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Setup Instructions
              </h4>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                {instructions}
              </pre>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleVerifyDns} disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Verify DNS
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground self-center">
              DNS changes can take up to 48 hours to propagate
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial setup
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>Set Up Website Hosting</CardTitle>
        </div>
        <CardDescription>
          Choose how you want to host your website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup 
          value={hostingType} 
          onValueChange={(v) => setHostingType(v as 'subdomain' | 'custom')}
          className="space-y-4"
        >
          <div className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
            hostingType === 'subdomain' ? 'border-primary bg-primary/5' : 'border-border'
          }`}>
            <RadioGroupItem value="subdomain" id="subdomain" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="subdomain" className="flex items-center gap-2 cursor-pointer">
                <Zap className="h-4 w-4 text-primary" />
                ShelVey Subdomain (Instant)
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Get a free subdomain like <span className="font-mono">yourbusiness.shelvey.pro</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">Free</Badge>
                <Badge variant="outline" className="text-xs">SSL Included</Badge>
                <Badge variant="outline" className="text-xs">Instant Setup</Badge>
              </div>
            </div>
          </div>

          <div className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
            hostingType === 'custom' ? 'border-primary bg-primary/5' : 'border-border'
          }`}>
            <RadioGroupItem value="custom" id="custom" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="custom" className="flex items-center gap-2 cursor-pointer">
                <Globe className="h-4 w-4 text-blue-500" />
                Custom Domain
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Use your own domain like <span className="font-mono">www.yourdomain.com</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">Professional</Badge>
                <Badge variant="outline" className="text-xs">SSL Included</Badge>
                <Badge variant="outline" className="text-xs">DNS Required</Badge>
              </div>
            </div>
          </div>
        </RadioGroup>

        {hostingType === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="domain">Your Domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter your domain without http:// or www
            </p>
          </div>
        )}

        <Button 
          onClick={handleSetupHosting} 
          disabled={isSettingUp}
          className="w-full"
        >
          {isSettingUp ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 mr-2" />
              {hostingType === 'subdomain' ? 'Deploy to ShelVey' : 'Configure Custom Domain'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
