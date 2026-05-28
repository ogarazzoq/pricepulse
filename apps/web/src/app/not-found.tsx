import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-6">
      <p className="text-7xl font-semibold gradient-text">404</p>
      <h1 className="mt-3 text-2xl font-semibold">We can&apos;t find that page</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for has been moved or doesn&apos;t exist.
      </p>
      <Button asChild variant="gradient" className="mt-6">
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
