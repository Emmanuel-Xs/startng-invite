# Friend Invite Whimsy: spec

HNG15 Week 5, individual task 2 (whimsical design). Author: 99plusOne (Team Vulcan).
Delivery: a standalone demo repo `Emmanuel-Xs/startng-invite`, live on Vercel. Mock data only, no backend, no PR to `Cybertron-HNG/startng-fe`.
`Cybertron-HNG/startng-fe` is used read only as the style and code reference.

## 1. The idea in one line

When someone sends you a start.ng invite, their character is waiting with a spot saved next to them. Tap Accept and your character hops into that spot, and the two of you become friends.

## 2. Why this page

- Almost nobody will redesign it. Others took the homepage, the tournament page and the "Got a game?" section.
- It is a rare, emotional moment (you see it once per invite), which is exactly where delight belongs.
- It is `noindex` in `src/seo.ts` (`PAGES.friendInvite`), so it is outside the "Google must see the same page" rule in `AGENTS.md`. Animating it can't hurt SEO.
- It uses start.ng's own characters, so the whimsy belongs to start.ng and nobody else.

## 3. The real page today (reference: `src/features/follows/InvitePage.tsx`)

Route `start.ng/f/<code>`. One centred card (`.follows-invite-card`): the inviter's `AvatarFace` (96px), an h1, a note, and one button. Four states:

| State | Today |
| --- | --- |
| Guest | "Ada wants to be friends on start.ng" + "Sign in to accept" |
| Signed in | Same + "Accept" |
| Accepted | "You and Ada are friends" + "See your friends" |
| Own link | "This is your own invite link. Send it to a friend..." |
| Expired | One line of text: "This invite link has expired or doesn't exist..." |

Keep every word, button and state. Only the picture area above the h1 changes, plus the expired state gets the same card.

## 4. The design (every motion means something)

The picture area is a short "bench" with two seats joined by a dotted line, the same dotted path language as start.ng's "Got a game?" steps.

```
   ( Ada )  · · · · · · · ·  ( ? )
   waving                    your seat, saved for you
```

| Moment | What happens | What it means |
| --- | --- | --- |
| Page opens | Ada's face pops in and gives one small wave (tilt). The dotted line draws from Ada toward the empty seat. The empty seat is a dashed circle with a soft "?" | Ada saved you a spot |
| Guest | The empty seat shows a plain silhouette | It's for you, once you sign in |
| Signed in | Your own face fades into the seat, slightly faded, waiting | That's you, not in yet |
| Tap Accept | Your face hops along the dotted line toward Ada and lands next to her. The two faces bump together once. The dotted line becomes a solid lime line. A small lime "Friends" tag pops above them, with a tiny burst of lime dots | You chose to join her. Now you're linked |
| Own link | Your face sits in the left seat, the right seat is empty and nudges once when you tap "Copy link" | Your seat is waiting for whoever you send it to |
| Expired | Ada's face is faded and dozing (closed eyes overlay, small "z"). The dotted line is broken in the middle | The invite went stale. Ask her for a new one |

Hover on a face (fine pointers only): it bobs once. That's the only hover effect.

## 5. Rules (so it is accepted)

Sources: Emil Kowalski's skills (`emilkowalski/skills`), WCAG 2.2.2 and 2.3.3, start.ng's `CONTRIBUTING.md` and `AGENTS.md`.

1. **The celebration is earned.** On load, only the calm pop, one wave and the line drawing (under 1s). The hop, bump, lime line and burst only happen after the user taps Accept.
2. **Short, then still.** The accept sequence lasts about 1.2s. Nothing loops (the "z" on the expired state is static, not floating).
3. **Transform and opacity only,** plus `stroke-dashoffset` for drawing the line. Never `transition: all`, never start from `scale(0)` (start at `scale(.9)`).
4. **Ease out on entrances** (`cubic-bezier(0.23, 1, 0.32, 1)`), one small spring-like overshoot allowed on the landing only.
5. **Reduced motion:** every state shows its final picture instantly, the line is already solid lime when accepted. The text is unchanged.
6. **start.ng's styling rules:** plain CSS, `src/styles.css` variables only (`--lime`, `--ink`, `--card`, `--line`, `--muted`, `--dot`), no hex colours in new CSS, no UI library, no web fonts, breakpoints `760px` and `600px`, light and dark both work, 375px works.
7. **Faces are the real start.ng faces.** Use `AvatarFace` and `three/snapshot.ts` (stills rendered once, the same as the top bar). No live 3D scene. If WebGL fails, fall back to start.ng's `.avatar` circle with the first letter.
8. **Accessible:** the picture area is decorative (`aria-hidden`), all meaning stays in the h1, note and buttons. Focus styles stay. The state change after Accept is announced through the h1 (`aria-live="polite"`).
9. **Toggle:** the motion follows `prefers-reduced-motion`, and the demo has a "Preview reduced motion" control. A separate on/off switch isn't needed on a page you see once per invite; reduced motion is the off switch.

## 6. Demo app

A new Vite + React 18 + TypeScript app, matching `startng-fe`'s versions. Copy from `startng-fe`:

- `src/styles.css` (whole file), `public/favicon.svg`, the top bar markup, `ThemeToggle`
- `src/character.ts`, `src/Avatar.tsx`, `src/three/snapshot.ts`, `src/three/human.ts`, `src/three/items.ts` and what they import
- `src/features/follows/follows.css` and `InvitePage.tsx` as the starting point

Replace the API with mock data (`src/mock.ts`):
- Inviter: "Ada" with a female character in braids, an ankara-style top colour, and the gele if the item renderer supports it.
- You: "99plusOne" with a male character, afro.
- The accept call resolves after 400ms.

Routes:
- `/f/demo1234` the invite (default; `/` redirects here)
- `/f/expired1` the expired state

Demo controls strip above the card (start.ng ghost buttons, labelled "Demo controls"):
- **View as:** Guest · Signed in · Inviter (own link)
- **Expired link**
- **Replay**
- **Preview reduced motion**

Title tag: "You're invited to be friends · start.ng (design demo)". README credits `Cybertron-HNG/startng-fe` as the source of the UI and says it's an HNG15 design demo with mock data.

## 7. Done when

- `npx tsc --noEmit` and `npm run build` pass.
- All five states work from the demo controls, and Replay replays the current state.
- Accept runs the hop, bump, lime line and burst once, and the h1 changes.
- Reduced motion shows final states instantly.
- Light, dark and 375px look right with no horizontal scroll.
- `review-animations` passes.
- Live on Vercel.

## 8. Left out on purpose

- No full-body characters walking (the faces carry it, and stay true to how start.ng shows people).
- No sound, no looping idle motion, no confetti storm.
- No change to any other start.ng page.
