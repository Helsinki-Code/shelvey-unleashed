import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Bot, Package, DollarSign, Megaphone, Bell, Loader2, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AutomationSettings {
  auto_fulfill_orders: boolean;
  auto_optimize_prices: boolean;
  auto_restock_alerts: boolean;
  auto_marketing: boolean;
  low_stock_threshold: number;
  price_optimization_margin: number;
}

interface StoreAutomationPanelProps {
  selectedStore?: string | null;
}

export function StoreAutomationPanel({ selectedStore = null }: StoreAutomationPanelProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AutomationSettings>({
    auto_fulfill_orders: false,
    auto_optimize_prices: false,
    auto_restock_alerts: true,
    auto_marketing: false,
    low_stock_threshold: 10,
    price_optimization_margin: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchRecentJobs();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_automation_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setSettings({
          auto_fulfill_orders: data.auto_fulfill_orders,
          auto_optimize_prices: data.auto_optimize_prices,
          auto_restock_alerts: data.auto_restock_alerts,
          auto_marketing: data.auto_marketing,
          low_stock_threshold: data.low_stock_threshold,
          price_optimization_margin: Math.round(data.price_optimization_margin * 100),
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentJobs = async () => {
    try {
      const { data } = await supabase
        .from('store_automation_jobs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('store_automation_settings')
        .upsert({
          user_id: user?.id,
          auto_fulfill_orders: settings.auto_fulfill_orders,
          auto_optimize_prices: settings.auto_optimize_prices,
          auto_restock_alerts: settings.auto_restock_alerts,
          auto_marketing: settings.auto_marketing,
          low_stock_threshold: settings.low_stock_threshold,
          price_optimization_margin: settings.price_optimization_margin / 100,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Automation settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const runAutomation = async () => {
    if (!selectedStore) {
      toast.error('Please select a store first');
      return;
    }

    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('store-automation-agent', {
        body: {
          action: 'run_full_automation',
          userId: user?.id,
          storeType: selectedStore,
        },
      });

      if (error) throw error;
      toast.success('Automation completed! Check your notifications.');
      fetchRecentJobs();
    } catch (error) {
      console.error('Error running automation:', error);
      toast.error('Automation failed');
    } finally {
      setRunning(false);
    }
  };

  const isActive = settings.auto_fulfill_orders || settings.auto_optimize_prices || settings.auto_marketing;

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Store Automation</CardTitle>
                <CardDescription>AI agents manage your store 24/7</CardDescription>
              </div>
            </div>
            <Badge variant={isActive ? 'default' : 'secondary'} className="gap-1">
              {isActive ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {isActive ? 'Active' : 'Paused'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Automation Toggles */}
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <Label className="font-medium">Auto-Fulfill Orders</Label>
                  <p className="text-xs text-muted-foreground">Automatically fulfill POD orders</p>
                </div>
              </div>
              <Switch
                checked={settings.auto_fulfill_orders}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_fulfill_orders: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <Label className="font-medium">Price Optimization</Label>
                  <p className="text-xs text-muted-foreground">AI adjusts prices for max profit</p>
                </div>
              </div>
              <Switch
                checked={settings.auto_optimize_prices}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_optimize_prices: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-yellow-500" />
                <div>
                  <Label className="font-medium">Restock Alerts</Label>
                  <p className="text-xs text-muted-foreground">Get notified for low inventory</p>
                </div>
              </div>
              <Switch
                checked={settings.auto_restock_alerts}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_restock_alerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Megaphone className="h-5 w-5 text-purple-500" />
                <div>
                  <Label className="font-medium">Auto Marketing</Label>
                  <p className="text-xs text-muted-foreground">AI generates marketing content</p>
                </div>
              </div>
              <Switch
                checked={settings.auto_marketing}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_marketing: checked })}
              />
            </div>
          </div>

          {/* Settings Sliders */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Low Stock Threshold</Label>
                <span className="text-sm text-muted-foreground">{settings.low_stock_threshold} units</span>
              </div>
              <Slider
                value={[settings.low_stock_threshold]}
                onValueChange={([value]) => setSettings({ ...settings, low_stock_threshold: value })}
                min={1}
                max={50}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Price Optimization Margin</Label>
                <span className="text-sm text-muted-foreground">{settings.price_optimization_margin}%</span>
              </div>
              <Slider
                value={[settings.price_optimization_margin]}
                onValueChange={([value]) => setSettings({ ...settings, price_optimization_margin: value })}
                min={5}
                max={50}
                step={1}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={saveSettings} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
            <Button 
              onClick={runAutomation} 
              disabled={running || !selectedStore} 
              variant="secondary"
              className="flex-1"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bot className="h-4 w-4 mr-2" />}
              Run Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Automation Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{job.job_type}</Badge>
                    <span className="text-muted-foreground">{job.store_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={job.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {job.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
