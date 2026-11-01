"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Plus,
  Trash2,
  Settings2,
} from "lucide-react";
import { defaultConfig, type GameConfig } from "../../lib/config";
type CmsData = {
  tenant: string;
  revision: number;
  config: GameConfig;
  memberships: { tenant: string; role: string }[];
  history: { revision: number; rules: string; published: string }[];
};
export default function Cms() {
  const [data, setData] = useState<CmsData>({
      tenant: "luke-owned",
      revision: 0,
      config: defaultConfig,
      memberships: [],
      history: [],
    }),
    [config, setConfig] = useState<GameConfig>(defaultConfig),
    [tab, setTab] = useState("Football"),
    [access, setAccess] = useState(false),
    [subject, setSubject] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [review, setReview] = useState(false),
    [loading, setLoading] = useState(true);
  const load = async (tenant = "") => {
    setLoading(true);
    setError("");
    setReview(false);
    try {
      const r = await fetch(
        "/api/admin" + (tenant ? "?tenant=" + encodeURIComponent(tenant) : ""),
      );
      const d = (await r.json()) as CmsData & {
        error: string;
        subject: string;
      };
      if (r.status === 401 || r.status === 403) {
        setAccess(false);
        setSubject(d.subject || "");
        const p = await fetch("/api/game");
        if (p.ok) {
          const game = (await p.json()) as { config: GameConfig };
          setConfig(game.config);
        }
        return;
      }
      if (!r.ok) throw Error(d.error);
      setData(d);
      setConfig(d.config);
      setAccess(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const publish = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: data.tenant,
          expectedRevision: data.revision,
          config,
        }),
      });
      const d = (await r.json()) as { error: string; revision: number };
      if (!r.ok) throw Error(d.error);
      await load(data.tenant);
      setMessage(
        `Revision ${d.revision} is published. New rounds are now active.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const fixture = (i: number, key: string, value: string) =>
    setConfig({
      ...config,
      football: {
        ...config.football,
        fixtures: config.football.fixtures.map((f, n) =>
          n === i ? { ...f, [key]: value } : f,
        ),
      },
    });
  const entrant = (kind: "drivers" | "teams", i: number, value: string) =>
    setConfig({
      ...config,
      f1: {
        ...config.f1,
        [kind]: config.f1[kind].map((v, n) =>
          n === i ? { ...v, name: value } : v,
        ),
      },
    });
  const dateValue = (date: string) => date.slice(0, 16);
  const fromDate = (value: string) =>
    value ? new Date(value + "Z").toISOString() : "";
  return (
    <main className="cms-shell">
      <header className="cms-header">
        <a href="/" className="brand">
          luke<span className="brand-star">✳</span>
        </a>
        <span>PARTNER GAME CMS</span>
        <a className="secondary" href="/">
          <ArrowLeft size={16} />
          Back to clubhouse
        </a>
      </header>
      <div className="page-title">
        <span className="eyebrow">YOUR COMPETITION. YOUR CONTROL.</span>
        <h1>Set the stage for matchday.</h1>
        <p>
          Choose the fixtures. Build the race weekend. Publish a new round
          without changing code.
        </p>
      </div>
      {!loading && !access && (
        <div className="cms-access">
          <LockKeyhole size={22} />
          <div>
            <b>Read-only preview · staff access required</b>
            <p>
              Only provisioned tenant staff can publish.{" "}
              {subject
                ? "Give your platform operator the account ID below to request membership."
                : "Sign in to see your account ID and request CMS access."}
            </p>
            {subject ? (
              <code>{subject}</code>
            ) : (
              <a href="/signin-with-chatgpt?return_to=/admin" target="_top">
                Sign in with ChatGPT →
              </a>
            )}
          </div>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="cms-success" role="status">
          <Check size={17} />
          {message}
        </p>
      )}
      <div className="cms-toolbar">
        <div className="tabs">
          {["Football", "Formula 1", "Publishing history"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => {
                setTab(t);
                setReview(false);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <label>
          Organisation
          <select
            aria-label="Organisation"
            value={data.tenant}
            disabled={!access || busy}
            onChange={(e) => load(e.target.value)}
          >
            {(access
              ? data.memberships
              : [{ tenant: "luke-owned", role: "preview" }]
            ).map((m) => (
              <option value={m.tenant} key={m.tenant}>
                {m.tenant}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p role="status">Loading the CMS…</p>
      ) : (
        <>
          <fieldset className="cms-fields" disabled={!access || busy}>
            {tab === "Football" ? (
              <>
                <section className="cms-rules">
                  <Settings2 size={22} />
                  <div>
                    <h2>Six fixtures. Forty-two points.</h2>
                    <p>
                      Exact score: 5 · Correct outcome instead: 2 · First team
                      to score: 2. Rules are versioned and fixed for this
                      template.
                    </p>
                  </div>
                </section>
                <label className="cms-label">
                  Round title
                  <input
                    value={config.football.title}
                    maxLength={60}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        football: { ...config.football, title: e.target.value },
                      })
                    }
                  />
                </label>
                <div className="cms-fixtures">
                  {config.football.fixtures.map((f, i) => (
                    <section key={f.id} className="cms-fixture">
                      <h3>FIXTURE {String(i + 1).padStart(2, "0")}</h3>
                      <label>
                        Home team
                        <input
                          value={f.home}
                          maxLength={60}
                          onChange={(e) => fixture(i, "home", e.target.value)}
                        />
                      </label>
                      <label>
                        Away team
                        <input
                          value={f.away}
                          maxLength={60}
                          onChange={(e) => fixture(i, "away", e.target.value)}
                        />
                      </label>
                      <label>
                        Home abbreviation
                        <input
                          value={f.h}
                          maxLength={4}
                          onChange={(e) =>
                            fixture(i, "h", e.target.value.toUpperCase())
                          }
                        />
                      </label>
                      <label>
                        Away abbreviation
                        <input
                          value={f.a}
                          maxLength={4}
                          onChange={(e) =>
                            fixture(i, "a", e.target.value.toUpperCase())
                          }
                        />
                      </label>
                      <label>
                        Kick-off (UTC)
                        <input
                          type="datetime-local"
                          value={dateValue(f.kickoff)}
                          onChange={(e) =>
                            fixture(i, "kickoff", fromDate(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        Venue
                        <input
                          value={f.venue}
                          maxLength={60}
                          onChange={(e) => fixture(i, "venue", e.target.value)}
                        />
                      </label>
                    </section>
                  ))}
                </div>
              </>
            ) : tab === "Formula 1" ? (
              <>
                <section className="cms-rules">
                  <Settings2 size={22} />
                  <div>
                    <h2>Six outcomes. One tiebreaker.</h2>
                    <p>
                      5 points each: winner, second, third, pole, fastest lap
                      and highest-scoring team. First team to pit: 1 tiebreak
                      point.
                    </p>
                  </div>
                </section>
                <div className="cms-fixture">
                  <label>
                    Race title
                    <input
                      value={config.f1.title}
                      maxLength={60}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          f1: { ...config.f1, title: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    Prediction lock (UTC, before qualifying)
                    <input
                      type="datetime-local"
                      value={dateValue(config.f1.locksAt)}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          f1: {
                            ...config.f1,
                            locksAt: fromDate(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <div className="cms-entrants">
                  {(["drivers", "teams"] as const).map((kind) => (
                    <section key={kind}>
                      <h2>{kind === "drivers" ? "Drivers" : "Teams"}</h2>
                      <p>
                        Demo entrants. Keep existing IDs stable when correcting
                        names.
                      </p>
                      {config.f1[kind].map((v, i) => (
                        <div className="entrant-row" key={v.id}>
                          <label>
                            {kind === "drivers" ? "Driver" : "Team"} {i + 1}
                            <input
                              value={v.name}
                              maxLength={60}
                              onChange={(e) => entrant(kind, i, e.target.value)}
                            />
                          </label>
                          <button
                            aria-label={`Remove ${v.name}`}
                            disabled={
                              !access ||
                              config.f1[kind].length <=
                                (kind === "drivers" ? 3 : 2)
                            }
                            onClick={() =>
                              setConfig({
                                ...config,
                                f1: {
                                  ...config.f1,
                                  [kind]: config.f1[kind].filter(
                                    (_, n) => n !== i,
                                  ),
                                },
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        className="secondary"
                        onClick={() =>
                          setConfig({
                            ...config,
                            f1: {
                              ...config.f1,
                              [kind]: [
                                ...config.f1[kind],
                                {
                                  id: crypto.randomUUID(),
                                  name:
                                    kind === "drivers"
                                      ? "New driver"
                                      : "New team",
                                },
                              ],
                            },
                          })
                        }
                      >
                        <Plus size={16} />
                        Add {kind === "drivers" ? "driver" : "team"}
                      </button>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <section className="cms-history">
                <h2>Published revisions</h2>
                <p>
                  Each publication preserves its configuration and creates fresh
                  football and F1 rounds. Previous predictions remain stored
                  under their original revision.
                </p>
                {data.history.length ? (
                  data.history.map((h) => (
                    <div key={h.revision}>
                      <b>Revision {h.revision}</b>
                      <span>{h.rules}</span>
                      <span>
                        {new Date(h.published).toLocaleString("en-GB")}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>
                    No staff-published revisions yet. The demo defaults are
                    active.
                  </p>
                )}
              </section>
            )}
          </fieldset>
          {access && tab !== "Publishing history" && (
            <div className="cms-publish">
              {review ? (
                <>
                  <h2>Publish new rounds for {data.tenant}?</h2>
                  <p>
                    This activates six football fixtures and the configured F1
                    race. Existing entries are preserved in their original
                    rounds; players start fresh. This is not an edit to an
                    in-progress round.
                  </p>
                  <button className="primary" disabled={busy} onClick={publish}>
                    {busy ? "Publishing…" : "Confirm and publish"}
                    <ArrowRight size={17} />
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => setReview(false)}
                  >
                    Keep editing
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Current revision: {data.revision} · Changes stay in this
                    editor until published.
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setReview(true);
                      setMessage("");
                    }}
                  >
                    Review publication <ArrowRight size={17} />
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
