import { useEffect, useId, useState } from "react";
import { AvatarFace } from "../Avatar";
import { displayName, type Player } from "../mock";

/** Which picture the bench shows: a guest, a signed-in friend, the inviter on their own link, or a stale link. */
export type BenchMode = "guest" | "signed" | "own" | "expired";

type Props = {
  inviter: Player;
  /** The signed-in visitor, when they are not the inviter. */
  you: Player | null;
  mode: BenchMode;
  /** Accept was tapped and the call is in flight. */
  busy: boolean;
  /** The call came back: the hop, the bump and the lime line play. */
  accepted: boolean;
  /** Copy link was tapped: the empty seat nudges (the number counts the taps). */
  nudge: number;
};

/** The two seats, the dotted line between them and everything that happens to them (see INVITE_SPEC.md, section 4).
 *  It is decorative: the h1, the note and the buttons carry all the meaning. */
export default function Bench({ inviter, you, mode, busy, accepted, nudge }: Props) {
  const reveal = useId().replace(/:/g, "");
  const [ready, setReady] = useState(false); // the inviter's face is showing: the opening can start
  const [youReady, setYouReady] = useState(false);

  // If the face never comes (a slow network), open the page anyway.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const expired = mode === "expired";
  const phase = accepted ? "accepted" : busy ? "busy" : "idle";
  const hasFace = mode === "signed" && !!you;
  const dotted = expired ? [[0, 40], [60, 100]] : [[0, 100]];

  return (
    <div className="bench" aria-hidden="true" data-mode={mode} data-phase={phase} data-ready={ready}>
      <svg className="bench-line" focusable="false">
        <defs>
          <mask id={reveal} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            {dotted.map(([from, to]) => (
              <line key={from} className="bench-line-reveal" x1={`${from}%`} x2={`${to}%`} y1="50%" y2="50%" pathLength={1} />
            ))}
          </mask>
        </defs>
        <line className="bench-line-dots" x1="0" x2="100%" y1="50%" y2="50%" mask={`url(#${reveal})`} />
      </svg>

      <div className={`bench-slot ${nudge % 2 ? "nudge-a" : nudge ? "nudge-b" : ""}`}>
        <svg className="bench-silhouette" viewBox="0 0 96 96" focusable="false" data-on={mode === "guest"}>
          <circle cx="48" cy="38" r="15" />
          <path d="M18 96c0-18 13-28 30-28s30 10 30 28z" />
        </svg>
        <span className="bench-q" data-on={mode === "own" || expired}>?</span>
      </div>

      <div className="bench-seat bench-seat--ada">
        <div className="bench-hop">
          <div className="bench-pop">
            <div className="bench-bob">
              <AvatarFace style={inviter.character!.style} letter={displayName(inviter)} onReady={() => setReady(true)} />
              {expired && (
                <svg className="bench-eyes" viewBox="0 0 96 96" focusable="false">
                  <path d="M32 53.5q4 3.5 8 0M49.5 53.5q4 3.5 8 0" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {hasFace && (
        <div className="bench-seat bench-seat--you" data-ready={youReady}>
          <div className="bench-hop">
            <div className="bench-pop">
              <div className="bench-bob">
                <AvatarFace key={you.id} style={you.character!.style} letter={displayName(you)} onReady={() => setYouReady(true)} />
              </div>
            </div>
          </div>
        </div>
      )}

      <svg className="bench-link" focusable="false">
        <line className="bench-link-edge" x1="0" x2="100%" y1="50%" y2="50%" pathLength={1} />
        <line className="bench-link-fill" x1="0" x2="100%" y1="50%" y2="50%" pathLength={1} />
      </svg>

      <div className="bench-tag"><span className="tag">Friends</span></div>
      <div className="bench-burst">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div>
      {expired && <span className="bench-z">z</span>}
    </div>
  );
}
