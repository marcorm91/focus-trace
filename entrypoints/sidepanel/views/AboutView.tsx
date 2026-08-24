import { browser } from '#imports';
import '../about.css';

const VERSION_DATE = '2026-08-24';
const CREATOR_NAME = 'Marco Romero';
const CREATOR_LINKEDIN = 'https://www.linkedin.com/in/marcorm91/';

const formattedVersionDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeZone: 'UTC',
}).format(new Date(`${VERSION_DATE}T00:00:00Z`));

export function AboutView() {
  const version = browser.runtime.getManifest().version;

  return (
    <section className="panel about-panel" aria-labelledby="about-title">
      <div className="section-heading">
        <div>
          <h2 id="about-title">About FocusTrace</h2>
          <p>Product information and project provenance.</p>
        </div>
      </div>

      <article className="about-card">
        <div className="about-product">
          <span className="about-mark" aria-hidden="true">FT</span>
          <div>
            <strong>FocusTrace</strong>
            <p>Debug accessibility focus like you debug JavaScript.</p>
          </div>
        </div>

        <dl className="about-meta">
          <div>
            <dt>Version</dt>
            <dd><code>v{version}</code></dd>
          </div>
          <div>
            <dt>Version date</dt>
            <dd><time dateTime={VERSION_DATE}>{formattedVersionDate}</time></dd>
          </div>
          <div>
            <dt>Created by</dt>
            <dd>{CREATOR_NAME}</dd>
          </div>
        </dl>

        <a className="about-link" href={CREATOR_LINKEDIN} target="_blank" rel="noreferrer">
          View {CREATOR_NAME} on LinkedIn <span aria-hidden="true">↗</span>
        </a>
      </article>

      <div className="notice about-privacy">
        <strong>Local-first by design</strong>
        <p>FocusTrace analyzes accessibility evidence locally in the browser and does not require a FocusTrace account or backend.</p>
      </div>
    </section>
  );
}
