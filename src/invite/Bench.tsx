import { useEffect, useId, useRef } from "react";
import { AvatarFace } from "../Avatar";
import { displayName, type Player } from "../mock";
import { playAccept, resetAccept } from "./accept";

/** Which picture the bench shows: a guest, a signed-in friend, the inviter on their own link, or a dead link. */
export type BenchMode = "guest" | "signed" | "own" | "expired";

type Props = {
  /** Who sent the invite. Null for a dead link: the real API says nothing about the inviter. */
  inviter: Player | null;
  /** The signed-in visitor, when they are not the inviter. */
  you: Player | null;
  mode: BenchMode;
  /** The accept call came back: the sequence plays once. */
  accepted: boolean;
  /** Reduced motion: the sequence jumps to its last frame. */
  reduced: boolean;
  /** Called when the sequence has finished (straight away with reduced motion). */
  onDone: () => void;
  /** Copy link was tapped: the empty seat nudges (the number counts the taps). */
  nudge: number;
};

/** The wrappers one face moves through: x slides, y lifts, s squashes and tilts. Each owns one transform. */
const useFace = () => ({ x: useRef<HTMLDivElement>(null), y: useRef<HTMLDivElement>(null), s: useRef<HTMLDivElement>(null) });

const today = () => new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** The two seats, the dotted line between them and everything that happens to them (see INVITE_SPEC.md, section 4).
 *  It is decorative: the h1, the note and the buttons carry all the meaning. */
export default function Bench({ inviter, you, mode, accepted, reduced, onDone, nudge }: Props) {
  const reveal = useId().replace(/:/g, "");
  const stage = useRef<HTMLDivElement>(null);
  const ada = useFace();
  const youFace = useFace();
  const line = useRef<SVGSVGElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const polaroid = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLSpanElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const latest = useRef({ reduced, onDone });
  latest.current = { reduced, onDone };

  const expired = mode === "expired";
  const hasYou = mode === "signed" && !!you;

  // Play the accept sequence once when the call comes back; put everything back if the page is reset.
  useEffect(() => {
    if (!accepted || !ada.x.current || !youFace.x.current) return;
    let live = true;
    const box = stage.current!;
    playAccept(
      {
        stage: box, chip: chip.current!, slot: slot.current!, polaroid: polaroid.current!, caption: caption.current!, flash: flash.current!, line: line.current!,
        ada: { x: ada.x.current, y: ada.y.current!, s: ada.s.current! }, you: { x: youFace.x.current, y: youFace.y.current!, s: youFace.s.current! },
      },
      latest.current.reduced,
    ).then(() => live && latest.current.onDone(), () => {});
    return () => { live = false; resetAccept(box); };
  }, [accepted]); // eslint-disable-line react-hooks/exhaustive-deps

  const dotted = expired ? [[0, 40], [60, 100]] : [[0, 100]];
  const seat = (p: Player, refs: ReturnType<typeof useFace>, cls: string) => (
    <div className={`bench-seat ${cls}`} ref={refs.x}>
      <div className="bench-y" ref={refs.y}>
        <div className="bench-s" ref={refs.s}>
          <div className="bench-pop">
            <div className="bench-bob">
              <AvatarFace style={p.character!.style} letter={displayName(p)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bench" ref={stage} aria-hidden="true" data-mode={mode}>
      <svg className="bench-line" ref={line} focusable="false">
        <defs>
          <mask id={reveal} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            {dotted.map(([from, to]) => (
              <line key={from} className="bench-line-reveal" x1={`${from}%`} x2={`${to}%`} y1="50%" y2="50%" pathLength={1} />
            ))}
          </mask>
        </defs>
        <line className="bench-line-dots" x1="0" x2="100%" y1="50%" y2="50%" mask={`url(#${reveal})`} />
      </svg>

      {expired && <div className="bench-slot bench-slot--left"><span className="bench-z">z</span></div>}
      <div className={`bench-slot bench-slot--right ${nudge % 2 ? "nudge-a" : nudge ? "nudge-b" : ""}`} ref={slot}>
        <svg className="bench-silhouette" viewBox="0 0 96 96" focusable="false" data-on={mode === "guest"}>
          <circle cx="48" cy="38" r="15" />
          <path d="M18 96c0-18 13-28 30-28s30 10 30 28z" />
        </svg>
        <span className="bench-q" data-on={mode === "own"}>?</span>
        {expired && <span className="bench-z">z</span>}
      </div>

      {inviter && seat(inviter, ada, "bench-seat--ada")}
      {hasYou && seat(you, youFace, "bench-seat--you")}

      <div className="bench-polaroid" ref={polaroid}>
        <span ref={caption}>{inviter && you ? `${displayName(inviter)} + ${displayName(you)} · ${today()}` : ""}</span>
      </div>
      <div className="bench-flash" ref={flash} />
      <span className="bench-chip" ref={chip}>+1 friend</span>
    </div>
  );
}
