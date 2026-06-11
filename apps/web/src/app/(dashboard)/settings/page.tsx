'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/features/auth/auth.store';
import { api } from '@/lib/api-client';
import { CheckCircle2, Copy, ExternalLink, Link2, Unlink, Bot, Clock } from 'lucide-react';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState<{
    code: string;
    expiresAt: string;
    expiresIn: number;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  // Poll for Telegram link status
  const { data: telegramStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['telegram-status'],
    queryFn: () => api.get('/users/me/telegram/status').then((r) => r.data),
    refetchInterval: verificationCode ? 3000 : false, // Poll every 3 seconds when code is active
  });

  // Update user when status changes
  useEffect(() => {
    if (telegramStatus?.isLinked && !user?.telegramChatId) {
      // Refetch user data
      api.get('/users/me').then((r) => {
        setUser(r.data);
        toast.success('Telegram account linked successfully!');
        setVerificationCode(null);
      });
    }
  }, [telegramStatus, user, setUser]);

  // Countdown timer
  useEffect(() => {
    if (!verificationCode) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expiresAt = new Date(verificationCode.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setVerificationCode(null);
        toast.error('Verification code expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [verificationCode]);

  const updateProfile = useMutation({
    mutationFn: () => api.patch('/users/me', { name }).then((r) => r.data),
    onSuccess: (data) => {
      setUser(data);
      toast.success('Profile updated');
    },
  });

  const generateCode = useMutation({
    mutationFn: () => api.post('/users/me/telegram/generate-code').then((r) => r.data),
    onSuccess: (data) => {
      setVerificationCode(data);
      setTimeRemaining(data.expiresIn);
      toast.success('Code generated! Enter it in the Telegram bot.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to generate code';
      toast.error(message);
    },
  });

  const unlinkTelegram = useMutation({
    mutationFn: () => api.delete('/users/me/telegram').then((r) => r.data),
    onSuccess: () => {
      setUser({ ...user!, telegramChatId: null });
      toast.success('Telegram account unlinked');
      refetchStatus();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to unlink';
      toast.error(message);
    },
  });

  const copyCode = () => {
    if (verificationCode) {
      navigator.clipboard.writeText(verificationCode.code);
      toast.success('Code copied to clipboard!');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLinked = telegramStatus?.isLinked || user?.telegramChatId;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Settings</h1>
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
          <div className="flex justify-end">
            <Button
              variant="gradient"
              onClick={() => updateProfile.mutate()}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Telegram Bot
              </CardTitle>
              <CardDescription>
                Connect your Telegram account to receive instant price alerts
              </CardDescription>
            </div>
            {isLinked && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Linked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLinked ? (
            <>
              <div className="rounded-lg border border-dashed p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Link2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Link your Telegram account</p>
                    <p className="text-xs text-muted-foreground">
                      Get instant notifications when prices drop on your tracked products
                    </p>
                  </div>
                </div>

                {!verificationCode ? (
                  <div className="space-y-3">
                    <div className="text-sm space-y-2">
                      <p className="font-medium">How to link:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Click &ldquo;Generate Code&rdquo; below</li>
                        <li>Open Telegram and find @newPricePulse_bot</li>
                        <li>Send <code className="text-xs bg-muted px-1 py-0.5 rounded">/start</code> to the bot</li>
                        <li>Click &ldquo;🔗 Link Account&rdquo; button</li>
                        <li>Enter the verification code</li>
                      </ol>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => generateCode.mutate()}
                        disabled={generateCode.isPending}
                        className="gap-2"
                      >
                        {generateCode.isPending ? 'Generating...' : 'Generate Code'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open('https://t.me/newPricePulse_bot', '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Bot
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Verification Code</p>
                        <p className="text-2xl font-mono font-bold tracking-wider">
                          {verificationCode.code}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyCode}
                        className="gap-2"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Expires in <span className="font-mono font-medium text-foreground">{formatTime(timeRemaining)}</span>
                      </span>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                      <p className="text-sm font-medium">Next steps:</p>
                      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Open @newPricePulse_bot in Telegram</li>
                        <li>Click &ldquo;🔗 Link Account&rdquo;</li>
                        <li>Enter the code above</li>
                        <li>Wait for confirmation (this page will auto-update)</li>
                      </ol>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVerificationCode(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateCode.mutate()}
                        disabled={generateCode.isPending}
                      >
                        Generate New Code
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-500/10 p-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Telegram Connected
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      You&apos;ll receive instant notifications on Telegram when your price alerts trigger.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Bot Commands</p>
                  <p className="text-xs text-muted-foreground">
                    Use these commands in @newPricePulse_bot
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://t.me/newPricePulse_bot', '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Bot
                </Button>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <code className="text-xs bg-background px-2 py-1 rounded">/alerts</code>
                  <span className="text-muted-foreground">View and manage your alerts</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <code className="text-xs bg-background px-2 py-1 rounded">/saved</code>
                  <span className="text-muted-foreground">View saved products</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <code className="text-xs bg-background px-2 py-1 rounded">/notifications</code>
                  <span className="text-muted-foreground">View notification history</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => unlinkTelegram.mutate()}
                  disabled={unlinkTelegram.isPending}
                  className="gap-2"
                >
                  <Unlink className="h-4 w-4" />
                  {unlinkTelegram.isPending ? 'Unlinking...' : 'Unlink Telegram'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
