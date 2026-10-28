import { useEffect, useRef, useState } from "react";
import { acceptInvite, ADA, displayName, FollowsError, previewInvite, type InvitePreview, type Player } from "../mock";
import Bench, { type BenchMode } from "./Bench";
import "./follows.css";
import "./invite.css";

/** How long after the hop starts the faces land, so the words change on the landing and not before it. */
const LAND_MS = 480;

type Props = {
  user: Player | null;
  onSignIn: () => void;
  code: string;
  /** The visitor wants less motion (their system setting, or the demo's preview): every state shows its final picture. */
  reduced: boolean;
};

/** start.ng/f/<code>: someone's invite link. Accepting makes you friends (you both follow each other).
 *  The words, buttons and states are the real page's; only the picture above the h1 is new (the bench). */
export default function InvitePage({ user, onSignIn, code, reduced }: Props) {
  const [invite, setInvite] = useState<InvitePreview | null | undefined>(undefined); // null: no such link (or expired)
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [landed, setLanded] = useState(false); // the picture: the two faces are together
  const [done, setDone] = useState(false); // the words: you are friends
  const [nudge, setNudge] = useState(0);
  const [copied, setCopied] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    previewInvite(code)
      .then(setInvite)
      .catch((e) => (e instanceof FollowsError && e.status === 404 ? setInvite(null) : setError("Couldn't load this invite. Try again in a moment.")));
  }, [code]);

  // Signing out or changing who is looking starts the page over.
  useEffect(() => {
    setBusy(false);
    setLanded(false);
    setDone(false);
  }, [user?.id]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function accept() {
    if (!user) return onSignIn();
    setBusy(true);
    setError("");
    try {
      await acceptInvite(code);
      setLanded(true);
      if (reduced) setDone(true);
      else timers.current.push(window.setTimeout(() => setDone(true), LAND_MS));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setNudge((n) => n + 1);
    setCopied(true);
    timers.current.push(window.setTimeout(() => setCopied(false), 1600));
  }

  const motion = reduced ? "off" : "on";
  // The demo has no other pages: these links stay where they are.
  const inert = (e: React.MouseEvent) => e.preventDefault();

  if (invite === undefined && !error) return <section className="container follows-page"><p className="board-sub">Loading...</p></section>;
  if (invite === null) {
    return (
      <section className="container follows-page">
        {/* The real API sends no inviter for a dead link; the design shows the friend who sent it, asleep. */}
        <div className="follows-invite-card" data-motion={motion}>
          <Bench inviter={ADA} you={null} mode="expired" busy={false} accepted={false} nudge={0} />
          <p className="empty">This invite link has expired or doesn't exist. Ask your friend for a new one, or <a href="/follows" onClick={inert}>get your own link</a>.</p>
        </div>
      </section>
    );
  }
  if (!invite) return <section className="container follows-page"><p className="error">{error}</p></section>;

  const inviter = invite.inviter;
  const name = displayName(inviter);
  const own = user?.id === inviter.id;
  const mode: BenchMode = own ? "own" : user ? "signed" : "guest";
  const heading = done ? `You and ${name} are friends` : `${name} wants to be friends on start.ng`;
  return (
    <section className="container follows-page">
      <div className="follows-invite-card" data-motion={motion}>
        <Bench inviter={inviter} you={own ? null : user} mode={mode} busy={busy} accepted={landed} nudge={nudge} />
        <h1 aria-live="polite"><span key={heading} className={done ? "swap" : undefined}>{heading}</span></h1>
        {own ? (
          <>
            <p className="note">This is your own invite link. Send it to a friend: anyone who accepts it becomes your friend.</p>
            <button type="button" className="ghost" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button>
          </>
        ) : done ? (
          <p className="ok swap">You now follow each other. <a href="/follows" onClick={inert}>See your friends</a></p>
        ) : (
          <>
            <p className="note">Friends follow each other, so you can see each other on friends' leaderboards and in crews.</p>
            <button type="button" disabled={busy || landed} onClick={accept}>{!user ? "Sign in to accept" : busy || landed ? "..." : "Accept"}</button>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
