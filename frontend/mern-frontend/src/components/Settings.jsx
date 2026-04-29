import React, { useState } from 'react';
import { KeyRound, ShieldCheck, ShieldEllipsis, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const Settings = () => {
  const { user, toggleTwoFactor, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingTwoFactor, setIsUpdatingTwoFactor] = useState(false);
  const [formError, setFormError] = useState('');

  const handleTwoFactorChange = async (enabled) => {
    setIsUpdatingTwoFactor(true);
    await toggleTwoFactor(enabled);
    setIsUpdatingTwoFactor(false);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation must match.');
      return;
    }

    setIsChangingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      return;
    }

    setFormError(result.error);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] bg-[linear-gradient(135deg,#ecfeff_0%,#ffffff_48%,#fff7ed_100%)] p-6 shadow-xl shadow-orange-100/40">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Settings
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Security and preferences</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Turn on stronger login protection, keep your credentials fresh, and make sure
          your account is ready for high-trust payment work.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl">Security posture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] bg-slate-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Account status</p>
              <p className="mt-3 text-lg font-semibold">{user?.email}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">
                  {user?.isEmailVerified ? 'Email verified' : 'Verification pending'}
                </Badge>
                <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">
                  {user?.preferences?.twoFactorAuth ? '2FA enabled' : '2FA optional'}
                </Badge>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-orange-100 text-orange-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Two-factor authentication</p>
                  <p className="text-sm text-muted-foreground">
                    When enabled, every new sign-in requires a one-time verification code.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-[20px] bg-white/80 px-4 py-3">
                <div>
                  <p className="font-medium">
                    {user?.preferences?.twoFactorAuth ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="text-sm text-muted-foreground">Recommended for admin and finance roles</p>
                </div>
                <Switch
                  checked={Boolean(user?.preferences?.twoFactorAuth)}
                  disabled={isUpdatingTwoFactor}
                  onCheckedChange={handleTwoFactorChange}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-emerald-100 text-emerald-600">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Session protection</p>
                  <p className="text-sm text-muted-foreground">
                    Your app now refreshes sessions through secure cookies, so returning users
                    stay signed in more reliably without exposing refresh tokens to the UI.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl">Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handlePasswordSubmit}>
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-orange-100 text-orange-600">
                    <ShieldEllipsis className="h-4 w-4" />
                  </div>
                  <p>
                    Use at least 8 characters with uppercase, lowercase, a number, and a special
                    character to satisfy the backend password policy.
                  </p>
                </div>
              </div>

              <Button type="submit" className="rounded-2xl" disabled={isChangingPassword}>
                <KeyRound className="mr-2 h-4 w-4" />
                {isChangingPassword ? 'Updating password...' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
