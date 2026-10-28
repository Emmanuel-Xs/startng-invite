// A player's character: one look that every game on start.ng uses.
// The style field names and values are what games build against.
export type Body = "female" | "male";

export type CharacterStyle = {
  body: Body;
  primaryColor: string; // top
  secondaryColor: string; // bottoms
  skinColor: string;
  hairColor: string;
  hair: "short" | "afro" | "braids" | "bun" | "ponytail" | "dreads" | "bald";
  hat: "none" | "cap" | "beanie" | "tophat" | "crown";
  accessory: "none" | "glasses" | "earrings" | "beard" | "scarf" | "backpack";
};

export type Character = { name: string; style: CharacterStyle };

/** A wardrobe item the character wears (src/features/wardrobe). The API sends objects; a plain key works too. */
export type WornItem = string | { key: string; slot?: string };
/** A style with wardrobe items on: `hat` and `accessory` may be an item's key (like "gele"), and `items` lists every
 *  worn item, including the slots that have no style field (outfit, neck, back, aura). three/items.ts draws them. */
export type DressedStyle = Omit<CharacterStyle, "hat" | "accessory"> & { hat: string; accessory: string; items?: WornItem[] };

export const SKINS = ["#5c3a21", "#8d5524", "#a0662f", "#c68642", "#e0ac69", "#f1c27d"];
export const HAIR_COLORS = ["#17120f", "#4a2c1a", "#8b5a2b", "#d9a441", "#b8b8b8", "#c0392b"];
export const TOPS = ["#ff6b6b", "#1dd1a1", "#a55eea", "#4b7bec", "#f7b731", "#fd9644", "#eb3b5a", "#292a23"];
export const BOTTOMS = ["#2b2f4a", "#222f3e", "#3d3d3d", "#4b6584", "#5f3dc4", "#0c6e5a"];
export const HATS: CharacterStyle["hat"][] = ["none", "cap", "beanie", "tophat", "crown"];

// Each section has its own hair and extras.
export const SECTIONS: Record<Body, { hair: CharacterStyle["hair"][]; accessory: CharacterStyle["accessory"][] }> = {
  female: {
    hair: ["braids", "bun", "ponytail", "afro", "short"],
    accessory: ["none", "earrings", "glasses", "scarf", "backpack"],
  },
  male: {
    hair: ["short", "afro", "dreads", "bald"],
    accessory: ["none", "beard", "glasses", "scarf", "backpack"],
  },
};

function hash(n: number) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

/** A starting look worked out from the account id. Games use it for accounts with no character yet. */
export function styleFor(userId: number, body?: Body): CharacterStyle {
  const pick = <T,>(list: T[], salt: number) => list[hash(userId * 31 + salt) % list.length];
  const b = body ?? pick<Body>(["female", "male"], 8);
  return {
    body: b,
    primaryColor: pick(TOPS, 1),
    secondaryColor: pick(BOTTOMS, 2),
    skinColor: pick(SKINS, 3),
    hairColor: pick(HAIR_COLORS, 6),
    hair: SECTIONS[b].hair[0],
    hat: "none",
    accessory: "none",
  };
}

/** Switch section, keeping colours and swapping hair/extras that the other section doesn't have. */
export function withBody(s: CharacterStyle, body: Body): CharacterStyle {
  const sec = SECTIONS[body];
  return {
    ...s,
    body,
    hair: sec.hair.includes(s.hair) ? s.hair : sec.hair[0],
    accessory: sec.accessory.includes(s.accessory) ? s.accessory : "none",
  };
}
