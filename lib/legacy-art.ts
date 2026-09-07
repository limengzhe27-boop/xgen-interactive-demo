// Dedicated static replacements for the original six built-in worlds.
export const legacyArt: Record<string, { cover: string; portraits: Record<string, string> }> = {
  "contract-expiry": {
    "cover": "/assets/library-v2/contract-expiry-cover.webp",
    "portraits": {
      "su": "/assets/library-v2/contract-expiry-su.webp",
      "gu": "/assets/library-v2/contract-expiry-gu.webp",
      "shen": "/assets/library-v2/contract-expiry-shen.webp"
    }
  },
  "client-comeback": {
    "cover": "/assets/library-v2/client-comeback-cover.webp",
    "portraits": {
      "lin": "/assets/library-v2/client-comeback-lin.webp",
      "zhou": "/assets/library-v2/client-comeback-zhou.webp",
      "tang": "/assets/library-v2/client-comeback-tang.webp"
    }
  },
  "inheritance-night": {
    "cover": "/assets/library-v2/inheritance-night-cover.webp",
    "portraits": {
      "xu": "/assets/library-v2/inheritance-night-xu.webp",
      "he": "/assets/library-v2/inheritance-night-he.webp",
      "lu": "/assets/library-v2/inheritance-night-lu.webp"
    }
  },
  "sea-train": {
    "cover": "/assets/library-v2/sea-train-cover.webp",
    "portraits": {
      "draft-role-0": "/assets/library-v2/sea-train-draft-role-0.webp",
      "draft-role-1": "/assets/library-v2/sea-train-draft-role-1.webp",
      "draft-role-2": "/assets/library-v2/sea-train-draft-role-2.webp"
    }
  },
  "sixth-roommate": {
    "cover": "/assets/library-v2/sixth-roommate-cover.webp",
    "portraits": {
      "draft-role-0": "/assets/library-v2/sixth-roommate-draft-role-0.webp",
      "draft-role-1": "/assets/library-v2/sixth-roommate-draft-role-1.webp",
      "draft-role-2": "/assets/library-v2/sixth-roommate-draft-role-2.webp"
    }
  },
  "storm-manor": {
    "cover": "/assets/library-v2/storm-manor-cover.webp",
    "portraits": {
      "lin-xia": "/assets/library-v2/storm-manor-lin-xia.webp",
      "gu-huai": "/assets/library-v2/storm-manor-gu-huai.webp",
      "zhou-bo": "/assets/library-v2/storm-manor-zhou-bo.webp"
    }
  }
};
export const legacyArtPaths = new Set(Object.values(legacyArt).flatMap(art => [art.cover, ...Object.values(art.portraits)]));
