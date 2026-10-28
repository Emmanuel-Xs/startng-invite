import { useEffect, useRef, useState } from "react";
import { DressedStyle } from "./character";

/** The character's 3D face in a circle, for the top bar and menu.
 *  Demo changes: `size` can be left to CSS, `onReady` says when the face (or its fallback) is showing, and when WebGL
 *  fails the start.ng `.avatar` circle with the first `letter` is drawn instead. */
export function AvatarFace({ style, size, letter = "?", onReady }: { style: DressedStyle; size?: number; letter?: string; onReady?: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    let live = true;
    setFailed(false);
    // three.js loads only when a face is first needed.
    import("./three/snapshot")
      .then((m) => live && setSrc(m.faceImage(style)))
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [style]);
  useEffect(() => {
    if (src || failed) ready.current?.();
  }, [src, failed]);
  const box = size ? { width: size, height: size } : undefined;
  if (failed) return <span className="avatar" style={box}>{letter.slice(0, 1).toUpperCase()}</span>;
  return (
    <span className="avatar-face" style={box}>
      {src && <img src={src} alt="" width={size} height={size} />}
    </span>
  );
}
