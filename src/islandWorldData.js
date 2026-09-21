// Coordinates follow the actual paths and bridge decks in island-world.png.
// Artwork and navigation share a 1600 × 1000 world, independent of viewport size.
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1000;

export const islands = [
  { id: "about", name: "关于我", kicker: "01 · 初见小屋", description: "经历、角色与我的设计视角", node: "about", label: { x: 224, y: 561 }, color: "#8a6546" },
  { id: "huazhongren", name: "画中人", kicker: "02 · 故事画廊", description: "让画作成为可以参与的故事", node: "huazhongren", label: { x: 461, y: 254 }, color: "#ae7541" },
  { id: "process", name: "设计方法", kicker: "03 · 灵感工坊", description: "从体验目标到规则与验证", node: "process", label: { x: 909, y: 147 }, color: "#537a70" },
  { id: "minguo", name: "民国诡事", kicker: "04 · 迷雾旧镇", description: "叙事、谜题与团队协作交付", node: "minguo", label: { x: 1310, y: 309 }, color: "#9d5849" },
  { id: "survivor", name: "土豆幸存者", kicker: "05 · 冒险营地", description: "战斗循环、数值与快速原型", node: "survivor", label: { x: 1196, y: 652 }, color: "#70834b" },
  { id: "contact", name: "联系我", kicker: "06 · 来信灯塔", description: "期待一起做值得体验的游戏", node: "contact", label: { x: 656, y: 735 }, color: "#477e88" },
];

export const nodes = {
  about: { x: 302, y: 631 },
  a1: { x: 381, y: 615 }, a2: { x: 396, y: 583 }, a2b: { x: 365, y: 548 }, a3: { x: 301, y: 507 },
  ap1: { x: 312, y: 484 }, ap2: { x: 349, y: 440 }, ap3: { x: 386, y: 382 },
  p1: { x: 400, y: 359 }, p2: { x: 440, y: 333 }, huazhongren: { x: 461, y: 299 },
  p3: { x: 533, y: 290 }, p4: { x: 597, y: 271 }, p5: { x: 654, y: 235 },
  pw1: { x: 700, y: 235 }, pw2: { x: 761, y: 215 }, pw3: { x: 811, y: 192 },
  w1: { x: 855, y: 190 }, process: { x: 909, y: 192 }, w2: { x: 984, y: 203 },
  wm1: { x: 1018, y: 240 }, wm2: { x: 1072, y: 271 }, wm3: { x: 1131, y: 277 },
  m1: { x: 1177, y: 291 }, m2: { x: 1221, y: 332 }, minguo: { x: 1310, y: 357 },
  m3: { x: 1315, y: 412 }, ms1: { x: 1313, y: 464 }, ms2: { x: 1300, y: 519 }, ms3: { x: 1283, y: 563 },
  s1: { x: 1272, y: 585 }, s2: { x: 1215, y: 641 }, survivor: { x: 1196, y: 703 },
  s3: { x: 1115, y: 708 }, s4: { x: 1062, y: 709 }, s5: { x: 980, y: 728 },
  sc1: { x: 941, y: 749 }, sc2: { x: 866, y: 778 }, sc3: { x: 787, y: 780 },
  c1: { x: 731, y: 794 }, contact: { x: 656, y: 788 }, c2: { x: 610, y: 752 }, c3: { x: 552, y: 735 },
  ca1: { x: 498, y: 735 }, ca2: { x: 448, y: 702 }, ca3: { x: 404, y: 654 }, a4: { x: 373, y: 639 },
};

const ring = ["about", "a1", "a2", "a2b", "a3", "ap1", "ap2", "ap3", "p1", "p2", "huazhongren", "p3", "p4", "p5", "pw1", "pw2", "pw3", "w1", "process", "w2", "wm1", "wm2", "wm3", "m1", "m2", "minguo", "m3", "ms1", "ms2", "ms3", "s1", "s2", "survivor", "s3", "s4", "s5", "sc1", "sc2", "sc3", "c1", "contact", "c2", "c3", "ca1", "ca2", "ca3", "a4", "about"];
export const edges = ring.slice(1).map((id, index) => [ring[index], id]);
