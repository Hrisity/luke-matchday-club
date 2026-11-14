"use client";
import { useEffect, useState } from "react";
import { f1Fields, blankF1, type GameConfig } from "../lib/config";
import { type Results } from "../lib/settlement";
import type { Standing } from "../lib/settlement";
type Data = {
  revision: number;
  version: number;
  config: GameConfig;
  results: Results;
  rows: (Omit<Standing, "user"> & { isYou: boolean })[];
  history: { version: number; published: string }[];
};
export default function CompetitionResults({
  admin = false,
  tenant = "luke-owned",
  compact = false,
  league,
  initialSport = "football",
}: {
  admin?: boolean;
  tenant?: string;
  compact?: boolean;
  league?: string;
  initialSport?: string;
}) {
  const [data, setData] = useState<Data | null>(null),
    [sport, setSport] = useState(initialSport),
    [scope, setScope] = useState("round"),
    [revision, setRevision] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const query = new URLSearchParams({
    tenant,
    sport: admin ? "football" : sport,
    scope,
    ...(league ? { league } : {}),
    ...(revision ? { revision } : {}),
  }).toString();
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch("/api/results?" + query);
        const d = (await r.json()) as Data & { error: string };
        if (!r.ok) throw Error(d.error);
        if (active) {
          setData(d);
          setError("");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    void load();
    const timer = admin ? undefined : setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [query, admin]);
  const publish = async () => {
    if (!data) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          revision: data.revision,
          expectedVersion: data.version,
          results: data.results,
        }),
      });
      const d = (await r.json()) as { error: string; version: number };
      if (!r.ok) throw Error(d.error);
      setData({ ...data, version: d.version, history: [{ version: d.version, published: new Date().toISOString() }, ...data.history] });
      setMessage(
        "Results published. Scores and standings now reflect this version.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="standings-card competition-results">
      <h2>
        {admin
          ? "Publish verified results"
          : compact
            ? "Top of the table"
            : "Results & standings"}
      </h2>
      {!compact && (
        <div className="panel-toolbar">
          <div className="tabs">
            {["football", "f1"].map((s) => (
              <button
                key={s}
                className={sport === s ? "active" : ""}
                onClick={() => setSport(s)}
              >
                {s === "football" ? "Football" : "Formula 1"}
              </button>
            ))}
          </div>
          {!admin && (
            <label>
              Standings{" "}
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="round">Selected round</option>
                <option value="all">All rounds</option>
              </select>
            </label>
          )}
          <label>
            Round revision{" "}
            <input
              aria-label="Round revision"
              placeholder="Current"
              type="number"
              min="0"
              value={revision}
              onChange={(e) => {
                setData(null);
                setRevision(e.target.value);
              }}
            />
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!data ? (
        <p>Loading results…</p>
      ) : (
        <>
          <p className="data-note">
            Revision {data.revision} ·{" "}
            {data.version
              ? `Results version ${data.version}`
              : "Awaiting verified results"}
            {!admin ? " · Refreshes every 30 seconds" : ""}
          </p>
          {admin ? (
            <fieldset disabled={busy}>
              <p>
                Enter final, verified outcomes only. Uncheck a fixture to
                withdraw its result. Publishing a correction recalculates
                standings without changing predictions.
              </p>
              {sport === "football" ? (
                data.config.football.fixtures.map((f) => {
                  const p = data.results.football[f.id];
                  return (
                    <div className="result-editor" key={f.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!p}
                          onChange={(e) => {
                            const football = { ...data.results.football };
                            if (e.target.checked)
                              football[f.id] = {
                                home: 0,
                                away: 0,
                                first: "NONE",
                              };
                            else delete football[f.id];
                            setData({
                              ...data,
                              results: { ...data.results, football },
                            });
                          }}
                        />{" "}
                        {f.home} — {f.away}
                      </label>
                      {p && (
                        <>
                          <label>
                            Home goals
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={p.home}
                              onChange={(e) =>
                                setData({
                                  ...data,
                                  results: {
                                    ...data.results,
                                    football: {
                                      ...data.results.football,
                                      [f.id]: {
                                        ...p,
                                        home: Number(e.target.value),
                                      },
                                    },
                                  },
                                })
                              }
                            />
                          </label>
                          <label>
                            Away goals
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={p.away}
                              onChange={(e) =>
                                setData({
                                  ...data,
                                  results: {
                                    ...data.results,
                                    football: {
                                      ...data.results.football,
                                      [f.id]: {
                                        ...p,
                                        away: Number(e.target.value),
                                      },
                                    },
                                  },
                                })
                              }
                            />
                          </label>
                          <label>
                            First scorer
                            <select
                              value={p.first}
                              onChange={(e) =>
                                setData({
                                  ...data,
                                  results: {
                                    ...data.results,
                                    football: {
                                      ...data.results.football,
                                      [f.id]: {
                                        ...p,
                                        first: e.target.value as
                                          | "HOME"
                                          | "AWAY"
                                          | "NONE",
                                      },
                                    },
                                  },
                                })
                              }
                            >
                              <option value="HOME">{f.home}</option>
                              <option value="AWAY">{f.away}</option>
                              <option value="NONE">No goals</option>
                            </select>
                          </label>
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!data.results.f1}
                      onChange={(e) =>
                        setData({
                          ...data,
                          results: {
                            ...data.results,
                            f1: e.target.checked ? blankF1() : null,
                          },
                        })
                      }
                    />{" "}
                    Publish F1 results
                  </label>
                  {data.results.f1 &&
                    f1Fields.map((f) => (
                      <label className="cms-label" key={f.key}>
                        {f.label}
                        <select
                          value={data.results.f1![f.key]}
                          onChange={(e) =>
                            setData({
                              ...data,
                              results: {
                                ...data.results,
                                f1: {
                                  ...data.results.f1!,
                                  [f.key]: e.target.value,
                                },
                              },
                            })
                          }
                        >
                          <option value="">Select outcome</option>
                          {(f.kind === "driver"
                            ? data.config.f1.drivers
                            : data.config.f1.teams
                          ).map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                </>
              )}
              <button className="primary" onClick={publish}>
                {busy ? "Publishing…" : "Publish results / correction"}
              </button>
              <p>
                History:{" "}
                {data.history
                  .map(
                    (h) =>
                      `v${h.version} (${new Date(h.published).toLocaleString()})`,
                  )
                  .join(" · ") || "No published results"}
              </p>
            </fieldset>
          ) : (
            <>
              {!compact && (
                <div className="results-grid">
                  {sport === "football"
                    ? data.config.football.fixtures.map((f) => {
                        const r = data.results.football[f.id];
                        return (
                          <article className="result-card" key={f.id}>
                            <h3>
                              {f.home} — {f.away}
                            </h3>
                            <p>
                              {r ? `${r.home} – ${r.away}` : "Awaiting result"}
                            </p>
                            {r && (
                              <small>
                                First scorer:{" "}
                                {r.first === "NONE"
                                  ? "No goals"
                                  : r.first === "HOME"
                                    ? f.home
                                    : f.away}
                              </small>
                            )}
                          </article>
                        );
                      })
                    : f1Fields.map((f) => (
                        <article className="result-card" key={f.key}>
                          <h3>{f.label}</h3>
                          <p>
                            {data.results.f1
                              ? [
                                  ...data.config.f1.drivers,
                                  ...data.config.f1.teams,
                                ].find((x) => x.id === data.results.f1![f.key])
                                  ?.name
                              : "Awaiting result"}
                          </p>
                        </article>
                      ))}
                </div>
              )}
              {!data.rows.length ? (
                <p>No submitted entries yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Points</th>
                      {!compact && (
                        <th>
                          {sport === "football"
                            ? "Exact / first scorer"
                            : "Tiebreak"}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(compact ? data.rows.slice(0, 5) : data.rows).map(
                      (r, i) => (
                        <tr key={i}>
                          <td>{r.rank}</td>
                          <td>
                            {r.name}
                            {r.isYou ? " (you)" : ""}
                          </td>
                          <td>
                            {r.points}
                            {!r.settled ? " · pending" : ""}
                          </td>
                          {!compact && (
                            <td>
                              {sport === "football"
                                ? `${r.exact} / ${r.first}`
                                : r.tiebreaker}
                            </td>
                          )}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              )}
              {!compact && (
                <p className="data-note">
                  Only submitted predictions count. Football ties use exact
                  scores, then first scorers. F1 uses the first-team-to-pit
                  tiebreaker. Equal scores share a rank.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
