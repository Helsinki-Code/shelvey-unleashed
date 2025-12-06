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
  ArrowRight,
  Rocket
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
  const [isDeploying, setIsDeploying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);

  const handleDeployWithCustomDomain = async () => {
    if (!customDomain.trim()) {
      toast.error('Please enter your custom domain');
      return;
    }

    setIsDeploying(true);
    setDeploymentResult(null);
    
    try {
      const response = await supabase.functions.invoke('deploy-to-vercel', {
        body: {
          websiteId: website.id,
          customDomain: customDomain.trim(),
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      setDeploymentResult(data);
      
      if (data.success) {
        toast.success(data.message || 'Deployed! Configure DNS to complete setup.');
        onUpdate();
      } else {
        toast.error(data.error || 'Deployment failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to deploy');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleVerifyDomain = async () => {
    setIsVerifying(true);
    try {
      const response = await supabase.functions.invoke('verify-vercel-domain', {
        body: { 
          websiteId: website.id,
          domain: customDomain || website.custom_domain,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;

      if (data.verified && data.configured) {
        toast.success(`🎉 Domain verified! Your site is live at ${data.liveUrl}`);
        setDeploymentResult(null);
        onUpdate();
      } else {
        toast.info(data.message || 'DNS not yet propagated. Please wait and try again.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify domain');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const isPendingDns = website.status === 'pending-dns' || (deploymentResult?.dnsConfig && !deploymentResult?.verified);
  const hasCustomDomain = website.hosting_type === 'vercel' && website.custom_domain;
  const isDeployed = website.status === 'deployed' && website.deployed_url;

  // Show DNS configuration UI after deployment with custom domain
  if (deploymentResult?.dnsConfig || (isPendingDns && hasCustomDomain)) {
    const dnsConfig = deploymentResult?.dnsConfig || {
      aRecord: { type: 'A', name: '@', value: '76.76.21.21' },
      cnameRecord: { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' },
    };
    const domain = deploymentResult?.customDomain || website.custom_domain;

    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-amber-500" />
            <CardTitle>DNS Configuration Required</CardTitle>
          </div>
          <CardDescription>
            Configure the following DNS records at your domain registrar for <strong>{domain}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success message */}
          {deploymentResult?.productionUrl && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Deployed to Vercel! Temporary URL: 
                  <a href={deploymentResult.productionUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
                    {deploymentResult.productionUrl}
                  </a>
                </span>
              </div>
            </motion.div>
          )}

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
                <p className="font-mono text-sm text-muted-foreground">{dnsConfig.aRecord.value}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(dnsConfig.aRecord.value)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* CNAME Record for www */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-3 bg-background/80 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">CNAME</Badge>
                  <span className="font-mono text-sm font-medium">www</span>
                </div>
                <p className="font-mono text-sm text-muted-foreground">{dnsConfig.cnameRecord.value}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(dnsConfig.cnameRecord.value)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Setup Instructions
            </h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
              <li>Navigate to DNS settings for <strong>{domain}</strong></li>
              <li>Add the A record pointing @ to <strong>{dnsConfig.aRecord.value}</strong></li>
              <li>Add the CNAME record pointing www to <strong>{dnsConfig.cnameRecord.value}</strong></li>
              <li>Wait for DNS propagation (usually 5-30 minutes, up to 48 hours)</li>
              <li>Click "Verify Domain" once records are configured</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleVerifyDomain} disabled={isVerifying} className="gap-2">
              {isVerifying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Verify Domain
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Vercel automatically provisions SSL once DNS is verified
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show active custom domain status
  if (hasCustomDomain && isDeployed) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <CardTitle>Custom Domain</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
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
          Connect your own domain with automatic SSL via Vercel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">Professional URL</Badge>
              <Badge variant="outline">Auto SSL</Badge>
              <Badge variant="outline">Global CDN</Badge>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                <Rocket className="w-3 h-3 mr-1" />
                Powered by Vercel
              </Badge>
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
              onClick={handleDeployWithCustomDomain} 
              disabled={isDeploying || !customDomain.trim()}
              className="gap-2"
            >
              {isDeploying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {isDeploying ? 'Deploying...' : 'Deploy'}
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
                Generate a website first before connecting a custom domain.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
