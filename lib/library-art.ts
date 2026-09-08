// Generated built-in public artwork. Static files only; browsing never calls a model.
export const libraryArt: Record<string, { cover?: string; portraits: Record<string, string> }> = {
  "banquet-creditor": {
    "cover": "/assets/library-v1/banquet-creditor-cover.webp",
    "portraits": {
      "yan": "/assets/library-v1/banquet-creditor-yan.webp",
      "yi": "/assets/library-v1/banquet-creditor-yi.webp",
      "ting": "/assets/library-v1/banquet-creditor-ting.webp"
    }
  },
  "boardroom-reckoning": {
    "cover": "/assets/library-v1/boardroom-reckoning-cover.webp",
    "portraits": {
      "chuan": "/assets/library-v1/boardroom-reckoning-chuan.webp",
      "zheng": "/assets/library-v1/boardroom-reckoning-zheng.webp",
      "lan": "/assets/library-v1/boardroom-reckoning-lan.webp"
    }
  },
  "heir-substitute": {
    "cover": "/assets/library-v1/heir-substitute-cover.webp",
    "portraits": {
      "ye": "/assets/library-v1/heir-substitute-ye.webp",
      "yu": "/assets/library-v1/heir-substitute-yu.webp",
      "zhao": "/assets/library-v1/heir-substitute-zhao.webp"
    }
  },
  "palace-witness": {
    "cover": "/assets/library-v1/palace-witness-cover.webp",
    "portraits": {
      "zhen": "/assets/library-v1/palace-witness-zhen.webp",
      "jiang": "/assets/library-v1/palace-witness-jiang.webp",
      "heng": "/assets/library-v1/palace-witness-heng.webp"
    }
  },
  "blood-seal": {
    "cover": "/assets/library-v1/blood-seal-cover.webp",
    "portraits": {
      "li": "/assets/library-v1/blood-seal-li.webp",
      "shu": "/assets/library-v1/blood-seal-shu.webp",
      "zhao": "/assets/library-v1/blood-seal-zhao.webp"
    }
  },
  "winter-gate": {
    "cover": "/assets/library-v1/winter-gate-cover.webp",
    "portraits": {
      "jin": "/assets/library-v1/winter-gate-jin.webp",
      "xiao": "/assets/library-v1/winter-gate-xiao.webp",
      "tang": "/assets/library-v1/winter-gate-tang.webp"
    }
  },
  "live-apology": {
    "cover": "/assets/library-v1/live-apology-cover.webp",
    "portraits": {
      "yao": "/assets/library-v1/live-apology-yao.webp",
      "xiao": "/assets/library-v1/live-apology-xiao.webp",
      "yin": "/assets/library-v1/live-apology-yin.webp"
    }
  },
  "rival-invitation": {
    "cover": "/assets/library-v1/rival-invitation-cover.webp",
    "portraits": {
      "qiao": "/assets/library-v1/rival-invitation-qiao.webp",
      "zheng": "/assets/library-v1/rival-invitation-zheng.webp",
      "heng": "/assets/library-v1/rival-invitation-heng.webp"
    }
  },
  "peach-garden-delivery": {
    "cover": "/assets/library-v1/peach-garden-delivery-cover.webp",
    "portraits": {
      "man": "/assets/library-v1/peach-garden-delivery-man.webp",
      "bei": "/assets/library-v1/peach-garden-delivery-bei.webp",
      "guan": "/assets/library-v1/peach-garden-delivery-guan.webp",
      "zhang": "/assets/library-v1/peach-garden-delivery-zhang.webp"
    }
  },
  "monkey-pirate-avengers": {
    "portraits": {
      "luffy": "/assets/library-v1/monkey-pirate-avengers-luffy.webp",
      "wukong": "/assets/library-v1/monkey-pirate-avengers-wukong.webp"
    }
  },
  "three-husbands-system": {
    "cover": "/assets/library-v1/three-husbands-system-cover.webp",
    "portraits": {
      "snow": "/assets/library-v1/three-husbands-system-snow.webp",
      "xuan": "/assets/library-v1/three-husbands-system-xuan.webp",
      "night": "/assets/library-v1/three-husbands-system-night.webp"
    }
  },
  "villain-mother-system": {
    "cover": "/assets/library-v1/villain-mother-system-cover.webp",
    "portraits": {
      "sui": "/assets/library-v1/villain-mother-system-sui.webp",
      "ran": "/assets/library-v1/villain-mother-system-ran.webp",
      "eve": "/assets/library-v1/villain-mother-system-eve.webp"
    }
  }
};
export const libraryArtPaths = new Set(Object.values(libraryArt).flatMap(art => [...(art.cover ? [art.cover] : []), ...Object.values(art.portraits)]));
