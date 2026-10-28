import { useEffect, useState } from "react";
import { AvatarFace } from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import InvitePage from "./invite/InvitePage";
import { ADA, EXPIRED_CODE, INVITE_CODE, YOU, displayName, type Player } from "./mock";

type Viewer = "guest" | "signed" | "inviter";
const VIEWERS: [Viewer, string][] = [["guest", "Guest"], ["signed", "Signed in"], ["inviter", "Inviter (own link)"]];
const USERS: Record<Viewer, Player | null> = { guest: null, signed: YOU, inviter: ADA };

const inviteCode = (path: string) => path.match(/^\/f\/([^/]+)\/?$/)?.[1] ?? null;

/** Two routes, no router library: /f/demo1234 (the invite) and /f/expired1 (the dead link). Anything else goes to the first. */
function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    if (inviteCode(path)) return;
    window.history.replaceState(null, "", `/f/${INVITE_CODE}`);
    setPath(`/f/${INVITE_CODE}`);
  }, [path]);
  const go = (to: string) => {
    if (to === window.location.pathname) return;
    window.history.pushState(null, "", to);
    setPath(to);
  };
  return [path, go] as const;
}

/** The system's reduced-motion setting, kept up to date. */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduce;
}

export default function App() {
  const [path, go] = usePath();
  const [viewer, setViewer] = useState<Viewer>("guest");
  const [replay, setReplay] = useState(0);
  const [previewReduced, setPreviewReduced] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduced = usePrefersReducedMotion() || previewReduced;

  const code = inviteCode(path);
  if (!code) return null;
  const expired = code === EXPIRED_CODE;
  const user = USERS[viewer];

  return (
    <>
      <header className={menuOpen ? "container nav open" : "container nav"}>
        <a className="logo" href="https://start.ng"><b>start<span>.ng</span></b></a>
        <nav id="pages-menu" aria-label="Pages">
          <a href="https://start.ng/games">Games</a>
          <a href="https://start.ng/tournament">Tournament</a>
          <a href="https://start.ng/creators">Creators</a>
          <a href="https://start.ng/docs">Docs</a>
          <ThemeToggle withLabel />
        </nav>
        <div className="nav-account">
          <button type="button" className="nav-menu-btn" aria-label={menuOpen ? "Close menu" : "Menu"} aria-expanded={menuOpen} aria-controls="pages-menu" onClick={() => setMenuOpen((o) => !o)}>
            <span aria-hidden="true" className="nav-menu-icon" /><span className="nav-menu-text">Menu</span>
          </button>
          <ThemeToggle />
          {user ? (
            <div className="me" title={displayName(user)}><AvatarFace style={user.character!.style} size={36} letter={displayName(user)} /></div>
          ) : (
            <button className="nav-signin" onClick={() => setViewer("signed")}>Sign in</button>
          )}
        </div>
      </header>

      <main>
        <div className="container demo"><section className="demo-controls" aria-label="Demo controls">
          <p className="eyebrow">Demo controls</p>
          <div className="demo-row" role="group" aria-label="View as">
            <span className="demo-label">View as</span>
            {VIEWERS.map(([id, label]) => (
              <button key={id} type="button" className={`ghost${!expired && viewer === id ? " on" : ""}`} aria-pressed={!expired && viewer === id}
                onClick={() => { setViewer(id); go(`/f/${INVITE_CODE}`); }}>{label}</button>
            ))}
          </div>
          <div className="demo-row">
            <button type="button" className={`ghost${expired ? " on" : ""}`} aria-pressed={expired} onClick={() => go(`/f/${EXPIRED_CODE}`)}>Expired link</button>
            <button type="button" className="ghost" onClick={() => setReplay((n) => n + 1)}>Replay</button>
            <button type="button" className={`ghost${previewReduced ? " on" : ""}`} aria-pressed={previewReduced} onClick={() => setPreviewReduced((r) => !r)}>Preview reduced motion</button>
          </div>
        </section></div>

        <InvitePage key={`${code}:${replay}`} user={user} onSignIn={() => setViewer("signed")} code={code} reduced={reduced} />
      </main>
    </>
  );
}
