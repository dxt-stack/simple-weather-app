import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, CloudSun } from "lucide-react";
import { Link } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const FEATURES = [
  {
    title: "Current conditions",
    body: "Temperature, feels-like, humidity, wind, UV, pressure, and visibility — everything that matters, on one calm screen.",
  },
  {
    title: "The next 24 hours",
    body: "A single temperature curve with rain-likelihood hints, so you know when to take the umbrella without reading a wall of numbers.",
  },
  {
    title: "Seven days out",
    body: "A clean daily range with highs, lows, and precipitation chance — scan the week in seconds.",
  },
];

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      {/* Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center gap-2">
          <CloudSun className="size-4 text-foreground" strokeWidth={1.25} aria-hidden="true" />
          <span className="text-sm font-medium tracking-tight">Stratus</span>
        </div>
        <Link
          to="/dashboard"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Open dashboard
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20 sm:px-8">
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
          >
            Weather, plainly
          </motion.p>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="font-serif-display mt-6 max-w-2xl text-5xl leading-[1.04] tracking-tight text-foreground sm:text-6xl"
          >
            The forecast, stripped to what matters.
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-6 max-w-xl text-base leading-7 text-muted-foreground"
          >
            Stratus is a calm weather dashboard for everyone: current
            conditions, the next 24 hours as one clear curve, and a week of
            highs and lows. No clutter, no accounts, no noise.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.28 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Button
              asChild
              size="lg"
              className="h-11 rounded-md bg-foreground px-6 text-sm font-medium text-background hover:bg-foreground/85"
            >
              <Link to="/dashboard">
                Check your weather
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground/70">
              Free · No sign-up required
            </span>
          </motion.div>

          {/* Decorative temperature curve */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.4 }}
            aria-hidden="true"
            className="mt-16 max-w-xl sm:mt-20"
          >
            <svg viewBox="0 0 560 64" className="h-16 w-full text-foreground/25">
              <polyline
                points="0,52 40,50 80,47 120,49 160,44 200,38 240,33 280,28 320,24 360,26 400,31 440,38 480,44 520,49 560,52"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </section>

        {/* Features */}
        <section
          aria-label="What's inside"
          className="border-t border-border/70 bg-muted-soft/60"
        >
          <div className="mx-auto grid w-full max-w-5xl gap-px px-6 sm:grid-cols-3 sm:px-8">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                className="border-b border-border/50 py-8 sm:border-b-0 sm:py-12 sm:pr-8 [&:not(:first-child)]:sm:border-l sm:[&:not(:first-child)]:pl-8 [&:last-child]:sm:pr-0"
              >
                <h2 className="text-sm font-medium tracking-tight text-foreground">
                  {f.title}
                </h2>
                <p className="mt-2.5 max-w-xs text-sm leading-6 text-muted-foreground">
                  {f.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Closing note */}
        <section className="border-t border-border/70">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-4 px-6 py-10 sm:flex-row sm:items-center sm:px-8">
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Save the places you care about, switch between °C and °F, and get
              forecasts worldwide — powered by open data from Open-Meteo.
            </p>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-md border-border px-5 text-sm font-medium text-foreground hover:bg-muted-soft"
            >
              <Link to="/dashboard">Open the dashboard</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 sm:px-8">
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} Stratus
          </p>
          <p className="text-xs text-muted-foreground/70">Weather, plainly</p>
        </div>
      </footer>
    </motion.div>
  );
}
