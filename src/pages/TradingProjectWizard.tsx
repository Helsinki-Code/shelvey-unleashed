import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';

const STEPS = [
  { id: 1, title: 'Exchange', description: 'Select your trading platform' },
  { id: 2, title: 'Configuration', description: 'Set capital and risk level' },
  { id: 3, title: 'Review', description: 'Confirm and create' }
];

const TradingProjectWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    exchange: 'alpaca',
    mode: 'paper',
    capital: 10000,
    riskLevel: 'moderate'
  });

  const handleCreate = async () => {
    if (!user) return;
    
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('trading-project-worker', {
        body: {
          action: 'create_project',
          userId: user.id,
          params: {
            name: formData.name,
            exchange: formData.exchange,
            mode: formData.mode,
            capital: formData.capital,
            riskLevel: formData.riskLevel
          }
        }
      });

      if (error) throw error;
      
      toast.success('Trading project created successfully!');
      navigate(`/trading/${data.project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.exchange !== '';
      case 2: return formData.name !== '' && formData.capital > 0;
      case 3: return true;
      default: return false;
    }
  };

  return (
    <>
      <Helmet>
        <title>New Trading Project | ShelVey</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container max-w-2xl mx-auto px-4 py-8 mt-16">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate('/trading')} className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  step > s.id 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : step === s.id 
                      ? 'border-primary text-primary' 
                      : 'border-muted text-muted-foreground'
                }`}>
                  {step > s.id ? <Check className="h-5 w-5" /> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 transition-colors ${
                    step > s.id ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[step - 1].title}</CardTitle>
              <CardDescription>{STEPS[step - 1].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {step === 1 && (
                <div className="space-y-6">
                  <RadioGroup
                    value={formData.exchange}
                    onValueChange={(value) => setFormData({ ...formData, exchange: value })}
                    className="grid grid-cols-1 gap-4"
                  >
                    <Label
                      htmlFor="alpaca"
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.exchange === 'alpaca' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="alpaca" id="alpaca" />
                        <div>
                          <p className="font-medium">Alpaca</p>
                          <p className="text-sm text-muted-foreground">US Stocks & ETFs</p>
                        </div>
                      </div>
                    </Label>
                    
                    <Label
                      htmlFor="binance"
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.exchange === 'binance' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="binance" id="binance" />
                        <div>
                          <p className="font-medium">Binance</p>
                          <p className="text-sm text-muted-foreground">Cryptocurrency</p>
                        </div>
                      </div>
                    </Label>
                    
                    <Label
                      htmlFor="coinbase"
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.exchange === 'coinbase' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="coinbase" id="coinbase" />
                        <div>
                          <p className="font-medium">Coinbase</p>
                          <p className="text-sm text-muted-foreground">Cryptocurrency</p>
                        </div>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      placeholder="My Trading Bot"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capital">Starting Capital ($)</Label>
                    <Input
                      id="capital"
                      type="number"
                      min={100}
                      value={formData.capital}
                      onChange={(e) => setFormData({ ...formData, capital: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Trading Mode</Label>
                    <RadioGroup
                      value={formData.mode}
                      onValueChange={(value) => setFormData({ ...formData, mode: value })}
                      className="grid grid-cols-2 gap-4"
                    >
                      <Label
                        htmlFor="paper"
                        className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.mode === 'paper' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value="paper" id="paper" className="sr-only" />
                        <p className="font-medium">Paper Trading</p>
                        <p className="text-xs text-muted-foreground text-center mt-1">No real money</p>
                      </Label>
                      
                      <Label
                        htmlFor="live"
                        className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.mode === 'live' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value="live" id="live" className="sr-only" />
                        <p className="font-medium">Live Trading</p>
                        <p className="text-xs text-muted-foreground text-center mt-1">Real money, real trades</p>
                      </Label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>Risk Level</Label>
                    <RadioGroup
                      value={formData.riskLevel}
                      onValueChange={(value) => setFormData({ ...formData, riskLevel: value })}
                      className="grid grid-cols-3 gap-4"
                    >
                      <Label
                        htmlFor="conservative"
                        className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.riskLevel === 'conservative' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value="conservative" id="conservative" className="sr-only" />
                        <p className="font-medium text-sm">Conservative</p>
                        <p className="text-xs text-muted-foreground">5% max position</p>
                      </Label>
                      
                      <Label
                        htmlFor="moderate"
                        className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.riskLevel === 'moderate' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value="moderate" id="moderate" className="sr-only" />
                        <p className="font-medium text-sm">Moderate</p>
                        <p className="text-xs text-muted-foreground">10% max position</p>
                      </Label>
                      
                      <Label
                        htmlFor="aggressive"
                        className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.riskLevel === 'aggressive' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value="aggressive" id="aggressive" className="sr-only" />
                        <p className="font-medium text-sm">Aggressive</p>
                        <p className="text-xs text-muted-foreground">20% max position</p>
                      </Label>
                    </RadioGroup>
                  </div>

                  {formData.mode === 'live' && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Live trading uses real money. Ensure you have configured API keys and understand the risks.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Project Name</span>
                      <span className="font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Exchange</span>
                      <span className="font-medium capitalize">{formData.exchange}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Mode</span>
                      <span className={`font-medium ${formData.mode === 'live' ? 'text-amber-500' : ''}`}>
                        {formData.mode === 'live' ? 'Live Trading' : 'Paper Trading'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Starting Capital</span>
                      <span className="font-medium">${formData.capital.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Risk Level</span>
                      <span className="font-medium capitalize">{formData.riskLevel}</span>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription>
                      A 6-phase trading workflow will be created: Research → Strategy → Setup → Execution → Monitor → Optimize.
                      Each phase requires CEO and user approval before proceeding.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                
                {step < 3 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Project'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
};

export default TradingProjectWizard;
