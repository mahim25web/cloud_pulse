import Link from "next/link";
import "./overview.css";

const services = [
  { name: "API Gateway", address: "api.example.com", latency: "84 ms", status: "Operational" },
  { name: "Web Application", address: "app.example.com", latency: "126 ms", status: "Operational" },
  { name: "Background Worker", address: "worker.example.com", latency: "—", status: "Degraded" },
];

export const metadata = {
  title: "Monitoring overview | CloudPulse",
  description: "Preview the CloudPulse monitoring dashboard.",
};

export default function OverviewPage() {
  return (
    <main className="overview-shell">
      <header className="overview-nav">
        <Link className="overview-brand" href="/">
          <span className="overview-brand-mark" aria-hidden="true">
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
          CloudPulse
        </Link>
        <Link className="overview-back" href="/">
          <span aria-hidden="true">←</span> Back to home
        </Link>
      </header>

      <section className="overview-content" aria-labelledby="overview-title">
        <div className="overview-heading">
          <div>
            <p className="overview-eyebrow">YOUR MONITORING DASHBOARD</p>
            <h1 id="overview-title">Service overview</h1>
            <p className="overview-description">
              A quick look at service health, response times, and recent activity.
            </p>
          </div>
          <span className="sample-badge">
            <span className="sample-dot" />
            Sample data · not connected
          </span>
        </div>

        <div className="overview-stats" aria-label="Sample monitoring metrics">
          <article className="overview-stat">
            <span className="stat-label">Services monitored</span>
            <strong>12</strong>
            <span className="stat-note">Across your environment</span>
          </article>
          <article className="overview-stat">
            <span className="stat-label">Uptime (30 days)</span>
            <strong>99.98<span className="stat-unit">%</span></strong>
            <span className="stat-note stat-positive">Within your target</span>
          </article>
          <article className="overview-stat">
            <span className="stat-label">Open incidents</span>
            <strong>2</strong>
            <span className="stat-note">1 needs attention</span>
          </article>
        </div>

        <div className="overview-grid">
          <section className="overview-panel health-panel" aria-labelledby="health-title">
            <div className="panel-heading">
              <div>
                <h2 id="health-title">Response time</h2>
                <p>Average latency over the last 24 hours</p>
              </div>
              <span className="panel-value">108 <span>ms</span></span>
            </div>
            <div className="overview-chart" role="img" aria-label="Sample response time chart showing mostly steady latency">
              <div className="overview-chart-grid" />
              <svg viewBox="0 0 720 180" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="overview-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#7ee0c3" stopOpacity=".2" />
                    <stop offset="100%" stopColor="#7ee0c3" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 112 C30 108 38 92 70 98 S112 116 142 96 184 90 215 102 254 112 286 86 326 90 358 78 402 92 430 84 468 62 502 76 542 91 574 69 616 72 650 58 688 70 720 48 V180 H0Z"
                  fill="url(#overview-fill)"
                />
                <path
                  d="M0 112 C30 108 38 92 70 98 S112 116 142 96 184 90 215 102 254 112 286 86 326 90 358 78 402 92 430 84 468 62 502 76 542 91 574 69 616 72 650 58 688 70 720 48"
                  fill="none"
                  stroke="#7ee0c3"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <div className="chart-labels" aria-hidden="true">
              <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>Now</span>
            </div>
          </section>

          <section className="overview-panel services-panel" aria-labelledby="services-title">
            <div className="panel-heading">
              <div>
                <h2 id="services-title">Services</h2>
                <p>Latest check results</p>
              </div>
              <span className="service-count">3 shown</span>
            </div>
            <ul className="service-list">
              {services.map((service) => (
                <li className="service-row" key={service.name}>
                  <span className={`service-indicator ${service.status === "Degraded" ? "is-degraded" : ""}`} />
                  <span className="service-info">
                    <strong>{service.name}</strong>
                    <span>{service.address}</span>
                  </span>
                  <span className="service-result">
                    <strong>{service.latency}</strong>
                    <span className={service.status === "Degraded" ? "status-degraded" : "status-operational"}>
                      {service.status}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="sample-disclaimer">
          This is a product preview. Metrics and service names are illustrative; live monitoring is not connected yet.
        </p>
      </section>
    </main>
  );
}
