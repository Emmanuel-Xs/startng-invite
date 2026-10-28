// The accept moment: "Squish hug + selfie" from accept-reference.html (its k === "combo" block), copied step for step.
// Web Animations API on nested wrappers per face (x moves, y lifts, s squashes and tilts), so the three never fight over
// one transform. It plays once and nothing loops. With reduced motion every step jumps to its last frame.

export const F = 84; // the face's size in px: the offsets below are measured from it
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const POP = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export type Face = { x: HTMLElement; y: HTMLElement; s: HTMLElement };
export type Parts = {
  stage: HTMLElement;
  ada: Face;
  you: Face;
  chip: HTMLElement;
  line: Element;
  slot: HTMLElement;
  polaroid: HTMLElement;
  caption: HTMLElement;
  flash: HTMLElement;
};

/** Animate, or jump straight to the last frame when motion is reduced. */
function go(target: Element, frames: Keyframe[], opts: KeyframeAnimationOptions, reduced: boolean) {
  if (reduced) return target.animate([frames[frames.length - 1]], { duration: 1, fill: "forwards" });
  return target.animate(frames, { fill: "forwards", ...opts });
}
/** After every step the sequence checks it was not cancelled meanwhile. A reset can remove a face from the page, which
 *  leaves its animation to finish on its own, and a pause is a timer; neither would stop the steps that follow. */
const stopIfCancelled = (signal: AbortSignal) => {
  if (signal.aborted) throw new DOMException("cancelled", "AbortError");
};
const wait = (ms: number, reduced: boolean, signal: AbortSignal) =>
  (reduced ? Promise.resolve() : new Promise<void>((r) => setTimeout(r, ms))).then(() => stopIfCancelled(signal));

function burst(stage: HTMLElement, x: number, y: number, n: number, reduced: boolean) {
  if (reduced) return;
  for (let i = 0; i < n; i++) {
    const d = document.createElement("i");
    d.className = "bench-spark";
    d.style.left = x - 4.5 + "px";
    d.style.top = y - 4.5 + "px";
    stage.append(d);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, r = 38 + Math.random() * 26, sc = 0.6 + Math.random() * 0.6;
    d.animate(
      [
        { transform: "translate(0,0) scale(.3)", opacity: 1 },
        { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) scale(${sc})`, opacity: 1, offset: 0.7 },
        { transform: `translate(${Math.cos(a) * r * 1.15}px,${Math.sin(a) * r * 1.15 + 6}px) scale(0)`, opacity: 0 },
      ],
      { duration: 720, easing: EASE_OUT },
    ).finished.then(() => d.remove(), () => d.remove());
  }
}

function popChip(chip: HTMLElement, reduced: boolean) {
  return go(chip, [{ opacity: 0, transform: "translate(-50%, 8px) scale(.85)" }, { opacity: 1, transform: "translate(-50%, 0) scale(1)" }], { duration: 320, easing: POP }, reduced);
}

/** Resolves when the sequence has finished. Rejects if it is cancelled part way (the page was reset). */
export async function playAccept(p: Parts, reduced: boolean, signal: AbortSignal): Promise<void> {
  const { stage, ada, you, chip, line, slot, polaroid, caption, flash } = p;
  const W = stage.clientWidth, H = stage.clientHeight, cy = H / 2;
  const adaCX = W * 0.22, youCX = W * 0.78;
  const tA = W / 2 - F * 0.44 - adaCX, tY = W / 2 + F * 0.44 - youCX;
  const g = (t: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) => go(t, frames, opts, reduced);
  const done = (a: Animation) => a.finished.then(() => stopIfCancelled(signal));

  // the dotted line and the empty seat let go, and you stop being faded
  g(line, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
  g(slot, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
  g(you.x, [{ opacity: 0.55 }, { opacity: 1 }], { duration: 200 });

  // anticipation: lean back
  g(ada.x, [{ transform: "none" }, { transform: "translateX(-12px)" }], { duration: 170, easing: EASE_OUT });
  g(ada.s, [{ transform: "none" }, { transform: "rotate(-6deg) scale(.95)" }], { duration: 170, easing: EASE_OUT });
  g(you.s, [{ transform: "none" }, { transform: "rotate(6deg) scale(.95)" }], { duration: 170, easing: EASE_OUT });
  await done(g(you.x, [{ transform: "none", opacity: 1 }, { transform: "translateX(12px)", opacity: 1 }], { duration: 170, easing: EASE_OUT }));
  // rush together
  g(ada.x, [{ transform: "translateX(-12px)" }, { transform: `translateX(${tA}px)` }], { duration: 230, easing: "cubic-bezier(.6,0,.5,1)" });
  await done(g(you.x, [{ transform: "translateX(12px)", opacity: 1 }, { transform: `translateX(${tY}px)`, opacity: 1 }], { duration: 230, easing: "cubic-bezier(.6,0,.5,1)" }));
  // squash on contact, then lean in for the photo
  burst(stage, W / 2, cy - 10, 10, reduced);
  g(ada.s, [{ transform: "scale(.84,1.12)" }, { transform: "scale(1.06,.96)", offset: 0.55 }, { transform: "rotate(6deg)" }], { duration: 420, easing: EASE_OUT });
  await done(g(you.s, [{ transform: "scale(.84,1.12)" }, { transform: "scale(1.06,.96)", offset: 0.55 }, { transform: "rotate(-6deg)" }], { duration: 420, easing: EASE_OUT }));
  await wait(140, reduced, signal);
  // flash and the polaroid
  if (!reduced) flash.animate([{ opacity: 0 }, { opacity: 0.92, offset: 0.2 }, { opacity: 0 }], { duration: 300, easing: "ease-out" });
  await wait(70, reduced, signal);
  g(polaroid, [{ opacity: 0, transform: "scale(1.14) rotate(0deg)" }, { opacity: 1, transform: "scale(1) rotate(-3deg)" }], { duration: 420, easing: POP });
  for (const f of [ada, you]) g(f.y, [{ transform: "none" }, { transform: "translateY(-12px)" }], { duration: 420, easing: EASE_OUT });
  g(ada.s, [{ transform: "rotate(6deg)" }, { transform: "rotate(-1deg)" }], { duration: 420, easing: EASE_OUT });
  await done(g(you.s, [{ transform: "rotate(-6deg)" }, { transform: "rotate(-5deg)" }], { duration: 420, easing: EASE_OUT }));
  g(caption, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
  popChip(chip, reduced);
}

/** Puts everything back as it was before the sequence (a reset, or a different visitor). */
export function resetAccept(stage: HTMLElement) {
  stage.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  stage.querySelectorAll(".bench-spark").forEach((n) => n.remove());
}
