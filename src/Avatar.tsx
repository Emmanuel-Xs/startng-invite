import { useEffect, useState } from "react";
import { DressedStyle } from "./character";

/** The character's 3D face in a circle, for the top bar and menu.
 *  Demo changes: `size` can be left to CSS; start.ng's `.avatar` circle (lime, the first `letter`) shows right away and
 *  fades out when the face is ready; and when WebGL fails the `.avatar` circle simply stays. */
export function AvatarFace({ style, size, letter = "?" }: { style: DressedStyle; size?: number; letter?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setFailed(false);
    // three.js starts loading with the page (main.tsx); this waits for it if it hasn't arrived.
    import("./three/snapshot")
      .then((m) => live && setSrc(m.faceImage(style)))
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [style]);
  const box = size ? { width: size, height: size } : undefined;
  const initial = letter.slice(0, 1).toUpperCase();
  if (failed) return <span className="avatar" style={box}>{initial}</span>;
  return (
    <span className="avatar-swap" style={box}>
      <span className="avatar-face">{src && <img src={src} alt="" width={size} height={size} />}</span>
      <span className="avatar" data-gone={!!src}>{initial}</span>
    </span>
  );
}
