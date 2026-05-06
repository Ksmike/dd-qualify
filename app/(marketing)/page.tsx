import Link from "next/link";
import { getLabelsForLocale } from "@/labels";

export default function HomePage() {
  const { labels } = getLabelsForLocale("en");
  const marketing = labels.marketing;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <section className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          {marketing.hero.badge}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {marketing.hero.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground/70">
          {marketing.hero.description}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {marketing.hero.segmentLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-divider bg-content1 px-3 py-1 text-xs font-medium text-foreground/80"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {marketing.hero.trialCta}
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-divider px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-content1"
          >
            {marketing.hero.demoCta}
          </Link>
        </div>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {marketing.metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-divider bg-content1 p-5">
            <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
            <p className="mt-1 text-sm text-foreground/70">{metric.label}</p>
          </div>
        ))}
      </section>

      <section id="workflow" className="mt-16">
        <h2 className="text-2xl font-semibold text-foreground">{marketing.workflow.heading}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {marketing.workflow.steps.map((step) => (
            <article key={step.title} className="rounded-xl border border-divider p-5">
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="coverage" className="mt-16 grid gap-8 md:grid-cols-2 md:items-start">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{marketing.coverage.heading}</h2>
          <p className="mt-3 text-foreground/70">{marketing.coverage.description}</p>
          <ul className="mt-4 space-y-2 text-sm text-foreground/80">
            {marketing.coverage.items.map((item) => (
              <li key={item} className="rounded-md bg-content1 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <aside className="rounded-xl border border-divider bg-content1 p-6">
          <h3 className="text-lg font-semibold text-foreground">{marketing.coverage.outcomesTitle}</h3>
          {marketing.coverage.outcomesParagraphs.map((paragraph) => (
            <p key={paragraph} className="mt-2 text-sm text-foreground/70">
              {paragraph}
            </p>
          ))}
        </aside>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-foreground">{marketing.taxonomy.heading}</h2>
        <p className="mt-3 max-w-3xl text-foreground/70">{marketing.taxonomy.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {marketing.taxonomy.items.map((label) => (
            <span
              key={label}
              className="rounded-md bg-content1 px-3 py-2 text-sm text-foreground/80"
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-2xl border border-divider bg-content1 p-8 text-center">
        <h2 className="text-2xl font-semibold text-foreground">
          {marketing.cta.heading}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-foreground/70">{marketing.cta.description}</p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {marketing.cta.createWorkspaceCta}
          </Link>
        </div>
      </section>
      <div className="mt-5 text-center text-xs text-foreground/50">
        {marketing.cta.footnote}
      </div>
    </div>
  );
}
