"use client";
import { useEffect, useState } from "react";
import { Flag, ArrowRight, CheckCheck, Clock3 } from "lucide-react";
import {
  defaultConfig,
  blankF1,
  f1Fields,
  validF1,
  type GameConfig,
  type F1Pick,
} from "../lib/config";
type State = {
  config: GameConfig;
  revision: number;
  signedIn: boolean;
  saved: { answers: F1Pick; receipt: string; submitted: string } | null;
};
export default function F1Game() {
  const [data, setData] = useState<State>({
      config: defaultConfig,
      revision: 0,
      signedIn: false,
      saved: null,
    }),
    [answers, setAnswers] = useState<F1Pick>(blankF1()),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [review, setReview] = useState(false),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    fetch("/api/f1")
      .then(async (r) => {
        const d = (await r.json()) as State & { error: string };
        if (!r.ok) throw Error(d.error);
        setData(d);
        if (d.saved) setAnswers(d.saved.answers);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);
  const locked = now >= Date.parse(data.config.f1.locksAt),
    complete = validF1(answers, data.config.f1),
    saved =
      !!data.saved &&
      f1Fields.every((f) => answers[f.key] === data.saved!.answers[f.key]);
  const label = (key: string) =>
    [...data.config.f1.drivers, ...data.config.f1.teams].find(
      (v) => v.id === key,
    )?.name || "Not selected";
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/f1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, revision: data.revision }),
      });
      const d = (await r.json()) as {
        error: string;
        receipt: string;
        submitted: string;
      };
      if (!r.ok) throw Error(d.error);
      setData({
        ...data,
        saved: {
          answers: { ...answers },
          receipt: d.receipt,
          submitted: d.submitted,
        },
      });
      setReview(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="race-game">
      <div className="page-title">
        <span className="eyebrow">THE RACE WEEKEND CLUB</span>
        <h1>Every place. Every point.</h1>
        <p>Six predictions. Five points each. One pit-stop tiebreaker.</p>
      </div>
      <div className="race-banner">
        <Flag size={35} />
        <div>
          <span className="eyebrow">DEMO RACE · FICTIONAL ENTRANTS</span>
          <h2>{data.config.f1.title}</h2>
        </div>
        <strong>
          30 <small>PTS + TIEBREAK</small>
        </strong>
      </div>
      <div className="race-deadline">
        <Clock3 size={16} />
        {locked
          ? "Predictions locked"
          : `All answers lock before qualifying: ${new Date(data.config.f1.locksAt).toLocaleString("en-GB", { timeZone: "Europe/London" })} UK`}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading your race…</p>
      ) : (
        <>
          <div className="race-grid">
            {f1Fields.map((f, i) => (
              <label
                key={f.key}
                className={`race-choice ${f.key === "pitFirst" ? "tiebreak-choice" : ""}`}
              >
                <span className="race-choice-meta">
                  <span>
                    {String(i + 1).padStart(2, "0")} ·{" "}
                    {f.key === "pitFirst" ? "TIEBREAKER" : "YOUR CALL"}
                  </span>
                  <b>{f.key === "pitFirst" ? "+1 TIEBREAK PT" : "5 POINTS"}</b>
                </span>
                <span className="race-choice-title">{f.label}</span>
                <select
                  aria-label={f.label}
                  value={answers[f.key]}
                  disabled={locked || busy}
                  onChange={(e) => {
                    setAnswers({ ...answers, [f.key]: e.target.value });
                    setReview(false);
                  }}
                >
                  <option value="">Choose a {f.kind}</option>
                  {(f.kind === "driver"
                    ? data.config.f1.drivers
                    : data.config.f1.teams
                  ).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                {f.key === "pitFirst" && (
                  <small>
                    This answer only ranks players tied on the six main
                    predictions.
                  </small>
                )}
              </label>
            ))}
          </div>
          {new Set(
            [answers.winner, answers.second, answers.third].filter(Boolean),
          ).size <
            [answers.winner, answers.second, answers.third].filter(Boolean)
              .length && (
            <p className="form-error">
              Choose three different drivers for the podium.
            </p>
          )}
          {saved && (
            <div className="race-receipt" role="status">
              <CheckCheck size={24} />
              <div>
                <b>Your race predictions are in.</b>
                <p>Receipt {data.saved!.receipt} · Saved to your account</p>
              </div>
            </div>
          )}
          {review && (
            <section className="race-review">
              <h2>One last look at your grid.</h2>
              <div className="review-list">
                {f1Fields.map((f) => (
                  <div key={f.key}>
                    <span>{f.label}</span>
                    <b>{label(answers[f.key])}</b>
                  </div>
                ))}
              </div>
              <button
                className="primary"
                onClick={submit}
                disabled={busy || locked}
              >
                {busy ? "Submitting…" : "Confirm race predictions"}
                <CheckCheck size={17} />
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setReview(false)}
              >
                Back to editing
              </button>
            </section>
          )}
          <div className="race-actions">
            <p>
              Podium drivers must be different. Pole, fastest lap and race
              winner may be the same driver.
            </p>
            {!data.signedIn ? (
              <a
                className="primary"
                href="/signin-with-chatgpt?return_to=/"
                target="_top"
              >
                Sign in to save <ArrowRight size={17} />
              </a>
            ) : (
              <button
                className="primary"
                disabled={!complete || locked || busy || saved || review}
                onClick={() => setReview(true)}
              >
                {saved
                  ? "Predictions submitted"
                  : locked
                    ? "Race locked"
                    : "Review race predictions"}
                <ArrowRight size={17} />
              </button>
            )}
          </div>
          <p className="data-note">
            These are fictional demo drivers and teams. A licensed feed,
            published results and live rankings are not connected.
          </p>
        </>
      )}
    </section>
  );
}
