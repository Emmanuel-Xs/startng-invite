# start.ng friend invite: whimsy demo

An HNG15 (Week 5) design demo of start.ng's friend invite page. **Mock data only**: no backend, no API calls.

The UI, styles, top bar, theme toggle, character code and 3D face snapshots are copied from
[`Cybertron-HNG/startng-fe`](https://github.com/Cybertron-HNG/startng-fe), which was used read-only as the source.
Nothing here is a change to that repo. The design is described in [`INVITE_SPEC.md`](./INVITE_SPEC.md).

## The idea

When someone sends you an invite, their character is waiting with a seat saved next to them. Tap **Accept** and your
character hops along the dotted line into the spot beside them, and the two of you become friends.

- Page opens: calm. Ada pops in, waves once, the dotted line draws to your seat (under a second).
- Accept: the hop, a single bump, the dotted line turns solid lime, a "Friends" tag pops, a small burst of lime dots. About 1.2s, then still.
- Motion is transform, opacity and `stroke-dashoffset` only. Nothing loops.
- Reduced motion (the system setting, or the demo's "Preview reduced motion") shows every state's final picture instantly.

## Routes

- `/f/demo1234`: the invite (`/` and unknown paths go here)
- `/f/expired1`: the expired link

Demo controls above the card: **View as** Guest, Signed in, Inviter (own link) · **Expired link** · **Replay** · **Preview reduced motion**.
In the Guest view, "Sign in to accept" signs you in (mock) so you can walk the whole story.

## Run it

```bash
npm install
npm run dev
npx tsc --noEmit && npm run build
```

Vite + React 18 + TypeScript + `three` 0.185.1 (the same versions as startng-fe). Plain CSS, no UI library.

## Where things are

- `src/invite/Bench.tsx`, `src/invite/invite.css`: the two seats, the line and all the motion
- `src/invite/InvitePage.tsx`: the page (starting point: startng-fe's `InvitePage.tsx`, same words, buttons and states)
- `src/mock.ts`: Ada, you, and the accept call (400ms)
- `src/Avatar.tsx`: startng-fe's `AvatarFace` plus a size left to CSS, an `onReady` callback and the `.avatar` letter fallback when WebGL fails
