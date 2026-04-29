import React, { useEffect, useMemo, useState } from 'react';
import { Globe2, Mail, MapPin, Save, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/api';

const regions = [
  'North America',
  'South America',
  'Europe',
  'Asia',
  'Africa',
  'Australia',
  'Antarctica',
];

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    region: '',
    language: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        region: user.region || '',
        language: user.language || 'en',
      });
    }
  }, [user]);

  const profileHighlights = useMemo(() => {
    return [
      { icon: Mail, label: 'Email', value: user?.email || 'Not available' },
      { icon: MapPin, label: 'Region', value: user?.region || 'Choose a region' },
      {
        icon: Globe2,
        label: 'Language',
        value: languages.find((item) => item.code === user?.language)?.name || 'English',
      },
    ];
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    await updateProfile(form);

    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#ecfeff_100%)] p-6 shadow-xl shadow-orange-100/40">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Profile
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your account details</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Keep your identity, region, and language preferences up to date so your
              dashboard and payment workflows stay personalized.
            </p>
          </div>

          <div className="rounded-[28px] bg-slate-950 px-5 py-4 text-white shadow-xl shadow-slate-900/20">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Member since</p>
            <p className="mt-2 text-lg font-semibold">
              {user?.createdAt ? formatDate(user.createdAt) : 'Just joined'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl">Account snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-[24px] bg-orange-50/80 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-foreground text-xl font-semibold text-background">
                {user?.firstName?.charAt(0)}
                {user?.lastName?.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{user?.role || 'user'}</p>
              </div>
            </div>

            {profileHighlights.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[22px] border border-border/70 bg-background/70 p-4"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-orange-100 text-orange-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="font-medium text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl">Edit profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select
                    value={form.region}
                    onValueChange={(value) => setForm((current) => ({ ...current, region: value }))}
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Choose your region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={form.language}
                    onValueChange={(value) => setForm((current) => ({ ...current, language: value }))}
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Choose your language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                          {language.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <UserRound className="mt-0.5 h-4 w-4 text-orange-600" />
                  <p>
                    Your email address and role are managed by secure account policies. Use the
                    settings page if you want to update security preferences like two-factor
                    authentication.
                  </p>
                </div>
              </div>

              <Button type="submit" className="rounded-2xl" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving changes...' : 'Save profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
