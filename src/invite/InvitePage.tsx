import { useCallback, useEffect, useRef, useState } from "react";
import { acceptInvite, displayName, FollowsError, previewInvite, type InvitePreview, type Player } from "../mock";
import Bench, { type BenchMode } from "./Bench";
import "./follows.css";
import "./invite.css";

type Props = {
  user: Player | null;
  onSignIn: () => void;
  code: string;
  /** The visitor wants less motion (their system setting, or the demo's preview): every state shows its final picture. */
  reduced: boolean;
};

/** start.ng/f/<code>: someone's invite link. Accepting makes you friends (you both follow each other).
 *  Same states and buttons as the real page; the words and the picture above them are new (see the README). */
export default function InvitePage({ user, onSignIn, code, reduced }: Props) {
  const [invite, setInvite] = useState<InvitePreview | null | undefined>(undefined); // null: no such link (or expired)
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [landed, setLanded] = useState(false); // the call came back: the sequence is playing
  const [done, setDone] = useState(false); // the sequence has finished: the words change
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const finished = useCallback(() => setDone(true), []);

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setNudge((n) => n + 1);
    setCopied(true);
    timers.current.push(window.setTimeout(() => setCopied(false), 2000));
  }

  const motion = reduced ? "off" : "on";
  // The demo has no other pages: these links stay where they are.
  const inert = (e: React.MouseEvent) => e.preventDefault();

  if (invite === undefined && !error) return <section className="container follows-page"><p className="board-sub">Loading...</p></section>;
  if (invite === null) {
    return (
      <section className="container follows-page">
        <div className="follows-invite-card" data-motion={motion}>
          <Bench inviter={null} you={null} mode="expired" accepted={false} reduced={reduced} onDone={finished} nudge={0} />
          <h1>This invite has expired</h1>
          <p className="note">Invite links only last a while. Ask your friend to send a new one, or <a href="/follows" onClick={inert}>get your own link</a> to share.</p>
        </div>
      </section>
    );
  }
  if (!invite) return <section className="container follows-page"><p className="error">{error}</p></section>;

  const inviter = invite.inviter;
  const name = displayName(inviter);
  const own = user?.id === inviter.id;
  const mode: BenchMode = own ? "own" : user ? "signed" : "guest";
  const heading = own ? "This is your invite link" : done ? `You and ${name} are friends` : `${name} saved you a seat`;
  return (
    <section className="container follows-page">
      <div className="follows-invite-card" data-motion={motion}>
        <Bench inviter={inviter} you={own ? null : user} mode={mode} accepted={landed} reduced={reduced} onDone={finished} nudge={nudge} />
        <h1 aria-live="polite"><span key={heading} className={done ? "swap" : undefined}>{heading}</span></h1>
        {own ? (
          <>
            <p className="note">Send it to a friend. Whoever accepts takes the empty seat and becomes your friend.</p>
            <button type="button" className="ghost" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button>
          </>
        ) : done ? (
          <p className="note swap">You follow each other now. Look for {name} on the friends board next time you play. <a href="/follows" onClick={inert}>See your friends</a></p>
        ) : (
          <>
            <p className="note">Accept and you'll follow each other. You'll see each other on friends' leaderboards and can play in the same crews.</p>
            <button type="button" disabled={busy || landed} onClick={accept}>{!user ? "Sign in to accept" : busy || landed ? "Accepting..." : "Accept"}</button>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
