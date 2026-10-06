import { useEffect, useState } from "react";
import type { FoundationInfo } from "../../core/contracts/foundation-info";
import "./foundation.css";

export function FoundationApp() {
  const [info, setInfo] = useState<FoundationInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    window.lfa
      .getFoundationInfo()
      .then((value) => {
        if (active) setInfo(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="foundation-shell">
      <section className="foundation-card" aria-labelledby="foundation-title">
        <p className="foundation-kicker">STEP 08 — Repository Foundation</p>
        <h1 id="foundation-title">Lagu Full Album</h1>
        <p>
          Secure Electron + React + TypeScript shell is active. Product UI and
          product features intentionally begin in later Software Factory steps.
        </p>
        <dl>
          <div>
            <dt>Phase</dt>
            <dd>{info?.phase ?? "loading"}</dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>
              {info
                ? `${info.platform} / ${info.arch}`
                : error
                  ? "unavailable"
                  : "loading"}
            </dd>
          </div>
          <div>
            <dt>Node integration</dt>
            <dd>disabled</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
