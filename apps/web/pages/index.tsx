import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex flex-col gap-4 p-8">
      <Button className="w-40" variant="primary">Primary</Button>
      <Button className="w-40" variant="secondary">Secondary</Button>
    </main>
  );
}
