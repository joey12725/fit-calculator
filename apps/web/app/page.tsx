import { Calculator } from '@/components/Calculator';

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-10 max-w-2xl">
        <p className="text-sm font-semibold tracking-wide text-brand-ink uppercase">Fit Calculator</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          A few measurements in. A size, its sisters and the reasoning out.
        </h1>
        <p className="mt-3 text-muted">
          The fit engine reads snug underbust, standing and leaning bust, and an optional shape profile, then
          walks through each sizing rule so the answer is easy to check.
        </p>
      </header>
      <Calculator />
      <footer className="mt-14 text-sm text-muted">
        Sample profiles are fabricated. Built by Joey Hersh.
      </footer>
    </main>
  );
}
