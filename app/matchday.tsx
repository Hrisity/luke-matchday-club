"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Plus,
  Minus,
  Check,
  CheckCheck,
  Clock3,
  Trophy,
  Users,
  Flag,
  Goal,
  Star,
  Ticket,
  HelpCircle,
  Settings2,
  Bell,
  X,
  Copy,
  Menu,
  LockKeyhole,
  ArrowDown,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";
import {
  fixtures as defaultFixtures,
  emptyPick,
  validatePick,
  isLocked,
  type Pick,
  type Fixture,
} from "../lib/game";
import { defaultConfig, type GameConfig } from "../lib/config";
import F1Game from "./f1-game";
import CompetitionResults from "./competition-results";
type Page = "Matchday" | "Leaderboard" | "My leagues" | "Results" | "Formula 1";
type League = { id: string; name: string; code: string; count: number };
type Receipt = { receipt: string; submitted: string; snapshot: string };
type Data = {
  user: { name: string } | null;
  picks: Record<string, Pick>;
  receipt: Receipt | null;
  leagues: League[];
  config?: GameConfig;
  revision?: number;
};
const initial: Data = { user: null, picks: {}, receipt: null, leagues: [] };
const nav = [
  { title: "Matchday", icon: Goal },
  { title: "Leaderboard", icon: Trophy },
  { title: "My leagues", icon: Users },
  { title: "Results", icon: Flag },
] as const;
const time = (v: string) =>
  new Date(v).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
function Team({
  code,
  color,
  small = false,
}: {
  code: string;
  color: string;
  small?: boolean;
}) {
  return (
    <span
      className={`team-mark ${small ? "small" : ""}`}
      style={{ "--team": color } as React.CSSProperties}
    >
      <span>{code.slice(0, 1)}</span>
      <i />
    </span>
  );
}
function Mark() {
  return (
    <span className="brand">
      simply predict<span className="brand-star">✳</span>
    </span>
  );
}
export default function Matchday() {
  const [page, setPage] = useState<Page>("Matchday"),
    [sport, setSport] = useState("Football"),
    [data, setData] = useState<Data>(initial),
    [picks, setPicks] = useState<Record<string, Pick>>({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saveState, setSaveState] = useState(""),
    [modal, setModal] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [menu, setMenu] = useState(false),
    [field, setField] = useState(""),
    [password, setPassword] = useState(""),
    [formError, setFormError] = useState(""),
    [league, setLeague] = useState<League | null>(null),
    [theme, setTheme] = useState<"luke" | "botb">("luke"),
    [now, setNow] = useState(() => Date.now());
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({}),
    pending = useRef<Set<Promise<unknown>>>(new Set()),
    dialog = useRef<HTMLDialogElement>(null),
    latest = useRef(picks),
    queues = useRef<Record<string, Promise<unknown>>>({});
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/game");
      const d = (await r.json()) as Data & { error?: string };
      if (!r.ok) throw Error(d.error);
      setData(d);
      setPicks(d.picks);
      latest.current = d.picks;
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // Initial data hydration is intentionally triggered by the mount effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => {
    const saved = window.localStorage.getItem("luke-ui-theme");
    if (saved === "botb" || saved === "luke") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(saved);
    }
  }, []);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    if (modal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormError("");
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [modal]);
  const fixtures = data.config?.football.fixtures || defaultFixtures;
  const roundTitle =
    data.config?.football.title || defaultConfig.football.title;
  const firstKickoff = fixtures.reduce((a, b) =>
    a.kickoff < b.kickoff ? a : b,
  ).kickoff;
  const done = fixtures.filter(
    (f) => picks[f.id] && validatePick(picks[f.id]),
  ).length;
  const move = (p: Page) => {
    setPage(p);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const open = (m: string) => {
    setField("");
    setModal(m);
  };
  const toggleTheme = () => {
    const next = theme === "luke" ? "botb" : "luke";
    setTheme(next);
    window.localStorage.setItem("luke-ui-theme", next);
    setToast(next === "botb" ? "Concept skin on — simply predict game rules unchanged." : "simply predict · dark skin restored.");
  };
  const demoLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const r = await fetch("/api/demo-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: field.trim().toLowerCase(), password }) });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      setPassword("");
      setModal("");
      await load();
    } catch (e) { setFormError((e as Error).message); } finally { setBusy(false); }
  };
  const mutate = async (body: unknown) => {
    const r = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = (await r.json()) as { error?: string; receipt: Receipt };
    if (r.status === 401) {
      setModal("signin");
      throw Error("Sign in to save your picks.");
    }
    if (!r.ok)
      throw Error(d.error || "Something went wrong. Please try again.");
    return d;
  };
  const persist = (id: string, p: Pick) => {
    const work = (queues.current[id] || Promise.resolve())
      .then(() =>
        mutate({
          action: "draft",
          fixture: id,
          pick: p,
          revision: data.revision ?? 0,
        }),
      )
      .then(() => setSaveState("Draft saved"))
      .catch((e) => setSaveState(e.message))
      .finally(() => pending.current.delete(work));
    queues.current[id] = work;
    pending.current.add(work);
    return work;
  };
  const update = (id: string, change: Partial<Pick>) => {
    const f = fixtures.find((f) => f.id === id)!;
    if (isLocked(f, now)) return;
    const p = { ...(latest.current[id] || emptyPick()), ...change };
    if (
      (p.first === "HOME" && p.home === 0) ||
      (p.first === "AWAY" && p.away === 0) ||
      (p.first === "NONE" && (p.home > 0 || p.away > 0))
    )
      p.first = null;
    const next = { ...latest.current, [id]: p };
    latest.current = next;
    setPicks(next);
    setSaveState(data.user ? "Saving…" : "Sign in to save your picks");
    clearTimeout(timers.current[id]);
    if (data.user) timers.current[id] = setTimeout(() => persist(id, p), 500);
  };
  const submit = async () => {
    setBusy(true);
    setFormError("");
    try {
      Object.values(timers.current).forEach(clearTimeout);
      await Promise.all(pending.current);
      const r = await mutate({
        action: "submit",
        picks: latest.current,
        revision: data.revision ?? 0,
      });
      setData({ ...data, receipt: r.receipt });
      setModal("receipt");
      setSaveState("Predictions submitted");
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const form = async (action: string) => {
    setBusy(true);
    setFormError("");
    try {
      await mutate(
        action === "joinLeague"
          ? { action, code: field }
          : { action, name: field },
      );
      await load();
      setModal("");
      setToast(
        action === "profile"
          ? "Your profile is updated."
          : action === "createLeague"
            ? "Your league is ready. Invite your people!"
            : "You’re in. Welcome to the league!",
      );
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setToast("Copied to clipboard");
    } catch {
      setToast("Clipboard unavailable. Select and copy the code.");
    }
  };
  const receiptCurrent =
    !!data.receipt &&
    fixtures.every(
      (f) =>
        JSON.stringify(JSON.parse(data.receipt!.snapshot)[f.id]) ===
        JSON.stringify(picks[f.id]),
    );
  return (
    <div className={`app-shell ${theme === "botb" ? "theme-botb" : ""}`}>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <button
          className="brand-button"
          onClick={() => move("Matchday")}
              aria-label="simply predict home"
        >
          <Mark />
        </button>
        <div className="brand-caption">THE PREDICTION CLUB</div>
        <div className="workspace-label">YOUR MATCHDAY, MADE.</div>
        <nav aria-label="Main navigation">
          {nav.map(({ title, icon: Icon }) => (
            <button
              key={title}
              className={`nav-link ${page === title ? "active" : ""}`}
              onClick={() => {
                setSport("Football");
                move(title);
              }}
              aria-current={page === title ? "page" : undefined}
            >
              {theme === "botb" ? <span className="concept-category-icon">{title === "Matchday" ? <Star size={26} /> : <Icon size={26} />}</span> : <Icon size={19} />}
              <span>{title}</span>
              {title === "Matchday" && <span className="nav-count">6</span>}
            </button>
          ))}
        </nav>
        <div className="side-rule" />
        <div className="workspace-label sports-label">THE SPORTS DESK</div>
        <button
          className={`sport-link ${sport === "Football" ? "selected" : ""}`}
          onClick={() => {
            setSport("Football");
            move("Matchday");
          }}
        >
          {theme === "botb" ? <span className="concept-category-icon"><Goal size={26} /></span> : <span className="ball-icon">◉</span>}Football
          <span className="green-dot" />
        </button>
        <button
          className={`sport-link ${sport === "Formula 1" ? "selected" : ""}`}
          onClick={() => {
            setSport("Formula 1");
            move("Formula 1");
          }}
        >
          {theme === "botb" ? <span className="concept-category-icon"><Flag size={26} /></span> : <Flag size={17} />}
          Formula 1<span className="green-dot" />
        </button>
        <a className="side-help" href="/admin">
          <Settings2 size={18} />
          Game CMS <ArrowUpRight size={15} />
        </a>
        <div className="sidebar-bottom">
          <div className="club-note">
            <Ticket size={24} />
            <h3>Better with your people.</h3>
            <p>A little rivalry goes a long way.</p>
            <button
              onClick={() => {
                move("My leagues");
                open(data.user ? "createLeague" : "signin");
              }}
            >
              Start a private league <ArrowUpRight size={16} />
            </button>
          </div>
          <button className="side-help" onClick={() => open("rules")}>
            <HelpCircle size={18} /> The rules of the game{" "}
            <ArrowUpRight size={15} />
          </button>
          <button
            className="profile"
            onClick={() => open(data.user ? "profile" : "signin")}
          >
            <span className="avatar">
              {data.user ? data.user.name.slice(0, 2).toUpperCase() : "L"}
            </span>
            <span>
              <b>{data.user?.name || "Make yourself at home"}</b>
              <small>
                {data.user ? "Your simply predict account" : "Join the prediction club"}
              </small>
            </span>
            <Settings2 size={17} />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="header-left">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span className="crumb">The clubhouse</span>
            <ChevronRight size={13} />
            <b>{page}</b>
          </div>
          <div className="header-right">
            <button className="theme-switch" onClick={toggleTheme} aria-pressed={theme === "botb"}>
              <span className="theme-switch-dot" />
              {theme === "botb" ? "BOTB-inspired concept" : "simply predict · dark"}
            </button>
            <span className="demo-badge">
              <span /> DEMO SEASON
            </span>
            <button className="how-link" onClick={() => open("rules")}>
              How to play <ArrowUpRight size={15} />
            </button>
            <span className="header-divider" />
            <button
              className="icon-button notification"
              aria-label="Notifications"
              onClick={() => open("notifications")}
            >
              <Bell size={19} />
              <i />
            </button>
            <button
              className="header-avatar"
              aria-label={data.user ? "Your profile" : "Sign in"}
              onClick={() => open(data.user ? "profile" : "signin")}
            >
              {data.user ? data.user.name.slice(0, 1) : "P"}
            </button>
          </div>
        </header>
        <main id="main" className="main">
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={load}>Try again</button>
            </div>
          )}
          <div className="section-eyebrow">
            <span>
              <span className="live-dot" />{" "}
              {page === "Formula 1"
                ? "THE NEXT CHAPTER"
                : "FOOTBALL. FRIENDS. BRAGGING RIGHTS."}
            </span>
            <span className="season-meta">SEASON 2026 / 27</span>
          </div>
          {page === "Matchday" ? (
            <>
              <section className="hero" aria-labelledby="hero-title">
                <img
                  src="/images/stadium.jpg"
                  alt="A floodlit football stadium, ready for matchday"
                />
                <div className="hero-shade" />
                <div className="hero-content">
                  <span className="hero-eyebrow">
                    A GOOD WEEKEND STARTS WITH A HUNCH.
                  </span>
                  <h1 id="hero-title">
                    Your matchday.
                    <br />
                    Your <span>call.</span>
                  </h1>
                  <p>Six matches. Big opinions. Make yours count.</p>
                  <button
                    className="hero-link"
                    onClick={() =>
                      document
                        .getElementById("fixtures")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    Make your predictions <ArrowDown size={16} />
                  </button>
                </div>
                <div className="hero-stamp">
                  <span>THE WEEKEND</span>
                  <span className="stamp-star">✳</span>
                  <b>IS YOURS.</b>
                </div>
                <span className="photo-credit">
                  THE BEAUTIFUL GAME. A NEW PERSPECTIVE.
                </span>
              </section>
              <div className="matchday-ticker">
                <span className="ticker-round">
                  <span className="issue">11</span>
                  <span>
                    <b>{roundTitle}</b>
                    <small>SIX SELECTED FIXTURES · DEMO</small>
                  </span>
                </span>
                <span className="ticker-detail">
                  <Goal size={19} />
                  <span>
                    <b>6 matches</b>
                    <small>42 points up for grabs</small>
                  </span>
                </span>
                <span className="ticker-detail deadline">
                  <Clock3 size={19} />
                  <span>
                    <b>
                      {now < Date.parse(firstKickoff)
                        ? `First kick-off: ${new Date(firstKickoff).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`
                        : "Round in progress"}
                    </b>
                    <small>Each pick locks at kick-off · UK time</small>
                  </span>
                </span>
                <button
                  className="text-link ticker-help"
                  onClick={() => open("rules")}
                >
                  The scoring <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="content-columns">
                <section className="fixture-section" id="fixtures">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">
                        TRUST YOUR FOOTBALL BRAIN.
                      </span>
                      <h2>
                        Make your picks<span className="heading-dot">.</span>
                      </h2>
                    </div>
                    <span
                      className={`completion ${done === 6 ? "complete" : ""}`}
                    >
                      {done === 6 ? (
                        <CheckCheck size={15} />
                      ) : (
                        <span
                          className="progress-mini"
                          style={
                            {
                              "--progress": `${(done / 6) * 100}%`,
                            } as React.CSSProperties
                          }
                        />
                      )}{" "}
                      {done} / 6 complete
                    </span>
                  </div>
                  <div className="fixture-info">
                    <span>Predict the score. Pick who scores first.</span>
                    <span>
                      <span className="green-dot" />{" "}
                      {loading ? "Loading…" : saveState || "All to play for"}
                    </span>
                  </div>
                  <div className="fixtures-grid">
                    {fixtures.map((f, i) => (
                      <FixtureCard
                        key={f.id}
                        fixture={f}
                        index={i}
                        pick={picks[f.id] || emptyPick()}
                        onChange={(c) => update(f.id, c)}
                        locked={isLocked(f, now)}
                      />
                    ))}
                  </div>
                  <p className="data-note">
                    <span className="demo-dot" /> Illustrative fixtures for the
                    demo season. Not an official match schedule.
                  </p>
                </section>
                <aside className="right-rail">
                  <CompetitionResults compact />
                  <section className="league-promo">
                    <div className="mini-pitch" aria-hidden="true">
                      <div />
                      <span>YOU</span>
                      <span>THEM</span>
                    </div>
                    <span className="eyebrow">YOUR PEOPLE. YOUR LEAGUE.</span>
                    <h2>
                      Settle it
                      <br />
                      on the table.
                    </h2>
                    <p>
                      The group chat has opinions.
                      <br />
                      Time to put them to the test.
                    </p>
                    <button
                      onClick={() => {
                        move("My leagues");
                        open(data.user ? "createLeague" : "signin");
                      }}
                    >
                      Create a private league <ArrowUpRight size={17} />
                    </button>
                  </section>
                  <section className="points-note">
                    <span className="eyebrow">A LITTLE KNOW-HOW</span>
                    <h3>Every prediction counts.</h3>
                    <div>
                      <strong>5</strong>
                      <span>Exact score</span>
                      <b>PTS</b>
                    </div>
                    <div>
                      <strong>2</strong>
                      <span>Correct outcome</span>
                      <b>PTS</b>
                    </div>
                    <div>
                      <strong>+2</strong>
                      <span>First team to score</span>
                      <b>PTS</b>
                    </div>
                    <p>
                      Exact score or outcome points, plus your first-scorer
                      bonus. Simple.
                    </p>
                  </section>
                </aside>
              </div>
              <div className="submit-dock">
                <div className="dock-icon">
                  <Ticket size={23} />
                </div>
                <div className="dock-copy">
                  <b>
                    {receiptCurrent
                      ? "Your picks are in. Bring on matchday."
                      : done === 6
                        ? "Looking good. Ready to call it?"
                        : "A little instinct. A little football knowledge."}
                  </b>
                  <span>
                    {receiptCurrent
                      ? "You can edit until the first fixture kicks off."
                      : `${6 - done} ${6 - done === 1 ? "prediction" : "predictions"} to go. Your weekend starts here.`}
                  </span>
                </div>
                <div className="dock-progress">
                  <b>
                    {done}
                    <span> / 6</span>
                  </b>
                  <div>
                    {fixtures.map((f) => (
                      <i
                        key={f.id}
                        className={
                          picks[f.id] && validatePick(picks[f.id])
                            ? "filled"
                            : ""
                        }
                      />
                    ))}
                  </div>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    if (receiptCurrent) open("receipt");
                    else if (done !== 6) {
                      const f = fixtures.find(
                        (f) => !picks[f.id] || !validatePick(picks[f.id]),
                      );
                      document.getElementById(f!.id)?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      setToast(
                        "Choose a score and first-scoring team for each match.",
                      );
                    } else open(data.user ? "review" : "signin");
                  }}
                >
                  {receiptCurrent ? "View receipt" : "Review predictions"}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          ) : page === "Leaderboard" ? (
            <CompetitionResults />
          ) : page === "My leagues" ? (
            <>
              <PageTitle
                eyebrow="IT’S PERSONAL NOW"
                title="Your people. Your league."
                text="The office. The group chat. The family with very strong football opinions."
              />
              <div className="leagues-toolbar">
                <span>
                  {data.leagues.length} private{" "}
                  {data.leagues.length === 1 ? "league" : "leagues"}
                </span>
                <div>
                  <button
                    className="secondary"
                    onClick={() => open(data.user ? "joinLeague" : "signin")}
                  >
                    <Ticket size={17} />
                    Join with a code
                  </button>
                  <button
                    className="primary"
                    onClick={() => open(data.user ? "createLeague" : "signin")}
                  >
                    <Plus size={17} />
                    Create a league
                  </button>
                </div>
              </div>
              {data.leagues.length ? (
                <div className="league-grid">
                  {data.leagues.map((l) => (
                    <button
                      className="league-card"
                      key={l.id}
                      onClick={() => {
                        setLeague(l);
                        open("league");
                      }}
                    >
                      <span className="league-card-icon">
                        <Users size={27} />
                      </span>
                      <span className="eyebrow">PRIVATE LEAGUE</span>
                      <h2>{l.name}</h2>
                      <p>
                        {l.count} {l.count === 1 ? "member" : "members"} · Demo
                        season
                      </p>
                      <span className="league-card-bottom">
                        Open the clubhouse <ArrowUpRight size={19} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <section className="empty-leagues">
                  <div className="field-art">
                    <div className="field-mid" />
                    <span className="field-you">YOU</span>
                    <span className="field-mate one">?</span>
                    <span className="field-mate two">?</span>
                  </div>
                  <h2>Every great rivalry starts somewhere.</h2>
                  <p>
                    Create your own corner of simply predict, invite your friends,
                    <br />
                    and give the group chat something to talk about.
                  </p>
                  <button
                    className="primary"
                    onClick={() => open(data.user ? "createLeague" : "signin")}
                  >
                    Start your first league <ArrowUpRight size={17} />
                  </button>
                  <small>Free to create. Bragging rights included.</small>
                </section>
              )}
            </>
          ) : page === "Results" ? (
            <CompetitionResults />
          ) : (
            <><F1Game /><CompetitionResults initialSport="f1" /></>
          )}
          <footer className="footer">
            <span>
              <Mark />
              <span>For the love of the game.</span>
            </span>
            <div>
              <button onClick={() => open("about")}>About this demo</button>
              <button onClick={() => open("privacy")}>Privacy</button>
              <span>© 2026 simply predict</span>
            </div>
          </footer>
        </main>
      </div>
      <dialog
        aria-label="simply predict clubhouse dialog"
        ref={dialog}
        onCancel={() => setModal("")}
        onClick={(e) => {
          if (e.target === dialog.current) setModal("");
        }}
        className="modal"
      >
        <button
          className="modal-close icon-button"
          aria-label="Close dialog"
          onClick={() => setModal("")}
        >
          <X size={21} />
        </button>
        {modal === "rules" ? (
          <>
            <span className="modal-kicker">
              <Goal size={22} /> THE LUKE PLAYBOOK
            </span>
            <h2>
              Good instincts.
              <br />
              Simple rules.
            </h2>
            <p>
              For each of the six matches, predict the final score and which
              team scores first. Up to 42 points each round.
            </p>
            <div className="rule-row">
              <strong>5</strong>
              <div>
                <b>Nail the exact score.</b>
                <p>Get both sides of the scoreline right.</p>
              </div>
              <span>POINTS</span>
            </div>
            <div className="rule-row">
              <strong>2</strong>
              <div>
                <b>Call the right outcome.</b>
                <p>Correct winner or draw, if the score isn’t exact.</p>
              </div>
              <span>POINTS</span>
            </div>
            <div className="rule-row">
              <strong>+2</strong>
              <div>
                <b>Know who strikes first.</b>
                <p>Home, away, or neither for a 0–0.</p>
              </div>
              <span>POINTS</span>
            </div>
            <div className="modal-note">
              <Clock3 size={18} />
              <p>
                Each pick locks at its fixture’s kick-off. Full-round
                submissions close at the first kick-off. Exact-score and outcome
                points never stack.
              </p>
            </div>
            <p className="fine-print">
              Ties: most exact scores, then first-scorer hits, earliest last
              submission, and stable player ID. This demo uses example fixtures,
              not a live sports feed.
            </p>
            <button className="primary wide" onClick={() => setModal("")}>
              Got it. Let’s play. <ArrowRight size={17} />
            </button>
          </>
        ) : null}
        {modal === "signin" ? (
          <>
            <span className="modal-kicker">
              <Ticket size={24} /> YOUR SEAT IN THE CLUB
            </span>
            <h2>
              Big opinions?
              <br />
              You’re in good company.
            </h2>
            <p>
              Sign in to save your predictions, keep your receipts, and bring
              your people into a private league.
            </p>
            <a
              className="primary wide"
              href="/signin-with-chatgpt?return_to=/"
              target="_top"
            >
              Continue with ChatGPT <ArrowRight size={18} />
            </a>
            <form className="demo-login" onSubmit={demoLogin}>
              <strong>Presentation login</strong>
              <input aria-label="Demo username" placeholder="Username: hrisi, luke, or samo" value={field} onChange={(e) => setField(e.target.value)} />
              <input aria-label="Demo password" type="password" placeholder="Password: demo" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button className="secondary wide" disabled={busy}>Continue with demo account <ArrowRight size={18} /></button>
              {formError && <p role="alert" className="form-error">{formError}</p>}
            </form>
            <p className="fine-print">
              Use hrisi for CMS admin, luke for the player view, or samo for another player. ChatGPT sign-in remains available for platform integration.
            </p>
          </>
        ) : null}
        {modal === "review" ? (
          <>
            <span className="modal-kicker">
              <Ticket size={23} /> THE MOMENT OF TRUTH
            </span>
            <h2>Your weekend, on paper.</h2>
            <p>
              Give your picks one last look. You can update them before the
              deadline.
            </p>
            <div className="review-list">
              {fixtures.map((f) => (
                <div key={f.id}>
                  <span>
                    {f.home} <small>v</small> {f.away}
                  </span>
                  <b>
                    {picks[f.id]?.home}–{picks[f.id]?.away}
                  </b>
                  <small>
                    {picks[f.id]?.first === "NONE"
                      ? "No goals"
                      : picks[f.id]?.first === "HOME"
                        ? `${f.h} first`
                        : `${f.a} first`}
                  </small>
                </div>
              ))}
            </div>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <button className="primary wide" disabled={busy} onClick={submit}>
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Check size={17} />
              )}{" "}
              {busy ? "Submitting…" : "Submit my predictions"}
            </button>
            <p className="fine-print">
              Demo round · First lock:{" "}
              {new Date(firstKickoff).toLocaleString("en-GB", {
                timeZone: "Europe/London",
              })}{" "}
              UK time.
            </p>
          </>
        ) : null}
        {modal === "receipt" && data.receipt ? (
          <>
            <span className="receipt-icon">
              <CheckCheck size={32} />
            </span>
            <span className="modal-kicker">SIGNED. SEALED. MATCHDAY.</span>
            <h2>Your picks are in.</h2>
            <p>Now for the hard part: waiting for kick-off.</p>
            <div className="receipt-paper">
              <div className="receipt-header">
                <Mark />
                <span>
                  MATCHWEEK 11
                  <br />
                  DEMO SEASON
                </span>
              </div>
              {fixtures.map((f) => {
                const p = JSON.parse(data.receipt!.snapshot)[f.id];
                return (
                  <div className="receipt-pick" key={f.id}>
                    <span>
                      {f.h} — {f.a}
                    </span>
                    <b>
                      {p?.home} : {p?.away}
                    </b>
                    <small>
                      {p?.first === "NONE"
                        ? "NONE"
                        : p?.first === "HOME"
                          ? f.h
                          : f.a}{" "}
                      FIRST
                    </small>
                  </div>
                );
              })}
              <div className="receipt-code">
                <span>{data.receipt.receipt}</span>
                <button
                  className="icon-button"
                  aria-label="Copy receipt code"
                  onClick={() => copy(data.receipt!.receipt)}
                >
                  <Copy size={16} />
                </button>
              </div>
              <small>
                {new Date(data.receipt.submitted).toLocaleString("en-GB")} ·
                Saved to your account
              </small>
            </div>
            <button className="primary wide" onClick={() => setModal("")}>
              Bring on the weekend <ArrowRight size={17} />
            </button>
          </>
        ) : null}
        {["createLeague", "joinLeague", "profile"].includes(modal) ? (
          <>
            <span className="modal-kicker">
              <Users size={23} />{" "}
              {modal === "profile"
                ? "YOUR CORNER OF THE CLUB"
                : "A FRIENDLY LITTLE RIVALRY"}
            </span>
            <h2>
              {modal === "createLeague"
                ? "Make it personal."
                : modal === "joinLeague"
                  ? "Found your people?"
                  : "Hello, football fan."}
            </h2>
            <p>
              {modal === "createLeague"
                ? "Give your league a name. We’ll create a private invite code for your friends."
                : modal === "joinLeague"
                  ? "Enter the invite code from your league owner to join the action."
                  : "Choose the name your league mates will know you by."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form(modal);
              }}
            >
              <label className="form-label" htmlFor="modal-field">
                {modal === "joinLeague"
                  ? "Invite code"
                  : modal === "profile"
                    ? "Display name"
                    : "League name"}
              </label>
              <input
                autoFocus
                id="modal-field"
                className="text-input"
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder={
                  modal === "joinLeague"
                    ? "Paste your invite code"
                    : modal === "profile"
                      ? data.user?.name
                      : "e.g. The Sunday Regulars"
                }
                minLength={
                  modal === "joinLeague" ? 6 : modal === "profile" ? 2 : 3
                }
                maxLength={
                  modal === "joinLeague" ? 24 : modal === "profile" ? 32 : 40
                }
                required
              />
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <button className="primary wide" disabled={busy} type="submit">
                {busy
                  ? "Saving…"
                  : modal === "createLeague"
                    ? "Create my league"
                    : modal === "joinLeague"
                      ? "Join the league"
                      : "Save my profile"}
                <ArrowRight size={17} />
              </button>
            </form>
            {modal === "profile" && (
              <a
                className="signout"
                href="/signout-with-chatgpt?return_to=/"
                target="_top"
              >
                Sign out
              </a>
            )}
          </>
        ) : null}
        {modal === "league" && league ? (
          <>
            <span className="modal-kicker">
              <Users size={23} /> YOUR PRIVATE CLUBHOUSE
            </span>
            <h2>{league.name}</h2>
            <p>
              {league.count} {league.count === 1 ? "member" : "members"} ·
              Matchweek 11 · Demo season
            </p>
            <div className="invite-box">
              <span className="eyebrow">BRING YOUR PEOPLE</span>
              <p>
                Share this code. Friends can use “Join with a code” in My
                leagues.
              </p>
              <div>
                <code>{league.code}</code>
                <button
                  className="icon-button"
                  aria-label="Copy invite code"
                  onClick={() => copy(league.code)}
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>
            <div className="modal-note">
              <Clock3 size={20} />
              <p>
                Your league is ready. League standings will be available when
                the live scoring service is connected.
              </p>
            </div>
            <button
              className="primary wide"
              onClick={() => {
                setModal("");
                move("Matchday");
              }}
            >
              Make your matchday picks <ArrowRight size={17} />
            </button>
          </>
        ) : null}
        {modal === "notifications" ? (
          <>
            <span className="modal-kicker">
              <Bell size={22} /> FROM THE CLUBHOUSE
            </span>
            <h2>You’re all caught up.</h2>
            <div className="notification-card">
              <span className="green-dot" />
              <div>
                <b>Matchweek 11 is open.</b>
                <p>
                  Six demo fixtures are ready for your predictions. First
                  kick-off: 7 November, 12:30 UK time.
                </p>
              </div>
            </div>
            <p className="fine-print">
              Email and push reminders are not enabled in this preview.
            </p>
            <button
              className="primary wide"
              onClick={() => {
                setModal("");
                move("Matchday");
              }}
            >
              Go to matchday <ArrowRight size={17} />
            </button>
          </>
        ) : null}
        {modal === "league" && league && <CompetitionResults league={league.id} />}
        {modal === "about" ? (
          <>
            <span className="modal-kicker">
              <Mark />
            </span>
            <h2>For the love of the game.</h2>
            <p>
              simply predict is a prediction club for people who always have a feeling
              about the weekend.
            </p>
            <p>
              This working preview includes saved predictions, submission
              receipts, profiles, and private league membership. Results are entered by staff and submitted predictions determine the standings.
            </p>
            <p>
              Live sports data, native identity, partner SSO, client and
              platform consoles, payments, and production operations are still
              to be implemented. Formula 1 predictions use fictional demo
              entrants.
            </p>
            <p className="fine-print">
              Stadium photography: Unsplash. Team monograms are original
              abstract identifiers; no official team crests are used. No paid
              entry or prizes.
            </p>
          </>
        ) : null}
        {modal === "privacy" ? (
          <>
            <span className="modal-kicker">
              <LockKeyhole size={22} /> DEMO DATA & PRIVACY
            </span>
            <h2>Your game. Your data.</h2>
            <p>
              This preview stores your site-specific account ID, chosen display
              name, predictions, submission receipt, league membership, and
              basic action records in its database.
            </p>
            <p>
              Only your signed-in account can read or change your saved picks.
              Invite codes grant league membership, so share them only with the
              people you want to invite.
            </p>
            <p>
              No marketing emails or advertising trackers are enabled.
              Production retention policies and self-service deletion are not
              yet implemented. This notice describes the demo and is not a
              production privacy policy.
            </p>
          </>
        ) : null}
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function FixtureCard({
  fixture: f,
  index,
  pick: p,
  onChange,
  locked,
}: {
  fixture: Fixture;
  index: number;
  pick: Pick;
  onChange: (p: Partial<Pick>) => void;
  locked: boolean;
}) {
  const complete = validatePick(p);
  return (
    <article
      id={f.id}
      className={`fixture-card ${complete ? "is-complete" : ""} ${locked ? "is-locked" : ""}`}
    >
      <div className="fixture-top">
        <span className="fixture-number">
          {String(index + 1).padStart(2, "0")}
          <span className="fixture-top-rule" />{" "}
          {new Date(f.kickoff)
            .toLocaleDateString("en-GB", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              timeZone: "Europe/London",
            })
            .toUpperCase()}
        </span>
        <span>
          {locked ? (
            <>
              <LockKeyhole size={11} /> LOCKED
            </>
          ) : (
            <>
              {time(f.kickoff)} <span>UK</span>
            </>
          )}
          {complete && !locked && (
            <CheckCircle2 className="fixture-check" size={13} />
          )}
        </span>
      </div>
      <div className="match-score">
        <div className="team home">
          <Team code={f.h} color={f.hc} />
          <b>{f.home}</b>
          <small>{f.h}</small>
        </div>
        <div className="scoreframe">
          {(["home", "away"] as const).map((side) => (
            <div className="score-compartment" key={side}>
              <button
                aria-label={`Increase ${side === "home" ? f.home : f.away} score`}
                disabled={locked || p[side] >= 20}
                onClick={() => onChange({ [side]: p[side] + 1 })}
              >
                <Plus size={13} />
              </button>
              <input
                aria-label={`${side === "home" ? f.home : f.away} predicted goals`}
                type="number"
                inputMode="numeric"
                min="0"
                max="20"
                value={p[side]}
                disabled={locked}
                onChange={(e) =>
                  onChange({
                    [side]: Math.max(
                      0,
                      Math.min(20, Math.floor(Number(e.target.value) || 0)),
                    ),
                  })
                }
              />
              <button
                aria-label={`Decrease ${side === "home" ? f.home : f.away} score`}
                disabled={locked || p[side] <= 0}
                onClick={() => onChange({ [side]: p[side] - 1 })}
              >
                <Minus size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="team away">
          <Team code={f.a} color={f.ac} />
          <b>{f.away}</b>
          <small>{f.a}</small>
        </div>
      </div>
      <p className="winner-summary">
        Predicted outcome:{" "}
        <b>{p.home === p.away ? "Draw" : p.home > p.away ? f.home : f.away}</b>
        <small>From your scoreline · 2 pts if not exact</small>
      </p>
      <div className="first-scorer">
        <div>
          <span>WHO SCORES FIRST?</span>
          <span>+2 PTS</span>
        </div>
        <div className="first-options">
          {(
            [
              { key: "HOME", label: f.h },
              { key: "NONE", label: "Neither" },
              { key: "AWAY", label: f.a },
            ] as const
          ).map((x) => (
            <button
              key={x.key}
              disabled={
                locked ||
                (x.key === "HOME" && p.home === 0) ||
                (x.key === "AWAY" && p.away === 0) ||
                (x.key === "NONE" && (p.home > 0 || p.away > 0))
              }
              aria-pressed={p.first === x.key}
              aria-label={`${x.key === "HOME" ? f.home : x.key === "AWAY" ? f.away : "Neither team"} scores first`}
              className={p.first === x.key ? "selected" : ""}
              onClick={() => onChange({ first: x.key })}
            >
              {p.first === x.key && <Check size={12} />} {x.label}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
