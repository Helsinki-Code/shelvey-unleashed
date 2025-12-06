import { useState } from 'react';
import { User, Mail, Camera, Lock, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const UserProfileSheet = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setIsPasswordReset(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'Password reset email sent',
        description: 'Check your email for a link to reset your password.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send password reset email',
        variant: 'destructive',
      });
    } finally {
      setIsPasswordReset(false);
    }
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-left">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>
            Update your profile information and manage your account.
          </SheetDescription>
        </SheetHeader>
        
        <div className="grid gap-6 py-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" disabled>
              <Camera className="w-4 h-4 mr-2" />
              Change Photo
            </Button>
          </div>

          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10"
                placeholder="Enter your name"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                value={user?.email || ''}
                className="pl-10 bg-muted"
                disabled
              />
            </div>
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label>Password</Label>
            <Button 
              variant="outline" 
              onClick={handlePasswordReset}
              disabled={isPasswordReset}
            >
              {isPasswordReset ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              {isPasswordReset ? 'Sending...' : 'Reset Password'}
            </Button>
            <p className="text-xs text-muted-foreground">
              We'll send a password reset link to your email
            </p>
          </div>
        </div>

        <SheetFooter>
          <Button onClick={handleSaveProfile} disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
