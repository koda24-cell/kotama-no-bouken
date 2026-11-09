const skillTreeExpansionDefinitions={
  "kotama": [
    {
      "id": "kotama-exp-root-1",
      "name": "雷刃の構え",
      "desc": "雷刃の構え。コタマの戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 1,
      "skill": {
        "id": "kotama-exp-root-1-skill",
        "name": "雷刃の構え",
        "cost": 12,
        "target": "enemy",
        "type": "xj",
        "description": "雷刃の構え。コタマの戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.15,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-1-1",
      "name": "雷光突き",
      "desc": "雷光突き。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "kotama-exp-root-1",
      "group": 1,
      "skill": {
        "id": "kotama-exp-1-1-skill",
        "name": "雷光突き",
        "cost": 20,
        "target": "enemy",
        "type": "xj",
        "description": "雷光突き。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 1.35,
          "hits": 1,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-1-2",
      "name": "轟雷撃",
      "desc": "轟雷撃。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "kotama-exp-root-1",
      "group": 1,
      "skill": {
        "id": "kotama-exp-1-2-skill",
        "name": "轟雷撃",
        "cost": 22,
        "target": "allEnemies",
        "type": "xj",
        "description": "轟雷撃。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 0.72,
          "hits": 2,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-root-2",
      "name": "電光連鎖",
      "desc": "電光連鎖。コタマの戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 2,
      "skill": {
        "id": "kotama-exp-root-2-skill",
        "name": "電光連鎖",
        "cost": 15,
        "target": "enemy",
        "type": "xj",
        "description": "電光連鎖。コタマの戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.27,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-2-1",
      "name": "連鎖放電",
      "desc": "連鎖放電。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "kotama-exp-root-2",
      "group": 2,
      "skill": {
        "id": "kotama-exp-2-1-skill",
        "name": "連鎖放電",
        "cost": 24,
        "target": "enemy",
        "type": "xj",
        "description": "連鎖放電。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 1.59,
          "hits": 1,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-2-2",
      "name": "雷鳴爆ぜ",
      "desc": "雷鳴爆ぜ。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "kotama-exp-root-2",
      "group": 2,
      "skill": {
        "id": "kotama-exp-2-2-skill",
        "name": "雷鳴爆ぜ",
        "cost": 26,
        "target": "allEnemies",
        "type": "xj",
        "description": "雷鳴爆ぜ。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 1.71,
          "hits": 1,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-root-3",
      "name": "魔弾強化",
      "desc": "魔弾強化。コタマの戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 3,
      "skill": {
        "id": "kotama-exp-root-3-skill",
        "name": "魔弾強化",
        "cost": 18,
        "target": "enemy",
        "type": "xj",
        "description": "魔弾強化。コタマの戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.39,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-3-1",
      "name": "魔弾連射",
      "desc": "魔弾連射。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "kotama-exp-root-3",
      "group": 3,
      "skill": {
        "id": "kotama-exp-3-1-skill",
        "name": "魔弾連射",
        "cost": 28,
        "target": "allEnemies",
        "type": "xj",
        "description": "魔弾連射。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 0.72,
          "hits": 2,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-3-2",
      "name": "魔力収束",
      "desc": "魔力収束。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "kotama-exp-root-3",
      "group": 3,
      "skill": {
        "id": "kotama-exp-3-2-skill",
        "name": "魔力収束",
        "cost": 30,
        "target": "enemy",
        "type": "xj",
        "description": "魔力収束。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 1.9500000000000002,
          "hits": 1,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-root-4",
      "name": "天雷の印",
      "desc": "天雷の印。コタマの戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 4,
      "skill": {
        "id": "kotama-exp-root-4-skill",
        "name": "天雷の印",
        "cost": 21,
        "target": "enemy",
        "type": "xj",
        "description": "天雷の印。コタマの戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.5099999999999998,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-4-1",
      "name": "雷光障壁",
      "desc": "雷光障壁。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "kotama-exp-root-4",
      "group": 4,
      "skill": {
        "id": "kotama-exp-4-1-skill",
        "name": "雷光障壁",
        "cost": 32,
        "target": "enemy",
        "type": "xj",
        "description": "雷光障壁。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 0.72,
          "hits": 2,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-4-2",
      "name": "電磁結界",
      "desc": "電磁結界。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "kotama-exp-root-4",
      "group": 4,
      "skill": {
        "id": "kotama-exp-4-2-skill",
        "name": "電磁結界",
        "cost": 34,
        "target": "enemy",
        "type": "xj",
        "description": "電磁結界。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 2.19,
          "hits": 1,
          "element": "雷",
          "fx": "magic"
        }
      }
    },
    {
      "id": "kotama-exp-solo-1",
      "name": "集中詠唱",
      "desc": "集中詠唱。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "kotama-exp-solo-1-skill",
        "name": "集中詠唱",
        "cost": 16,
        "target": "self",
        "type": "xj",
        "description": "集中詠唱。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "attackUp": {
              "turns": 3,
              "power": 0.28
            }
          }
        }
      }
    },
    {
      "id": "kotama-exp-solo-2",
      "name": "魔導の護り",
      "desc": "魔導の護り。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "kotama-exp-solo-2-skill",
        "name": "魔導の護り",
        "cost": 24,
        "target": "self",
        "type": "xj",
        "description": "魔導の護り。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "attackUp": {
              "turns": 3,
              "power": 0.2
            },
            "defenseUp": {
              "turns": 3,
              "power": 0.2
            }
          }
        }
      }
    }
  ],
  "knight": [
    {
      "id": "knight-exp-root-1",
      "name": "盾撃の構え",
      "desc": "盾撃の構え。騎士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 1,
      "skill": {
        "id": "knight-exp-root-1-skill",
        "name": "盾撃の構え",
        "cost": 12,
        "target": "enemy",
        "type": "xj",
        "description": "盾撃の構え。騎士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.15,
          "element": "打",
          "fx": "slash"
        }
      }
    },
    {
      "id": "knight-exp-1-1",
      "name": "シールドバッシュ",
      "desc": "シールドバッシュ。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "knight-exp-root-1",
      "group": 1,
      "skill": {
        "id": "knight-exp-1-1-skill",
        "name": "シールドバッシュ",
        "cost": 20,
        "target": "enemy",
        "type": "xj",
        "description": "シールドバッシュ。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 1.35,
          "hits": 1,
          "element": "打",
          "fx": "slash"
        }
      }
    },
    {
      "id": "knight-exp-1-2",
      "name": "重盾打ち",
      "desc": "重盾打ち。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "knight-exp-root-1",
      "group": 1,
      "skill": {
        "id": "knight-exp-1-2-skill",
        "name": "重盾打ち",
        "cost": 22,
        "target": "allAllies",
        "type": "xj",
        "description": "重盾打ち。前段階の技から派生する上位スキル。",
        "xj": {
          "buff": {
            "defenseUp": {
              "turns": 3,
              "power": 0.28
            }
          }
        }
      }
    },
    {
      "id": "knight-exp-root-2",
      "name": "鉄壁の陣",
      "desc": "鉄壁の陣。騎士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 2,
      "skill": {
        "id": "knight-exp-root-2-skill",
        "name": "鉄壁の陣",
        "cost": 15,
        "target": "enemy",
        "type": "xj",
        "description": "鉄壁の陣。騎士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.27,
          "element": "打",
          "fx": "slash"
        }
      }
    },
    {
      "id": "knight-exp-2-1",
      "name": "鉄壁陣",
      "desc": "鉄壁陣。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "knight-exp-root-2",
      "group": 2,
      "skill": {
        "id": "knight-exp-2-1-skill",
        "name": "鉄壁陣",
        "cost": 24,
        "target": "enemy",
        "type": "xj",
        "description": "鉄壁陣。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 1.59,
          "hits": 1,
          "element": "打",
          "fx": "slash"
        }
      }
    },
    {
      "id": "knight-exp-2-2",
      "name": "堅牢守護",
      "desc": "堅牢守護。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "knight-exp-root-2",
      "group": 2,
      "skill": {
        "id": "knight-exp-2-2-skill",
        "name": "堅牢守護",
        "cost": 26,
        "target": "allAllies",
        "type": "xj",
        "description": "堅牢守護。前段階の技から派生する上位スキル。",
        "xj": {
          "buff": {
            "defenseUp": {
              "turns": 3,
              "power": 0.28
            }
          }
        }
      }
    },
    {
      "id": "knight-exp-root-3",
      "name": "守護の誓い",
      "desc": "守護の誓い。騎士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 3,
      "skill": {
        "id": "knight-exp-root-3-skill",
        "name": "守護の誓い",
        "cost": 18,
        "target": "enemy",
        "type": "xj",
        "description": "守護の誓い。騎士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.39,
          "element": "打",
          "fx": "slash"
        }
      }
    },
    {
      "id": "knight-exp-3-1",
      "name": "守護反撃",
      "desc": "守護反撃。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "knight-exp-root-3",
      "group": 3,
      "skill": {
        "id": "knight-exp-3-1-skill",
        "name": "守護反撃",
        "cost": 28,
        "target": "allEnemies",
        "type": "xj",
        "description": "守護反撃。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 0.72,
          "hits": 2,
          "element": "打",
          "fx": "slash"
        }
      }
    },
    {
      "id": "knight-exp-3-2",
      "name": "騎士の鼓舞",
      "desc": "騎士の鼓舞。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "knight-exp-root-3",
      "group": 3,
      "skill": {
        "id": "knight-exp-3-2-skill",
        "name": "騎士の鼓舞",
        "cost": 30,
        "target": "allAllies",
        "type": "xj",
        "description": "騎士の鼓舞。前段階の技から派生する上位スキル。",
        "xj": {
          "buff": {
            "defenseUp": {
              "turns": 3,
              "power": 0.28
            }
          }
        }
      }
    },
    {
      "id": "knight-exp-root-4",
      "name": "不動の構え",
      "desc": "不動の構え。騎士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 4,
      "skill": {
        "id": "knight-exp-root-4-skill",
        "name": "不動の構え",
        "cost": 21,
        "target": "enemy",
        "type": "xj",
        "description": "不動の構え。騎士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.5099999999999998,
          "element": "打",
          "fx": "slash"
        }
      }
    },
    {
      "id": "knight-exp-4-1",
      "name": "防衛線",
      "desc": "防衛線。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "knight-exp-root-4",
      "group": 4,
      "skill": {
        "id": "knight-exp-4-1-skill",
        "name": "防衛線",
        "cost": 32,
        "target": "enemy",
        "type": "xj",
        "description": "防衛線。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 0.72,
          "hits": 2,
          "element": "打",
          "fx": "slash"
        }
      }
    },
    {
      "id": "knight-exp-4-2",
      "name": "不屈の盾",
      "desc": "不屈の盾。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "knight-exp-root-4",
      "group": 4,
      "skill": {
        "id": "knight-exp-4-2-skill",
        "name": "不屈の盾",
        "cost": 34,
        "target": "allAllies",
        "type": "xj",
        "description": "不屈の盾。前段階の技から派生する上位スキル。",
        "xj": {
          "buff": {
            "defenseUp": {
              "turns": 3,
              "power": 0.28
            }
          }
        }
      }
    },
    {
      "id": "knight-exp-solo-1",
      "name": "最後の砦",
      "desc": "最後の砦。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "knight-exp-solo-1-skill",
        "name": "最後の砦",
        "cost": 16,
        "target": "self",
        "type": "xj",
        "description": "最後の砦。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "defenseUp": {
              "turns": 3,
              "power": 0.4
            }
          }
        }
      }
    },
    {
      "id": "knight-exp-solo-2",
      "name": "戦線鼓舞",
      "desc": "戦線鼓舞。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "knight-exp-solo-2-skill",
        "name": "戦線鼓舞",
        "cost": 24,
        "target": "self",
        "type": "xj",
        "description": "戦線鼓舞。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "defenseUp": {
              "turns": 3,
              "power": 0.25
            },
            "attackUp": {
              "turns": 3,
              "power": 0.2
            }
          }
        }
      }
    }
  ],
  "healer": [
    {
      "id": "healer-exp-root-1",
      "name": "癒光の祈り",
      "desc": "癒光の祈り。治癒士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 1,
      "skill": {
        "id": "healer-exp-root-1-skill",
        "name": "癒光の祈り",
        "cost": 12,
        "target": "enemy",
        "type": "xj",
        "description": "癒光の祈り。治癒士の戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.15,
          "element": "聖",
          "fx": "magic"
        }
      }
    },
    {
      "id": "healer-exp-1-1",
      "name": "光の矢",
      "desc": "光の矢。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "healer-exp-root-1",
      "group": 1,
      "skill": {
        "id": "healer-exp-1-1-skill",
        "name": "光の矢",
        "cost": 20,
        "target": "enemy",
        "type": "xj",
        "description": "光の矢。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 1.35,
          "hits": 1,
          "element": "聖",
          "fx": "magic"
        }
      }
    },
    {
      "id": "healer-exp-1-2",
      "name": "聖なる審判",
      "desc": "聖なる審判。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "healer-exp-root-1",
      "group": 1,
      "skill": {
        "id": "healer-exp-1-2-skill",
        "name": "聖なる審判",
        "cost": 22,
        "target": "allEnemies",
        "type": "xj",
        "description": "聖なる審判。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 0.72,
          "hits": 2,
          "element": "聖",
          "fx": "magic"
        }
      }
    },
    {
      "id": "healer-exp-root-2",
      "name": "聖撃の構え",
      "desc": "聖撃の構え。治癒士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 2,
      "skill": {
        "id": "healer-exp-root-2-skill",
        "name": "聖撃の構え",
        "cost": 15,
        "target": "enemy",
        "type": "xj",
        "description": "聖撃の構え。治癒士の戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.27,
          "element": "聖",
          "fx": "magic"
        }
      }
    },
    {
      "id": "healer-exp-2-1",
      "name": "癒しの波",
      "desc": "癒しの波。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "healer-exp-root-2",
      "group": 2,
      "skill": {
        "id": "healer-exp-2-1-skill",
        "name": "癒しの波",
        "cost": 24,
        "target": "allAllies",
        "type": "xj",
        "description": "癒しの波。前段階の技から派生する上位スキル。",
        "xj": {
          "buff": {
            "regen": {
              "turns": 3,
              "power": 0.12
            }
          }
        }
      }
    },
    {
      "id": "healer-exp-2-2",
      "name": "再生の祈り",
      "desc": "再生の祈り。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "healer-exp-root-2",
      "group": 2,
      "skill": {
        "id": "healer-exp-2-2-skill",
        "name": "再生の祈り",
        "cost": 26,
        "target": "allAllies",
        "type": "xj",
        "description": "再生の祈り。前段階の技から派生する上位スキル。",
        "xj": {
          "buff": {
            "regen": {
              "turns": 3,
              "power": 0.15
            }
          }
        }
      }
    },
    {
      "id": "healer-exp-root-3",
      "name": "浄化の心得",
      "desc": "浄化の心得。治癒士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 3,
      "skill": {
        "id": "healer-exp-root-3-skill",
        "name": "浄化の心得",
        "cost": 18,
        "target": "enemy",
        "type": "xj",
        "description": "浄化の心得。治癒士の戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.39,
          "element": "聖",
          "fx": "magic"
        }
      }
    },
    {
      "id": "healer-exp-3-1",
      "name": "浄化の波",
      "desc": "浄化の波。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "healer-exp-root-3",
      "group": 3,
      "skill": {
        "id": "healer-exp-3-1-skill",
        "name": "浄化の波",
        "cost": 28,
        "target": "allAllies",
        "type": "xj",
        "description": "浄化の波。前段階の技から派生する上位スキル。",
        "xj": {
          "buff": {
            "regen": {
              "turns": 3,
              "power": 0.12
            }
          }
        }
      }
    },
    {
      "id": "healer-exp-3-2",
      "name": "聖光弾",
      "desc": "聖光弾。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "healer-exp-root-3",
      "group": 3,
      "skill": {
        "id": "healer-exp-3-2-skill",
        "name": "聖光弾",
        "cost": 30,
        "target": "allAllies",
        "type": "xj",
        "description": "聖光弾。前段階の技から派生する上位スキル。",
        "xj": {
          "buff": {
            "regen": {
              "turns": 3,
              "power": 0.15
            }
          }
        }
      }
    },
    {
      "id": "healer-exp-root-4",
      "name": "慈愛の誓い",
      "desc": "慈愛の誓い。治癒士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 4,
      "skill": {
        "id": "healer-exp-root-4-skill",
        "name": "慈愛の誓い",
        "cost": 21,
        "target": "enemy",
        "type": "xj",
        "description": "慈愛の誓い。治癒士の戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.5099999999999998,
          "element": "聖",
          "fx": "magic"
        }
      }
    },
    {
      "id": "healer-exp-4-1",
      "name": "聖域",
      "desc": "聖域。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "healer-exp-root-4",
      "group": 4,
      "skill": {
        "id": "healer-exp-4-1-skill",
        "name": "聖域",
        "cost": 32,
        "target": "allAllies",
        "type": "xj",
        "description": "聖域。前段階の技から派生する上位スキル。",
        "xj": {
          "buff": {
            "regen": {
              "turns": 3,
              "power": 0.12
            }
          }
        }
      }
    },
    {
      "id": "healer-exp-4-2",
      "name": "慈愛の光",
      "desc": "慈愛の光。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "healer-exp-root-4",
      "group": 4,
      "skill": {
        "id": "healer-exp-4-2-skill",
        "name": "慈愛の光",
        "cost": 34,
        "target": "allAllies",
        "type": "xj",
        "description": "慈愛の光。前段階の技から派生する上位スキル。",
        "xj": {
          "buff": {
            "regen": {
              "turns": 3,
              "power": 0.15
            }
          }
        }
      }
    },
    {
      "id": "healer-exp-solo-1",
      "name": "応急処置",
      "desc": "応急処置。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "healer-exp-solo-1-skill",
        "name": "応急処置",
        "cost": 16,
        "target": "self",
        "type": "xj",
        "description": "応急処置。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "attackUp": {
              "turns": 3,
              "power": 0.28
            }
          }
        }
      }
    },
    {
      "id": "healer-exp-solo-2",
      "name": "マナの祈り",
      "desc": "マナの祈り。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "healer-exp-solo-2-skill",
        "name": "マナの祈り",
        "cost": 24,
        "target": "self",
        "type": "xj",
        "description": "マナの祈り。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "attackUp": {
              "turns": 3,
              "power": 0.2
            },
            "defenseUp": {
              "turns": 3,
              "power": 0.2
            }
          }
        }
      }
    }
  ],
  "mage": [
    {
      "id": "mage-exp-root-1",
      "name": "炎術強化",
      "desc": "炎術強化。魔術師の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 1,
      "skill": {
        "id": "mage-exp-root-1-skill",
        "name": "炎術強化",
        "cost": 12,
        "target": "enemy",
        "type": "xj",
        "description": "炎術強化。魔術師の戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.15,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-1-1",
      "name": "インフェルノ",
      "desc": "インフェルノ。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "mage-exp-root-1",
      "group": 1,
      "skill": {
        "id": "mage-exp-1-1-skill",
        "name": "インフェルノ",
        "cost": 20,
        "target": "enemy",
        "type": "xj",
        "description": "インフェルノ。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 1.35,
          "hits": 1,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-1-2",
      "name": "フレイムレイン",
      "desc": "フレイムレイン。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "mage-exp-root-1",
      "group": 1,
      "skill": {
        "id": "mage-exp-1-2-skill",
        "name": "フレイムレイン",
        "cost": 22,
        "target": "allEnemies",
        "type": "xj",
        "description": "フレイムレイン。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 0.72,
          "hits": 2,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-root-2",
      "name": "氷術強化",
      "desc": "氷術強化。魔術師の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 2,
      "skill": {
        "id": "mage-exp-root-2-skill",
        "name": "氷術強化",
        "cost": 15,
        "target": "enemy",
        "type": "xj",
        "description": "氷術強化。魔術師の戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.27,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-2-1",
      "name": "フロストランス",
      "desc": "フロストランス。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "mage-exp-root-2",
      "group": 2,
      "skill": {
        "id": "mage-exp-2-1-skill",
        "name": "フロストランス",
        "cost": 24,
        "target": "enemy",
        "type": "xj",
        "description": "フロストランス。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 1.59,
          "hits": 1,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-2-2",
      "name": "ブリザード",
      "desc": "ブリザード。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "mage-exp-root-2",
      "group": 2,
      "skill": {
        "id": "mage-exp-2-2-skill",
        "name": "ブリザード",
        "cost": 26,
        "target": "allEnemies",
        "type": "xj",
        "description": "ブリザード。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 1.71,
          "hits": 1,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-root-3",
      "name": "雷術強化",
      "desc": "雷術強化。魔術師の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 3,
      "skill": {
        "id": "mage-exp-root-3-skill",
        "name": "雷術強化",
        "cost": 18,
        "target": "enemy",
        "type": "xj",
        "description": "雷術強化。魔術師の戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.39,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-3-1",
      "name": "サンダーストーム",
      "desc": "サンダーストーム。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "mage-exp-root-3",
      "group": 3,
      "skill": {
        "id": "mage-exp-3-1-skill",
        "name": "サンダーストーム",
        "cost": 28,
        "target": "allEnemies",
        "type": "xj",
        "description": "サンダーストーム。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 0.72,
          "hits": 2,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-3-2",
      "name": "雷槍",
      "desc": "雷槍。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "mage-exp-root-3",
      "group": 3,
      "skill": {
        "id": "mage-exp-3-2-skill",
        "name": "雷槍",
        "cost": 30,
        "target": "enemy",
        "type": "xj",
        "description": "雷槍。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 1.9500000000000002,
          "hits": 1,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-root-4",
      "name": "魔力増幅",
      "desc": "魔力増幅。魔術師の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 4,
      "skill": {
        "id": "mage-exp-root-4-skill",
        "name": "魔力増幅",
        "cost": 21,
        "target": "enemy",
        "type": "xj",
        "description": "魔力増幅。魔術師の戦い方を発展させる技。",
        "xj": {
          "kind": "sp",
          "mult": 1.5099999999999998,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-4-1",
      "name": "魔力増幅陣",
      "desc": "魔力増幅陣。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "mage-exp-root-4",
      "group": 4,
      "skill": {
        "id": "mage-exp-4-1-skill",
        "name": "魔力増幅陣",
        "cost": 32,
        "target": "enemy",
        "type": "xj",
        "description": "魔力増幅陣。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 0.72,
          "hits": 2,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-4-2",
      "name": "エーテル吸収",
      "desc": "エーテル吸収。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "mage-exp-root-4",
      "group": 4,
      "skill": {
        "id": "mage-exp-4-2-skill",
        "name": "エーテル吸収",
        "cost": 34,
        "target": "enemy",
        "type": "xj",
        "description": "エーテル吸収。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "sp",
          "mult": 2.19,
          "hits": 1,
          "element": "炎",
          "fx": "magic"
        }
      }
    },
    {
      "id": "mage-exp-solo-1",
      "name": "属性転換",
      "desc": "属性転換。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "mage-exp-solo-1-skill",
        "name": "属性転換",
        "cost": 16,
        "target": "self",
        "type": "xj",
        "description": "属性転換。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "attackUp": {
              "turns": 3,
              "power": 0.28
            }
          }
        }
      }
    },
    {
      "id": "mage-exp-solo-2",
      "name": "マナシールド",
      "desc": "マナシールド。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "mage-exp-solo-2-skill",
        "name": "マナシールド",
        "cost": 24,
        "target": "self",
        "type": "xj",
        "description": "マナシールド。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "attackUp": {
              "turns": 3,
              "power": 0.2
            },
            "defenseUp": {
              "turns": 3,
              "power": 0.2
            }
          }
        }
      }
    }
  ],
  "warrior": [
    {
      "id": "warrior-exp-root-1",
      "name": "猛攻の構え",
      "desc": "猛攻の構え。戦士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 1,
      "skill": {
        "id": "warrior-exp-root-1-skill",
        "name": "猛攻の構え",
        "cost": 12,
        "target": "enemy",
        "type": "xj",
        "description": "猛攻の構え。戦士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.15,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-1-1",
      "name": "疾風斬",
      "desc": "疾風斬。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "warrior-exp-root-1",
      "group": 1,
      "skill": {
        "id": "warrior-exp-1-1-skill",
        "name": "疾風斬",
        "cost": 20,
        "target": "enemy",
        "type": "xj",
        "description": "疾風斬。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 1.35,
          "hits": 1,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-1-2",
      "name": "嵐斬り",
      "desc": "嵐斬り。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "warrior-exp-root-1",
      "group": 1,
      "skill": {
        "id": "warrior-exp-1-2-skill",
        "name": "嵐斬り",
        "cost": 22,
        "target": "allEnemies",
        "type": "xj",
        "description": "嵐斬り。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 0.72,
          "hits": 2,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-root-2",
      "name": "破砕の構え",
      "desc": "破砕の構え。戦士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 2,
      "skill": {
        "id": "warrior-exp-root-2-skill",
        "name": "破砕の構え",
        "cost": 15,
        "target": "enemy",
        "type": "xj",
        "description": "破砕の構え。戦士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.27,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-2-1",
      "name": "破砕撃",
      "desc": "破砕撃。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "warrior-exp-root-2",
      "group": 2,
      "skill": {
        "id": "warrior-exp-2-1-skill",
        "name": "破砕撃",
        "cost": 24,
        "target": "enemy",
        "type": "xj",
        "description": "破砕撃。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 1.59,
          "hits": 1,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-2-2",
      "name": "渾身砕き",
      "desc": "渾身砕き。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "warrior-exp-root-2",
      "group": 2,
      "skill": {
        "id": "warrior-exp-2-2-skill",
        "name": "渾身砕き",
        "cost": 26,
        "target": "allEnemies",
        "type": "xj",
        "description": "渾身砕き。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 1.71,
          "hits": 1,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-root-3",
      "name": "闘志の連鎖",
      "desc": "闘志の連鎖。戦士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 3,
      "skill": {
        "id": "warrior-exp-root-3-skill",
        "name": "闘志の連鎖",
        "cost": 18,
        "target": "enemy",
        "type": "xj",
        "description": "闘志の連鎖。戦士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.39,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-3-1",
      "name": "狂戦士の咆哮",
      "desc": "狂戦士の咆哮。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "warrior-exp-root-3",
      "group": 3,
      "skill": {
        "id": "warrior-exp-3-1-skill",
        "name": "狂戦士の咆哮",
        "cost": 28,
        "target": "allEnemies",
        "type": "xj",
        "description": "狂戦士の咆哮。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 0.72,
          "hits": 2,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-3-2",
      "name": "戦場の雄叫び",
      "desc": "戦場の雄叫び。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "warrior-exp-root-3",
      "group": 3,
      "skill": {
        "id": "warrior-exp-3-2-skill",
        "name": "戦場の雄叫び",
        "cost": 30,
        "target": "enemy",
        "type": "xj",
        "description": "戦場の雄叫び。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 1.9500000000000002,
          "hits": 1,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-root-4",
      "name": "剛力の誓い",
      "desc": "剛力の誓い。戦士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 4,
      "skill": {
        "id": "warrior-exp-root-4-skill",
        "name": "剛力の誓い",
        "cost": 21,
        "target": "enemy",
        "type": "xj",
        "description": "剛力の誓い。戦士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.5099999999999998,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-4-1",
      "name": "処刑斬",
      "desc": "処刑斬。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "warrior-exp-root-4",
      "group": 4,
      "skill": {
        "id": "warrior-exp-4-1-skill",
        "name": "処刑斬",
        "cost": 32,
        "target": "enemy",
        "type": "xj",
        "description": "処刑斬。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 0.72,
          "hits": 2,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-4-2",
      "name": "吸命撃",
      "desc": "吸命撃。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "warrior-exp-root-4",
      "group": 4,
      "skill": {
        "id": "warrior-exp-4-2-skill",
        "name": "吸命撃",
        "cost": 34,
        "target": "enemy",
        "type": "xj",
        "description": "吸命撃。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 2.19,
          "hits": 1,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "warrior-exp-solo-1",
      "name": "闘争本能",
      "desc": "闘争本能。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "warrior-exp-solo-1-skill",
        "name": "闘争本能",
        "cost": 16,
        "target": "self",
        "type": "xj",
        "description": "闘争本能。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "attackUp": {
              "turns": 3,
              "power": 0.28
            }
          }
        }
      }
    },
    {
      "id": "warrior-exp-solo-2",
      "name": "鋼の肉体",
      "desc": "鋼の肉体。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "warrior-exp-solo-2-skill",
        "name": "鋼の肉体",
        "cost": 24,
        "target": "self",
        "type": "xj",
        "description": "鋼の肉体。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "attackUp": {
              "turns": 3,
              "power": 0.2
            },
            "defenseUp": {
              "turns": 3,
              "power": 0.2
            }
          }
        }
      }
    }
  ],
  "samurai": [
    {
      "id": "samurai-exp-root-1",
      "name": "流水の構え",
      "desc": "流水の構え。武士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 1,
      "skill": {
        "id": "samurai-exp-root-1-skill",
        "name": "流水の構え",
        "cost": 12,
        "target": "enemy",
        "type": "xj",
        "description": "流水の構え。武士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.15,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-1-1",
      "name": "十文字斬り",
      "desc": "十文字斬り。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "samurai-exp-root-1",
      "group": 1,
      "skill": {
        "id": "samurai-exp-1-1-skill",
        "name": "十文字斬り",
        "cost": 20,
        "target": "enemy",
        "type": "xj",
        "description": "十文字斬り。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 1.35,
          "hits": 1,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-1-2",
      "name": "月影",
      "desc": "月影。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "samurai-exp-root-1",
      "group": 1,
      "skill": {
        "id": "samurai-exp-1-2-skill",
        "name": "月影",
        "cost": 22,
        "target": "allEnemies",
        "type": "xj",
        "description": "月影。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 0.72,
          "hits": 2,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-root-2",
      "name": "抜刀の極意",
      "desc": "抜刀の極意。武士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "a",
      "group": 2,
      "skill": {
        "id": "samurai-exp-root-2-skill",
        "name": "抜刀の極意",
        "cost": 15,
        "target": "enemy",
        "type": "xj",
        "description": "抜刀の極意。武士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.27,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-2-1",
      "name": "抜刀",
      "desc": "抜刀。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "samurai-exp-root-2",
      "group": 2,
      "skill": {
        "id": "samurai-exp-2-1-skill",
        "name": "抜刀",
        "cost": 24,
        "target": "enemy",
        "type": "xj",
        "description": "抜刀。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 1.59,
          "hits": 1,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-2-2",
      "name": "閃光一閃",
      "desc": "閃光一閃。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "samurai-exp-root-2",
      "group": 2,
      "skill": {
        "id": "samurai-exp-2-2-skill",
        "name": "閃光一閃",
        "cost": 26,
        "target": "allEnemies",
        "type": "xj",
        "description": "閃光一閃。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 1.71,
          "hits": 1,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-root-3",
      "name": "二刀の心得",
      "desc": "二刀の心得。武士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 3,
      "skill": {
        "id": "samurai-exp-root-3-skill",
        "name": "二刀の心得",
        "cost": 18,
        "target": "enemy",
        "type": "xj",
        "description": "二刀の心得。武士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.39,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-3-1",
      "name": "鎧通し",
      "desc": "鎧通し。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "samurai-exp-root-3",
      "group": 3,
      "skill": {
        "id": "samurai-exp-3-1-skill",
        "name": "鎧通し",
        "cost": 28,
        "target": "allEnemies",
        "type": "xj",
        "description": "鎧通し。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 0.72,
          "hits": 2,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-3-2",
      "name": "無明斬",
      "desc": "無明斬。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "samurai-exp-root-3",
      "group": 3,
      "skill": {
        "id": "samurai-exp-3-2-skill",
        "name": "無明斬",
        "cost": 30,
        "target": "enemy",
        "type": "xj",
        "description": "無明斬。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 1.9500000000000002,
          "hits": 1,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-root-4",
      "name": "無明の太刀",
      "desc": "無明の太刀。武士の戦い方を発展させる技。",
      "kind": "root",
      "sourceNode": "b",
      "group": 4,
      "skill": {
        "id": "samurai-exp-root-4-skill",
        "name": "無明の太刀",
        "cost": 21,
        "target": "enemy",
        "type": "xj",
        "description": "無明の太刀。武士の戦い方を発展させる技。",
        "xj": {
          "kind": "phys",
          "mult": 1.5099999999999998,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-4-1",
      "name": "燕返し",
      "desc": "燕返し。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "samurai-exp-root-4",
      "group": 4,
      "skill": {
        "id": "samurai-exp-4-1-skill",
        "name": "燕返し",
        "cost": 32,
        "target": "enemy",
        "type": "xj",
        "description": "燕返し。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 0.72,
          "hits": 2,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-4-2",
      "name": "明鏡止水",
      "desc": "明鏡止水。前段階の技から派生する上位スキル。",
      "kind": "branch",
      "parentId": "samurai-exp-root-4",
      "group": 4,
      "skill": {
        "id": "samurai-exp-4-2-skill",
        "name": "明鏡止水",
        "cost": 34,
        "target": "enemy",
        "type": "xj",
        "description": "明鏡止水。前段階の技から派生する上位スキル。",
        "xj": {
          "kind": "phys",
          "mult": 2.19,
          "hits": 1,
          "element": "斬撃",
          "fx": "slash"
        }
      }
    },
    {
      "id": "samurai-exp-solo-1",
      "name": "武士の魂",
      "desc": "武士の魂。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "samurai-exp-solo-1-skill",
        "name": "武士の魂",
        "cost": 16,
        "target": "self",
        "type": "xj",
        "description": "武士の魂。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "attackUp": {
              "turns": 3,
              "power": 0.28
            }
          }
        }
      }
    },
    {
      "id": "samurai-exp-solo-2",
      "name": "心眼",
      "desc": "心眼。派生ルートに属さない独立スキル。",
      "kind": "solo",
      "skill": {
        "id": "samurai-exp-solo-2-skill",
        "name": "心眼",
        "cost": 24,
        "target": "self",
        "type": "xj",
        "description": "心眼。派生ルートに属さない独立スキル。",
        "xj": {
          "buff": {
            "attackUp": {
              "turns": 3,
              "power": 0.2
            },
            "defenseUp": {
              "turns": 3,
              "power": 0.2
            }
          }
        }
      }
    }
  ]
};
