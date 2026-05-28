'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/features/auth/auth.store';
import { api } from '@/lib/api-client';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setTelegramChatId(user.telegramChatId ?? '');
    }
  }, [user]);

  const update = useMutation({
    mutationFn: () =>
      api.patch('/users/me', { name, telegramChatId }).then((r) => r.data),
    onSuccess: (data) => {
      setUser(data);
      toast.success('Profile updated');
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and notifications.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Public details visible across PricePulse.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={user?.email ?? ''} disabled />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-sm font-medium">Telegram chat ID</label>
            <Input
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="e.g. 123456789"
            />
            <p className="text-xs text-muted-foreground">
              Send <code className="text-foreground">/start</code> to{' '}
              <span className="text-foreground">@PricePulseBot</span> to get yours.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="gradient" onClick={() => update.mutate()} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
