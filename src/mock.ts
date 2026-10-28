// Mock data for the design demo: no backend. Same shapes as startng-fe's follows/api.ts, so the page reads the same.
import type { DressedStyle } from "./character";

export type Player = { id: number; name: string | null; character: { name: string; style: DressedStyle } | null };
export type InvitePreview = { inviter: Player; expires_at: string };

/** The inviter: a female character in braids, an ankara-style top, and the gele from the wardrobe. */
export const ADA: Player = {
  id: 1,
  name: "Ada",
  character: {
    name: "Ada",
    style: {
      body: "female", primaryColor: "#eb3b5a", secondaryColor: "#5f3dc4", skinColor: "#8d5524", hairColor: "#17120f",
      hair: "braids", hat: "gele", accessory: "earrings",
    },
  },
};

/** You: a male character with an afro. */
export const YOU: Player = {
  id: 2,
  name: "99plusOne",
  character: {
    name: "99plusOne",
    style: {
      body: "male", primaryColor: "#4b7bec", secondaryColor: "#222f3e", skinColor: "#a0662f", hairColor: "#17120f",
      hair: "afro", hat: "none", accessory: "none",
    },
  },
};

export const INVITE_CODE = "demo1234";
export const EXPIRED_CODE = "expired1";

export class FollowsError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** The preview of an invite link. The expired code answers 404, like the real API. */
export async function previewInvite(code: string): Promise<InvitePreview> {
  if (code === EXPIRED_CODE) throw new FollowsError("This invite link has expired or doesn't exist.", 404);
  return { inviter: ADA, expires_at: "2099-01-01T00:00:00Z" };
}

/** Accepting takes 400ms, like a quick network call. */
export const acceptInvite = (_code: string) => new Promise<{ friend: Player }>((resolve) => setTimeout(() => resolve({ friend: ADA }), 400));

/** How a player's name is shown: their character's name, then their account name. */
export const displayName = (p: Player) => p.character?.name || p.name || "A player";
