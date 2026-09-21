(function (root, factory) {
  const manifest = factory();
  if (typeof module === "object" && module.exports) module.exports = manifest;
  if (root) root.RedbeardGameplayAssets = manifest;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  return Object.freeze({
    version: 1,
    conservation: Object.freeze({
      damaged: "assets/gameplay/conservation/images/damaged.png",
      restored: "assets/gameplay/conservation/images/restored.png",
      workbench: "assets/gameplay/conservation/images/workbench.png",
      poster: "assets/gameplay/conservation/images/poster.png",
      fallbackVideo: "assets/gameplay/conservation/video/complete-fallback.mp4",
      puzzle: "assets/gameplay/conservation/masks/puzzle.json",
      license: "assets/gameplay/conservation/LICENSE.txt",
      tools: Object.freeze({
        brush: "assets/gameplay/conservation/tools/soft-brush.png",
        swab: "assets/gameplay/conservation/tools/swab.png",
        press: "assets/gameplay/conservation/tools/press-pad.png",
        light: "assets/gameplay/conservation/tools/side-light.png"
      }),
      crop: Object.freeze({ sourceSize: Object.freeze([1672, 941]), rectangle: Object.freeze([338, 128, 766, 520]), purpose: "Approved inner-canvas surface; excludes frame and workbench" }),
      metadata: Object.freeze({
        damaged: Object.freeze({ sha256: "f18659555bfe6de87f57e5f7574cf1c6bb0e945a95fe921cfdaa6bf6c4dd9492", width: 766, height: 520, purpose: "interactive damaged canvas surface" }),
        restored: Object.freeze({ sha256: "2a98fec5b514afacae660318329901624205f08583c1e2c4a5b26a52b1e60834", width: 766, height: 520, purpose: "Canvas reveal source and completed surface" }),
        poster: Object.freeze({ sha256: "2a98fec5b514afacae660318329901624205f08583c1e2c4a5b26a52b1e60834", width: 766, height: 520, purpose: "completion video poster and static fallback" }),
        fallbackVideo: Object.freeze({ sha256: "8813bc112200a9a56c52de2bd1fad35531fccf884094de6a6f412dea64120daa", width: 1152, height: 780, purpose: "four-second H.264 completion fallback" }),
        brush: Object.freeze({ sha256: "b06797eea46766df3cb23ac87a1647b707659333463e03cf676a287c21e27eba", width: 125, height: 360, purpose: "true-alpha soft brush tool" }),
        swab: Object.freeze({ sha256: "1d1af5d256b54e6a65aae511a21eb1342c7a4ca27c21c88dbfdd4eec652561e1", width: 92, height: 225, purpose: "true-alpha cotton swab tool" }),
        press: Object.freeze({ sha256: "476bc367ddc91fe858c7a3ecf77cce563668a09f0de8921f26cd5d1070a47649", width: 150, height: 205, purpose: "true-alpha pressure pad tool" }),
        light: Object.freeze({ sha256: "c10ea42684bf035d87f2a6d5dfb3a676e4789236aeb1a3080b61cf93f8fb01e0", width: 400, height: 320, purpose: "true-alpha side-light tray tool; cursor uses light band only" })
      })
    }),
    storage: Object.freeze({
      subjects: Object.freeze(["assets/images/frame-storage-workroom.png"]),
      tools: Object.freeze(["../../assets/ui-v2/tool-storage.png"]),
      completion: Object.freeze({
        poster: "assets/gameplay/storage/images/poster.png",
        video: "assets/gameplay/storage/video/complete.mp4",
        posterSha256: "f0aa7174c7d1a4eb3c42cc6ffd4be94721bf3040964f6e3dfb6debbe33ebd3d7",
        videoSha256: "69a909fd5813c0442e40481f0d708e0617a66c21257d4b37dbc211a0a3ddc0f5"
      })
    }),
    evidence: Object.freeze({
      subjects: Object.freeze(["assets/images/paintings-worn-boots.png"]),
      tools: Object.freeze(["../../assets/ui-v2/tool-magnifier.png"]),
      completion: Object.freeze({
        poster: "assets/gameplay/evidence/images/poster.png",
        video: "assets/gameplay/evidence/video/complete.mp4",
        posterSha256: "df49843f45f3984d6cb963040d0f36d7185c524375f10361ee93ac7fc95fb5a4",
        videoSha256: "d8bb525955d880c64ad18b2073b791e208b1c59a75b5d05f7dc35274516c93c6"
      })
    }),
    carving: Object.freeze({
      subject: "assets/gameplay/tahitian-wood-carving.png",
      sha256: "c64ddd5d3522e35b137c3dea3c32b63fba14a07eb8d3c8227f44e820ed4e6035",
      width: 1024,
      height: 1536,
      alpha: true
    }),
    gallery: Object.freeze({
      subjects: Object.freeze(["assets/images/backgrounds/title.png", "assets/images/backgrounds/chapter-1.png", "assets/images/backgrounds/chapter-2.png", "assets/images/paintings-worn-boots.png", "assets/images/backgrounds/chapter-3.png", "assets/images/backgrounds/chapter-4.png"]),
      tools: Object.freeze(["../../assets/ui-v2/wax-seal.png"])
    }),
    jigsaw: Object.freeze({
      subjects: Object.freeze(["assets/images/backgrounds/chapter-3.png", "assets/images/canvas-back.png"]),
      tools: Object.freeze(["../../assets/ui-v2/tool-jigsaw.png"])
    }),
    routeMemory: Object.freeze({
      desk: "assets/gameplay/route-memory/images/desk.png",
      poster: "assets/gameplay/route-memory/images/poster.png",
      completeVideo: "assets/gameplay/route-memory/video/complete.mp4",
      tools: Object.freeze(["../../assets/ui-v2/tool-route.png"])
    }),
    routeEndings: Object.freeze({
      A: Object.freeze({ poster: "assets/gameplay/route-endings/images/route-a-poster.png", video: "assets/gameplay/route-endings/video/route-a-memory-witness.mp4" }),
      B: Object.freeze({ poster: "assets/gameplay/route-endings/images/route-b-poster.png", video: "assets/gameplay/route-endings/video/route-b-painting-guardian.mp4" }),
      C: Object.freeze({ poster: "assets/gameplay/route-endings/images/route-c-poster.png", video: "assets/gameplay/route-endings/video/route-c-art-supporter.mp4" })
    })
  });
});
