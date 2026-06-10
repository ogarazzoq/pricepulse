'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRegister } from '@/features/auth/use-auth';
import { Logo } from '@/components/ui/logo';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const register = useRegister();

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="lg:hidden">
        <Logo />
      </div>
      
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          asChild
          className="gap-2"
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start tracking marketplace prices in under a minute.
        </p>
      </motion.div>

      <motion.form
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        onSubmit={(e) => {
          e.preventDefault();
          register.mutate({ email, name, password });
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Full name</label>
          <Input 
            required 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Ada Lovelace"
            className="focus-ring-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="focus-ring-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="pr-10 focus-ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="sr-only">
                {showPassword ? 'Hide password' : 'Show password'}
              </span>
            </button>
          </div>
        </div>

        <Button 
          type="submit" 
          variant="gradient" 
          size="lg" 
          className="w-full" 
          disabled={register.isPending}
        >
          {register.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-center text-sm text-muted-foreground"
      >
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}
