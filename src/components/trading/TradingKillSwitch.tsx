import { useState } from 'react';
import { Power, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TradingKillSwitchProps {
  active: boolean;
  onToggle: (activate: boolean) => void;
}

const TradingKillSwitch = ({ active, onToggle }: TradingKillSwitchProps) => {
  const [showDialog, setShowDialog] = useState(false);

  const handleClick = () => {
    setShowDialog(true);
  };

  const handleConfirm = () => {
    onToggle(!active);
    setShowDialog(false);
  };

  return (
    <>
      <Button
        variant={active ? 'default' : 'destructive'}
        className={`gap-2 ${active ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
        onClick={handleClick}
      >
        <Power className={`h-4 w-4 ${active ? '' : 'animate-pulse'}`} />
        {active ? 'Resume Trading' : 'Kill Switch'}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${active ? 'text-emerald-500' : 'text-destructive'}`} />
              {active ? 'Resume Trading?' : 'Activate Kill Switch?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {active 
                ? 'This will resume all trading activities. Make sure you have reviewed any issues before proceeding.'
                : 'This will immediately halt all trading activities, cancel pending orders, and stop all agents. Use this only in emergencies.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={active ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive hover:bg-destructive/90'}
            >
              {active ? 'Resume Trading' : 'Activate Kill Switch'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TradingKillSwitch;
