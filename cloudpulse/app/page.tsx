export default function Home() {
  return (
    <main className="page-shell">
      <nav className="nav" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="CloudPulse home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="M8.2 23.1h15.4a5.2 5.2 0 0 0 .4-10.4A8 8 0 0 0 8.8 14a4.6 4.6 0 0 0-.6 9.1Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 18h4l2-3.5 3.1 7 2.2-3.5h3.8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>CloudPulse</span>
        </a>
        <span className="nav-note">Monitoring, made clearer.</span>
      </nav>

      <section className="hero">
        <p className="eyebrow">
          <span className="status-dot" />
          Cloud monitoring &amp; incident intelligence
        </p>
        <h1>
          Know when something&apos;s wrong.
          <span> Understand what to do next.</span>
        </h1>
        <p className="intro">
          CloudPulse helps you keep an eye on your services and make sense of
          incidents, so you can get back to building with confidence.
        </p>
        <a className="primary-link" href="#service-overview">
          Explore the overview <span aria-hidden="true">↓</span>
        </a>
        <section
          id="service-overview"
          className="signal-card"
          aria-label="Illustrative service monitoring preview"
        >
          <div className="signal-card-heading">
            <div>
              <span className="card-kicker">SERVICE HEALTH</span>
              <p>All systems in view</p>
            </div>
            <span className="healthy-pill">
              <span className="status-dot" />
              Preview
            </span>
          </div>
          <div className="signal-chart" aria-hidden="true">
            <div className="chart-grid" />
            <svg viewBox="0 0 640 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7ee0c3" stopOpacity=".22" />
                  <stop offset="100%" stopColor="#7ee0c3" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 82 C24 82 26 70 48 70 S77 78 98 72 120 76 139 63 165 66 184 58 207 68 228 60 251 54 273 59 297 46 319 51 346 55 365 44 390 48 411 40 438 49 455 41 481 48 501 34 525 40 548 37 568 45 596 29 616 35 632 28 C634 28 638 31 640 31 V120 H0Z"
                fill="url(#chart-fill)"
              />
              <path
                d="M0 82 C24 82 26 70 48 70 S77 78 98 72 120 76 139 63 165 66 184 58 207 68 228 60 251 54 273 59 297 46 319 51 346 55 365 44 390 48 411 40 438 49 455 41 481 48 501 34 525 40 548 37 568 45 596 29 616 35 632 28 C634 28 638 31 640 31"
                fill="none"
                stroke="#7ee0c3"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="signal-card-footer">
            <span>Clear signals, less noise.</span>
            <span className="live-indicator">
              <span className="status-dot" />
              Ready for what&apos;s next
            </span>
          </div>
        </section>
      </section>

      <footer className="footer">
        <span>CloudPulse</span>
        <span>Stay ahead of the unexpected.</span>
      </footer>
    </main>
  );
}
