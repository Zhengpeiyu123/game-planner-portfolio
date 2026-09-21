(() => {
  "use strict";

  const SAVE_KEY = "red-beard-h5-save-v5";
  const SETTINGS_KEY = "red-beard-h5-settings-v2";
  const storageMemory = new Map();
  let persistenceWarningShown = false;

  function showPersistenceWarning() {
    if (persistenceWarningShown) return;
    persistenceWarningShown = true;
    const notice = document.querySelector("#persistence-notice");
    if (notice) notice.hidden = false;
  }

  function safeStorageGet(key) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) storageMemory.set(key, value);
      return value ?? storageMemory.get(key) ?? null;
    } catch { return storageMemory.get(key) ?? null; }
  }

  function safeStorageSet(key, value) {
    storageMemory.set(key, String(value));
    try { localStorage.setItem(key, String(value)); return true; }
    catch { showPersistenceWarning(); return false; }
  }

  function safeStorageRemove(key) {
    storageMemory.delete(key);
    try { localStorage.removeItem(key); return true; }
    catch { return false; }
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const els = {
    game: $("#game"),
    screens: $$(".screen"),
    title: $("#title-screen"),
    cinematic: $("#cinematic-screen"),
    cinematicVideo: $("#cinematic-video"),
    cinematicFallback: $("#cinematic-fallback"),
    cinematicCaption: $("#cinematic-caption"),
    story: $("#story-screen"),
    puzzle: $("#puzzle-screen"),
    transition: $("#transition-screen"),
    ending: $("#ending-screen"),
    video: $("#scene-video"),
    fallback: $("#scene-fallback"),
    character: $("#character-layer"),
    chapterNumber: $("#chapter-number"),
    chapterTitle: $("#chapter-title"),
    chapterLocation: $("#chapter-location"),
    objectiveText: $("#objective-text"),
    objectiveProgress: $("#objective-progress"),
    objectiveCard: $("#objective-card"),
    hintButton: $("#hint-button"),
    hintCount: $("#hint-count"),
    puzzleHintButton: $("#puzzle-hint-button"),
    guideTip: $("#guide-tip"),
    hudActions: $(".hud-actions"),
    hotspots: $("#hotspot-layer"),
    dialogue: $("#dialogue-panel"),
    playerPortrait: $("#player-portrait"),
    npcPortrait: $("#npc-portrait"),
    npcName: $("#npc-name"),
    affinityValue: $("#affinity-value"),
    leftCharacter: $("#left-character"),
    rightCharacter: $("#right-character"),
    speakerName: $("#speaker-name"),
    dialogueText: $("#dialogue-text"),
    choiceList: $("#choice-list"),
    advanceHint: $("#advance-hint"),
    exploreContinue: $("#explore-continue"),
    toast: $("#toast"),
    continueBtn: $("#continue-btn"),
    puzzleKicker: $("#puzzle-kicker"),
    puzzleTitle: $("#puzzle-title"),
    puzzleInstruction: $("#puzzle-instruction"),
    puzzleCounter: $("#puzzle-counter"),
    puzzleContent: $("#puzzle-content"),
    puzzleFinish: $("#puzzle-finish"),
    transitionTitle: $("#transition-title"),
    transitionQuote: $("#transition-quote"),
    transitionCopy: $("#transition-copy"),
    nextChapter: $("#next-chapter-btn"),
    endingTitle: $("#ending-title"),
    endingQuote: $("#ending-quote"),
    endingSummary: $("#ending-summary"),
    journal: $("#journal-modal"),
    witnessList: $("#witness-list"),
    journalProgress: $("#journal-progress-text"),
    backlog: $("#backlog-modal"),
    backlogList: $("#backlog-list"),
    settings: $("#settings-modal"),
    chapters: $("#chapters-modal"),
    chapterGrid: $("#chapter-grid"),
    pause: $("#pause-modal"),
    hintQuiz: $("#hint-quiz-modal"),
    quizQuestion: $("#quiz-question"),
    quizOptions: $("#quiz-options"),
    quizFeedback: $("#quiz-feedback"),
    volume: $("#volume-range"),
    textSpeed: $("#text-speed"),
    reduceMotion: $("#reduce-motion"),
    highContrast: $("#high-contrast"),
    tutorialMode: $("#tutorial-mode"),
    skipSeenCinematics: $("#skip-seen-cinematics"),
    onboardingOverlay: $("#onboarding-overlay"),
    onboardingFocus: $("#onboarding-focus"),
    onboardingCard: $("#onboarding-card"),
    onboardingTitle: $("#onboarding-title"),
    onboardingText: $("#onboarding-text"),
    canvas: $("#fx-canvas")
  };

  const portraits = {
    "旁白": "assets/images/characters/etienne-alpha.png",
    "艾蒂安": "assets/images/characters/etienne-alpha.png",
    "唐吉老爹": "assets/images/characters/tanguy.png",
    "男人": "assets/images/characters/theo.png",
    "提奥": "assets/images/characters/theo.png",
    "保罗": "assets/images/characters/gauguin-alpha.png"
  };

  const cinematics = {
    opening: { src: "assets/video/opening.mp4" },
    "transition-1-2": { src: "assets/video/transition-1-2.mp4" },
    "transition-2-3": { src: "assets/video/transition-2-3.mp4" },
    "transition-3-4": { src: "assets/video/transition-3-4.mp4" },
    ending: { src: "assets/video/ending.mp4" },
    "route-memory": { src: "assets/gameplay/route-memory/video/complete.mp4", poster: "assets/gameplay/route-memory/images/poster.png" },
    "ending-A": { src: "assets/gameplay/route-endings/video/route-a-memory-witness.mp4", poster: "assets/gameplay/route-endings/images/route-a-poster.png" },
    "ending-B": { src: "assets/gameplay/route-endings/video/route-b-painting-guardian.mp4", poster: "assets/gameplay/route-endings/images/route-b-poster.png" },
    "ending-C": { src: "assets/gameplay/route-endings/video/route-c-art-supporter.mp4", poster: "assets/gameplay/route-endings/images/route-c-poster.png" }
  };

  const chapterMeta = [
    {
      roman: "第一章",
      title: "唐吉老爹",
      location: "唐吉老爹画材店",
      question: "你为什么想成为画家？",
      video: "assets/video/art-shop.mp4",
      fallback: "assets/images/backgrounds/chapter-1.png",
      memory: "你为什么想成为画家？",
      witness: "唐吉老爹",
      portrait: portraits["唐吉老爹"]
    },
    {
      roman: "第二章",
      title: "卖画的人",
      location: "画廊",
      question: "艺术应该被理解，还是被看见？",
      video: "assets/video/gallery.mp4",
      fallback: "assets/images/backgrounds/chapter-2.png",
      memory: "艺术应该被理解，还是被看见？",
      witness: "提奥",
      portrait: portraits["提奥"]
    },
    {
      roman: "第三章",
      title: "画家工作室",
      location: "画家工作室",
      question: "艺术是复制世界，还是创造世界？",
      video: "assets/video/studio.mp4",
      fallback: "assets/images/backgrounds/chapter-3.png",
      memory: "艺术是复制世界，还是创造世界？",
      witness: "保罗",
      portrait: portraits["保罗"]
    },
    {
      roman: "第四章",
      title: "葬礼",
      location: "葬礼",
      question: "没有见到他，是否仍算找到？",
      video: "assets/video/funeral.mp4",
      fallback: "assets/images/backgrounds/chapter-4.png",
      memory: "寻找结束，理解开始。",
      witness: "提奥",
      portrait: portraits["提奥"]
    }
  ];

  const sceneOverrides = {
    artShopFront: {
      video: "assets/video/art-shop-front.mp4",
      fallback: "assets/images/backgrounds/art-shop-front.png",
      alt: "唐吉老爹画材店门口"
    }
  };

  const quizQuestions = [
    { id: "double", question: "数列 2、4、8、16，下一个数是多少？", options: ["18", "24", "32"], answer: 2, explanation: "每个数都是前一个数的2倍。" },
    { id: "odd", question: "下面哪一个数与其他数不同？", options: ["3", "5", "8"], answer: 2, explanation: "3和5是奇数，8是偶数。" },
    { id: "order", question: "红盒在蓝盒左边，蓝盒在绿盒左边。最右边是什么颜色？", options: ["红色", "蓝色", "绿色"], answer: 2, explanation: "从左到右依次是红、蓝、绿。" },
    { id: "sum", question: "1加2加3加4等于多少？", options: ["9", "10", "11"], answer: 1, explanation: "1＋2＋3＋4＝10。" },
    { id: "clock", question: "钟表正好3点时，时针和分针形成什么角？", options: ["直角", "锐角", "平角"], answer: 0, explanation: "3点时两根指针相差90度，是直角。" },
    { id: "fold", question: "一张纸对折一次，再打一个孔，展开后通常有几个孔？", options: ["1个", "2个", "4个"], answer: 1, explanation: "一次对折形成两层，所以展开后有两个对称孔。" },
    { id: "sequence", question: "数列 1、3、5、7，下一个数是多少？", options: ["8", "9", "10"], answer: 1, explanation: "这是连续奇数，每次增加2。" },
    { id: "shape", question: "三角形有3条边，两个三角形一共有多少条边？", options: ["5条", "6条", "8条"], answer: 1, explanation: "3加3等于6。" }
  ];

  const nodes = {
    c1_intro: {
      chapter: 0,
      kind: "dialogue",
      objective: "与唐吉老爹交谈",
      lines: [
        ["艾蒂安", "唐吉老兄，你欠的半年房租什么时候交？"],
        ["唐吉老爹", "哦我的老板"],
        ["唐吉老爹", "我的钱都用来接济那些贫穷的画家了，但我一定尽快交上房租。"]
      ],
      next: "c1_rent_1"
    },
    c1_rent_1: {
      chapter: 0,
      kind: "choice",
      objective: "回应唐吉老爹",
      speaker: "唐吉老爹",
      text: "我的钱都用来接济那些贫穷的画家了，但我一定尽快交上房租。",
      choices: [
        { text: "你半个月后再交不上，就和你的这些破画滚蛋吧！", score: -10, reply: ["唐吉老爹", "哦，不理解艺术的老板，我比你更能和他们感同身受。"], next: "c1_rent_2" },
        { text: "那你继续攒攒吧，也不知道他们这些人成名后还有多少人能记着你。（苦笑）", score: 10, reply: ["唐吉老爹", "哦，不理解艺术的老板，我比你更能和他们感同身受。"], next: "c1_rent_2" }
      ]
    },
    c1_rent_2: {
      chapter: 0,
      kind: "choice",
      objective: "继续交谈",
      speaker: "唐吉老爹",
      text: "哦，不理解艺术的老板，我比你更能和他们感同身受。",
      choices: [
        { text: "艺术能当饭吃吗！", score: -10, reply: ["唐吉老爹", "这一屋子都是我的精神养料，你不懂的。"], next: "c1_rent_3" },
        { text: "我不理解你的艺术，但我知道你要饿死了。", score: 10, reply: ["唐吉老爹", "这一屋子都是我的精神养料，你不懂的。"], next: "c1_rent_3" }
      ]
    },
    c1_rent_3: {
      chapter: 0,
      kind: "choice",
      objective: "结束交谈",
      speaker: "唐吉老爹",
      text: "这一屋子都是我的精神养料，你不懂的。",
      choices: [
        { text: "希望这些画真的能给你带来好运，我先走了。", score: 10, next: "c1_departure" },
        { text: "那好吧，到时候我会给你收尸的，我先走了。", score: -10, next: "c1_departure" }
      ]
    },
    c1_departure: {
      chapter: 0,
      scene: "artShopFront",
      kind: "dialogue",
      objective: "准备离开画材店",
      lines: [
        ["旁白", "主角准备离开"],
        ["旁白", "他经过门口。"],
        ["旁白", "那里摆着许多二手画。"],
        ["旁白", "艾蒂安习惯性查看。"]
      ],
      next: "c1_find_painting"
    },
    c1_find_painting: {
      chapter: 0,
      scene: "artShopFront",
      kind: "explore",
      objective: "离开画材店",
      required: 1,
      showProgress: false,
      hotspots: [
        { id: "ordinary_painting", x: 79, y: 68, hitWidth: 180, hitHeight: 260, label: "一幅普通风景画", clue: "藏在后面的油画", text: "艾蒂安移动一幅普通风景画，后面露出另一幅油画。" }
      ],
      next: "c1_art_intro"
    },
    c1_art_intro: {
      chapter: 0,
      scene: "artShopFront",
      kind: "dialogue",
      objective: "查看露出的油画",
      lines: [
        ["艾蒂安", "这幅画……"],
        ["艾蒂安", "为什么它让我觉得……它夺走了我的灵魂！！"],
        ["唐吉老爹", "因为那个家伙画画的时候，把它当成一个新生儿在创作。"]
      ],
      next: "c1_art_1"
    },
    c1_art_1: {
      chapter: 0,
      scene: "artShopFront",
      kind: "choice",
      objective: "回应唐吉老爹",
      speaker: "唐吉老爹",
      text: "因为那个家伙画画的时候，把它当成一个新生儿在创作。",
      choices: [
        { text: "我看这个孩子像我和他一起的孩子。", score: 10, replyLines: [["唐吉老爹", "每一幅画都是有生命的，我看出来你喜欢他了。"], ["唐吉老爹", "这个画家确实很有意思。"]], next: "c1_art_2" },
        { text: "画怎么可能有生命呢？", score: -10, replyLines: [["唐吉老爹", "每一幅画都是有生命的，我看出来你喜欢他了。"], ["唐吉老爹", "这个画家确实很有意思。"]], next: "c1_art_2" }
      ]
    },
    c1_art_2: {
      chapter: 0,
      scene: "artShopFront",
      kind: "choice",
      objective: "继续询问画家",
      speaker: "唐吉老爹",
      text: "这个画家确实很有意思。",
      choices: [
        { text: "他是谁？我想投资他的画作。", score: 10, next: "c1_gate" },
        { text: "快算了吧，只不过这一幅恰好还不错。", score: -10, next: "c1_gate" }
      ]
    },
    c1_gate: {
      chapter: 0,
      scene: "artShopFront",
      kind: "dialogue",
      objective: "等待唐吉老爹的回应",
      lines: [["唐吉老爹", "那你帮我把这些东西整理一下，我可以告诉你关于他的线索。"]],
      next: "c1_puzzle"
    },
    c1_puzzle: {
      chapter: 0,
      scene: "artShopFront",
      kind: "puzzle",
      objective: "帮唐吉老爹整理东西",
      puzzle: "storage",
      title: "画框仓储",
      instruction: "根据尺寸、重量和表层状态，安全移开上层画作。",
      next: "c1_scratch"
    },
    c1_scratch: {
      chapter: 0,
      scene: "artShopFront",
      kind: "puzzle",
      objective: "擦去画框上的灰尘",
      puzzle: "conservation",
      title: "画作勘察与控制清理",
      instruction: "先用侧光检查，再用合适工具显露印记和日期。",
      next: "c1_disposition"
    },
    c1_disposition: {
      chapter: 0,
      scene: "artShopFront",
      kind: "choice",
      objective: "决定房租与画作如何处理",
      speaker: "唐吉老爹",
      text: "画已经找出来了。房租呢？",
      choices: [
        { text: "画先留在你这儿。房租再缓一个月，我去找画它的人。", set: { routeId:"A", paintingOwner:"tanguy", hasOriginal:false, hasCommissionPainting:false, hasMoney:false, hasReceipt:false }, replyLines: [["唐吉老爹", "你这是心疼画，还是心疼我的房租？"], ["艾蒂安", "两样都心疼。可连名字都不知道，我拿走算什么。"], ["唐吉老爹", "行。查明白了，回来告诉我。"]], next:"c1_reward" },
        { text: "这幅画抵一个月房租。我带走，也去找画它的人。", set: { routeId:"pending", paintingOwner:"etienne", hasOriginal:true, hasCommissionPainting:false, hasMoney:false, hasReceipt:false }, replyLines: [["唐吉老爹", "现在它只值一个月房租？"], ["艾蒂安", "我说的是欠账，不是画价。等找到人，我再问这画该去哪。"], ["唐吉老爹", "这话我记着。"]], next:"c1_reward" }
      ]
    },
    c1_reward: {
      chapter: 0,
      kind: "reward",
      title: "贝尔纳画廊",
      quote: "",
      copy: "获得一个红胡子碎片。",
      memory: "你为什么想成为画家？",
      nextChapter: 1
    },

    c2_intro: {
      chapter: 1,
      kind: "dialogue",
      objective: "询问红色胡子的画家",
      lines: [
        ["艾蒂安", "请问……"],
        ["艾蒂安", "您认识一位红色胡子的画家吗？"],
        ["艾蒂安", "我想和他谈谈。"],
        ["男人", "..."],
        ["男人", "很多人喜欢他的画。"],
        ["男人", "但很少有人真正想认识他。"]
      ],
      next: "c2_q1"
    },
    c2_q1: {
      chapter: 1,
      kind: "choice",
      objective: "回应男人",
      speaker: "男人",
      text: "但很少有人真正想认识他。",
      choices: [
        { text: "你能跟我讲讲他的故事吗？", score: 10, reply: ["男人", "他画了无数双鞋。你知道为什么吗？"], next: "c2_q2" },
        { text: "听起来他不是好相处的人。", score: -10, reply: ["男人", "他画了无数双鞋。你知道为什么吗？"], next: "c2_q2" }
      ]
    },
    c2_q2: {
      chapter: 1,
      kind: "choice",
      objective: "回答关于鞋的问题",
      speaker: "男人",
      text: "他画了无数双鞋。你知道为什么吗？",
      choices: [
        { text: "他一定有他的道理。", score: 10, replyLines: [["男人", "他画的从来不是鞋。"], ["男人", "他画的是那些没有名字的人。"]], next: "c2_q3" },
        { text: "画这么无聊的东西干什么。", score: -10, replyLines: [["男人", "他画的从来不是鞋。"], ["男人", "他画的是那些没有名字的人。"]], next: "c2_q3" }
      ]
    },
    c2_q3: {
      chapter: 1,
      kind: "choice",
      objective: "继续交谈",
      speaker: "男人",
      text: "他画的是那些没有名字的人。",
      choices: [
        { text: "他想记住这些没有名字的人吗。", score: 10, replyLines: [["男人", "这个世界上有太多人努力生活。"], ["男人", "可是没有人记得他们。"], ["男人", "没有人为他们留下画像。"], ["男人", "没有人为他们写下故事。"]], next: "c2_q4" },
        { text: "没人在意那群人，更别说鞋。", score: -10, replyLines: [["男人", "这个世界上有太多人努力生活。"], ["男人", "可是没有人记得他们。"], ["男人", "没有人为他们留下画像。"], ["男人", "没有人为他们写下故事。"]], next: "c2_q4" }
      ]
    },
    c2_q4: {
      chapter: 1,
      kind: "choice",
      objective: "理解鞋的意义",
      speaker: "男人",
      text: "没有人为他们写下故事。",
      choices: [
        { text: "所以能代表他们劳动过程的鞋，也代表了他们。", score: 10, replyLines: [["提奥", "我是他的弟弟。"], ["提奥", "他认为这个世界上有很多人的痛苦，没有人愿意记录。"], ["提奥", "所以就由他的画作来留下这些故事。"]], next: "c2_q5" },
        { text: "不明白记录他们的鞋有什么意义。", score: -10, replyLines: [["提奥", "我是他的弟弟。"], ["提奥", "他认为这个世界上有很多人的痛苦，没有人愿意记录。"], ["提奥", "所以就由他的画作来留下这些故事。"]], next: "c2_q5" }
      ]
    },
    c2_q5: {
      chapter: 1,
      kind: "choice",
      objective: "回应提奥",
      speaker: "提奥",
      text: "所以就由他的画作来留下这些故事。",
      choices: [
        { text: "他真伟大。", score: 10, next: "c2_gate" },
        { text: "他不会觉得自己很伟大吧...", score: -10, next: "c2_gate" }
      ]
    },
    c2_gate: {
      chapter: 1,
      kind: "dialogue",
      objective: "等待提奥的回应",
      lines: [["提奥", "高更前段时间刚回巴黎，他曾经和我哥哥一起生活过一段时间。"]],
      next: "c2_inspect"
    },
    c2_inspect: {
      chapter: 1,
      kind: "puzzle",
      objective: "观察旧靴画中的细节",
      puzzle: "evidence",
      title: "放大镜与证据卡",
      instruction: "移动放大镜发现痕迹，再匹配对应判断。",
      next: "c2_route_split"
    },
    c2_route_split: {
      chapter: 1,
      kind: "branch",
      branches: [{ when:{ hasOriginal:true }, to:"c2_original_intro" }],
      default: "c2_a_intro"
    },
    c2_a_intro: {
      chapter: 1,
      kind: "dialogue",
      objective: "接受提奥的送画委托",
      set: { routeId:"A", paintingOwner:"tanguy", hasOriginal:false, hasCommissionPainting:true },
      lines: [
        ["提奥", "高更刚回巴黎。他和我哥哥一起住过一阵。"],
        ["艾蒂安", "那你不能直接把你哥哥的地址给我吗？"],
        ["提奥", "不能。先替我把一幅画送给高更。你见了他，再问。"],
        ["提奥", "委托单上有五项：中尺寸、贝尔纳画框厂印、1888年、右下修补、劳动题材。六幅画都要看正背面，不符合的要留下排除理由。"],
        ["艾蒂安", "好。画在哪？"]
      ],
      next: "c2_puzzle"
    },
    c2_original_intro: {
      chapter: 1,
      kind: "dialogue",
      objective: "让提奥核验无名原画",
      lines: [
        ["提奥", "这幅画很像他的。也有人愿意买。"],
        ["艾蒂安", "能卖多少？"],
        ["提奥", "你倒直接。"],
        ["艾蒂安", "我欠着钱。绕弯子也不会少一枚铜板。"],
        ["提奥", "先按委托单找画：中尺寸、贝尔纳画框厂印、1888年、右下修补、劳动题材。每幅都查正背面，再写下排除理由。"],
        ["提奥", "那先把我要送给高更的画找出来。回来以后，你自己选。"]
      ],
      next: "c2_puzzle"
    },
    c2_puzzle: {
      chapter: 1,
      kind: "puzzle",
      objective: "在画廊找到要送出的画",
      puzzle: "gallery-deduction",
      title: "委托单多条件排除",
      instruction: "逐幅检查正背面，记录符合、排除或待定。",
      next: "c2_after_puzzle"
    },
    c2_after_puzzle: {
      chapter: 1,
      kind: "branch",
      branches: [{ when:{ hasOriginal:true }, to:"c2_original_choice" }],
      default: "c2_a_after"
    },
    c2_a_after: {
      chapter: 1,
      kind: "dialogue",
      objective: "带上委托画前往高更工作室",
      lines: [["提奥", "委托画已经找出。把它完整送到高更手上，再问你真正想知道的事。"]],
      next: "c2_reward"
    },
    c2_original_choice: {
      chapter: 1,
      kind: "choice",
      objective: "决定保留还是卖出原画",
      speaker: "提奥",
      text: "买家愿意出钱。你留画，还是卖？",
      choices: [
        { text:"我先留着。人还没找到，画不能先没了。", set:{ routeId:"B", paintingOwner:"etienne", hasOriginal:true, hasMoney:false, hasReceipt:false, hasCommissionPainting:false }, replyLines:[["提奥", "留着画，账单可不会自己走。"], ["艾蒂安", "我知道。先让我把这件事弄明白。"], ["提奥", "那去问高更。他认得我哥哥的画。"]], next:"c2_reward" },
        { text:"卖。先还账，剩下的钱交给画家。", set:{ routeId:"C", paintingOwner:"buyer", hasOriginal:false, hasMoney:true, hasReceipt:true, hasCommissionPainting:false }, replyLines:[["提奥", "你给自己留多少？"], ["艾蒂安", "够还眼前的账。其余的都带上。"], ["提奥", "收据也带上。别只带一句好心。"], ["艾蒂安", "好。"]], next:"c2_reward" }
      ]
    },
    c2_reward: {
      chapter: 1,
      kind: "reward",
      title: "高更住址",
      quote: "",
      copy: "获得一个红胡子碎片。",
      memory: "艺术应该被理解，还是被看见？",
      nextChapter: 2
    },

    c3_intro: {
      chapter: 2,
      kind: "dialogue",
      objective: "敲门",
      lines: [
        ["艾蒂安", "敲门声"],
        ["保罗", "把画在桌上，别碰坏了我的塔希提木雕！"]
      ],
      next: "c3_route_entry"
    },
    c3_route_entry: {
      chapter: 2,
      kind: "branch",
      branches: [
        { when:{ routeId:"A" }, to:"c3_route_a" },
        { when:{ routeId:"B" }, to:"c3_route_b" },
        { when:{ routeId:"C" }, to:"c3_route_c" }
      ],
      default: "c3_route_a"
    },
    c3_route_a: {
      chapter: 2,
      kind: "dialogue",
      objective: "交付提奥的委托画",
      set: { routeId:"A", hasCommissionPainting:false, ending:"A" },
      lines: [
        ["艾蒂安", "提奥让我来送画。还想向你打听一个人。"],
        ["保罗", "画放下。你要问谁？"]
      ],
      next: "c3_q1"
    },
    c3_route_b: {
      chapter: 2,
      kind: "dialogue",
      objective: "让高更确认被保留的原画",
      set: { routeId:"B", ending:"B" },
      lines: [
        ["艾蒂安", "这幅画我没卖。你替我看看，是不是他的。"],
        ["保罗", "先放下。等我看完，你再问。"]
      ],
      next: "c3_q1"
    },
    c3_route_c: {
      chapter: 2,
      kind: "dialogue",
      objective: "向高更说明交易与捐助",
      set: { routeId:"C", ending:"C" },
      lines: [
        ["艾蒂安", "画卖了。钱和收据在这儿。我想把余下的钱交给他。"],
        ["保罗", "先把收据收好。你还想问什么？"]
      ],
      next: "c3_q1"
    },
    c3_qte: {
      chapter: 2,
      kind: "puzzle",
      objective: "稳住倾斜的木雕",
      puzzle: "steadyCarving",
      title: "别碰坏木雕",
      instruction: "等指针进入安全区后按住，保持稳定。",
      next: "c3_puzzle"
    },
    c3_q1: {
      chapter: 2,
      kind: "choice",
      objective: "询问梵高",
      speaker: "保罗",
      text: "把画在桌上，别碰坏了我的塔希提木雕！",
      choices: [
        { text: "你的木雕真是精品，顺便...你认识梵高吗？", score: 10, replyLines: [["保罗", "那个疯子！你提他干什么！"], ["保罗", "他可真不是正常人，我俩争吵时候他割掉了自己的耳朵！"]], next: "c3_q2" },
        { text: "矫情的艺术家，你认识梵高吗？", score: -10, replyLines: [["保罗", "那个疯子！你提他干什么！"], ["保罗", "他可真不是正常人，我俩争吵时候他割掉了自己的耳朵！"]], next: "c3_q2" }
      ]
    },
    c3_q2: {
      chapter: 2,
      kind: "choice",
      objective: "继续询问",
      speaker: "保罗",
      text: "他可真不是正常人，我俩争吵时候他割掉了自己的耳朵！",
      choices: [
        { text: "那你们争论的话题一定对彼此都很重要吧？", score: 10, replyLines: [["保罗", "我认为艺术应该创造世界。他觉得艺术应该看见世界。"], ["保罗", "我们吵得不可开交。"]], next: "c3_q3" },
        { text: "你没劝着点？", score: -10, replyLines: [["保罗", "我认为艺术应该创造世界。他觉得艺术应该看见世界。"], ["保罗", "我们吵得不可开交。"]], next: "c3_q3" }
      ]
    },
    c3_q3: {
      chapter: 2,
      kind: "choice",
      objective: "回应艺术观点",
      speaker: "保罗",
      text: "我们吵得不可开交。",
      choices: [
        { text: "的确是个有意义的话题\n世界上没有两个人想的一样，重要的是相互理解。", score: 10, replyLines: [["保罗", "到最后他还是坚持自己的观点，也不愿意听我对艺术的理解。"], ["保罗", "所以割掉了自己的耳朵。听说还画了自画像。"]], next: "c3_q4" },
        { text: "那他太冲动了。", score: -10, replyLines: [["保罗", "到最后他还是坚持自己的观点，也不愿意听我对艺术的理解。"], ["保罗", "所以割掉了自己的耳朵。听说还画了自画像。"]], next: "c3_q4" }
      ]
    },
    c3_q4: {
      chapter: 2,
      kind: "choice",
      objective: "评价两人的画",
      speaker: "保罗",
      text: "所以割掉了自己的耳朵。听说还画了自画像。",
      choices: [
        { text: "你们虽然见解不同，但我能从你们的画中感受到不同的生命力。", score: 10, next: "c3_gate" },
        { text: "听起来这个人像是疯子。", score: -10, next: "c3_gate" }
      ]
    },
    c3_gate: {
      chapter: 2,
      kind: "dialogue",
      objective: "等待保罗的回应",
      set: { hasVanGoghAddress:true },
      lines: [["保罗", "你问对人了。帮我个小忙，我马上给你地址。"]],
      next: "c3_qte"
    },
    c3_puzzle: {
      chapter: 2,
      kind: "puzzle",
      objective: "完成保罗交代的拼图",
      puzzle: "double-jigsaw",
      title: "双面十二块拼画",
      instruction: "旋转并拼合正面，剔除干扰块，翻面后再拼合背面。",
      next: "c3_reward"
    },
    c3_reward: {
      chapter: 2,
      kind: "reward",
      title: "梵高住址",
      quote: "",
      copy: "获得一个红胡子碎片。",
      memory: "艺术是复制世界，还是创造世界？",
      nextChapter: 3
    },

    c4_intro: {
      chapter: 3,
      kind: "dialogue",
      objective: "听提奥说完",
      lines: [
        ["提奥", "你一路寻找他。"],
        ["提奥", "现在后悔吗？"]
      ],
      next: "c4_final"
    },
    c4_final: {
      chapter: 3,
      kind: "choice",
      objective: "回答提奥",
      speaker: "提奥",
      text: "现在后悔吗？",
      choices: [
        { text: "我没有见到他。", score: -10, ending: "absent", replyLines: [["提奥", "他在他的画中。"], ["艾蒂安", "也在人们记忆里。"], ["旁白", "艺术作品的生命力能够横跨时间，让不同时代的人共鸣。"]], next: "c4_assembly" },
        { text: "我已经找到他了。", score: 10, ending: "found", replyLines: [["提奥", "他在他的画中。"], ["艾蒂安", "也在人们记忆里。"], ["旁白", "艺术作品的生命力能够横跨时间，让不同时代的人共鸣。"]], next: "c4_assembly" }
      ]
    },
    c4_assembly: {
      chapter: 3,
      kind: "puzzle",
      objective: "拼合三块红胡子碎片",
      puzzle: "route-memory",
      title: "记忆路线重建",
      instruction: "只用画框记录、收据编号、地址和三段记忆重建路线。",
      next: "c4_memory_cinematic"
    },
    c4_memory_cinematic: {
      chapter: 3,
      kind: "cinematic",
      cinematic: "route-memory",
      next: "c4_route_entry"
    },
    c4_route_entry: {
      chapter: 3,
      kind: "branch",
      branches: [
        { when:{ routeId:"A" }, to:"c4_route_a" },
        { when:{ routeId:"B" }, to:"c4_route_b" },
        { when:{ routeId:"C" }, to:"c4_route_c" }
      ],
      default: "c4_route_a"
    },
    c4_route_a: {
      chapter: 3,
      kind: "dialogue",
      objective: "成为记忆见证者",
      set: { routeId:"A", ending:"A" },
      lines: [
        ["艾蒂安", "我没有见到他。"],
        ["提奥", "可你一路都在听别人说起他。"],
        ["艾蒂安", "唐吉记得他的画，你记得他的鞋，高更记得那场争吵。"],
        ["提奥", "他在他的画中。"],
        ["艾蒂安", "也在人们记忆里。"]
      ],
      next: "__ending"
    },
    c4_route_b: {
      chapter: 3,
      kind: "dialogue",
      objective: "成为画作守护者",
      set: { routeId:"B", ending:"B" },
      lines: [
        ["艾蒂安", "画我带来了。"],
        ["提奥", "还卖吗？"],
        ["艾蒂安", "想过。一路上不止一次。现在我想先把它挂出来，让人知道是谁画的。"],
        ["提奥", "那就别只守着它。让它见人。"],
        ["艾蒂安", "画框背后，我会把这一路查到的都写上。"]
      ],
      next: "__ending"
    },
    c4_route_c: {
      chapter: 3,
      kind: "dialogue",
      objective: "成为艺术援助者",
      set: { routeId:"C", ending:"C" },
      lines: [
        ["艾蒂安", "钱带来了，人却不在了。"],
        ["提奥", "原先想怎么用？"],
        ["艾蒂安", "颜料、房租、面包。随他自己。"],
        ["提奥", "那就拿来办展览吧。让他的画先见到人。"],
        ["艾蒂安", "别写我的名字。钱是他的画换来的。"]
      ],
      next: "__ending"
    }
  };

  const startNodes = ["c1_intro", "c2_intro", "c3_intro", "c4_intro"];

  function defaultSettings() {
    return { volume: 55, textSpeed: "normal", reduceMotion: false, highContrast: false, tutorialMode: "full", skipSeenCinematics: false };
  }

  function defaultState() {
    return {
      narrativeVersion: 2,
      screen: "title",
      chapter: 0,
      node: "c1_intro",
      lineIndex: 0,
      routeId: "pending",
      paintingOwner: "tanguy",
      hasOriginal: false,
      hasCommissionPainting: false,
      hasMoney: false,
      hasReceipt: false,
      hasVanGoghAddress: false,
      hintsByChapter: [3, 3, 3, 3],
      usedQuizIds: [],
      guideSeen: false,
      onboarding: { step: "dialogue", completed: false },
      seenCinematics: [],
      fragments: 0,
      clues: [],
      memories: [],
      observations: {},
      rewarded: [],
      completedPuzzles: [],
      puzzleStates: {},
      puzzleHintStages: {},
      puzzleRatings: {},
      history: [],
      unlockedChapter: 0,
      ending: null,
      runtimeNode: null,
      puzzleProgress: 0,
      settings: loadSettings()
    };
  }

  let state = defaultState();
  let typeTimer = null;
  let typingFullText = "";
  let typingComplete = true;
  let toastTimer = null;
  let activePuzzle = null;
  let selectedCompositionItem = null;
  let selectedMemories = new Set();
  let activeQuiz = null;
  let cinematicNext = null;
  let activeCinematicId = null;
  let particles = [];
  let hostPaused = false;
  let hostPauseStarted = 0;
  let hostPausedDuration = 0;
  let hostManualOffset = 0;
  let hostResumeState = "resumed";
  let hostResumePromise = Promise.resolve(true);
  let resolveHostResume = null;
  let hostResumeInFlight = null;
  let hostTimerId = 0;
  const hostTimers = new Map();
  const hostAdvanceListeners = new Set();
  let steadyRuntimeState = null;

  function scheduleHostTimer(task) {
    task.startedAt = performance.now();
    task.nativeId = window.setTimeout(() => { hostTimers.delete(task.id); task.callback(); }, task.remaining);
  }

  function hostSetTimeout(callback, delay) {
    const task = { id: ++hostTimerId, callback, remaining: Math.max(0, Number(delay) || 0), startedAt: 0, nativeId: null };
    hostTimers.set(task.id, task);
    if (!hostPaused) scheduleHostTimer(task);
    return task.id;
  }

  function pauseHostTimers() {
    const now = performance.now();
    hostTimers.forEach(task => {
      if (task.nativeId === null) return;
      window.clearTimeout(task.nativeId);
      task.nativeId = null;
      task.remaining = Math.max(0, task.remaining - (now - task.startedAt));
    });
  }

  function resumeHostTimers() {
    hostTimers.forEach(task => { if (task.nativeId === null) scheduleHostTimer(task); });
  }

  function hostPause() {
    if (hostPaused) return;
    pauseHostTimers();
    hostPaused = true;
    hostPauseStarted = performance.now();
    hostResumeState = "paused";
    hostResumePromise = new Promise(resolve => { resolveHostResume = resolve; });
    window.dispatchEvent(new CustomEvent("huazhongren:host-state", { detail: { state: hostResumeState } }));
  }

  function completeHostResume() {
    if (!hostPaused) return;
    hostPausedDuration += performance.now() - hostPauseStarted;
    hostPaused = false;
    hostResumeState = "resumed";
    resumeHostTimers();
    resolveHostResume?.(true);
    resolveHostResume = null;
    window.dispatchEvent(new CustomEvent("huazhongren:host-state", { detail: { state: hostResumeState } }));
  }

  const hostClock = (now = performance.now()) => now - hostPausedDuration - (hostPaused ? now - hostPauseStarted : 0) + hostManualOffset;
  function hostAdvanceTime(milliseconds) {
    if (hostPaused || hostResumeState !== "resumed") return hostClock();
    hostManualOffset += Math.max(0, Number(milliseconds) || 0);
    hostAdvanceListeners.forEach(listener => listener(hostClock()));
    return hostClock();
  }
  const emitHostProgress = (stage, extra = {}) => {
    const percent = stage === "ending" ? 100 : Math.max(0, Math.min(99, Math.round((state.chapter + (stage === "chapter-complete" ? 1 : 0)) / chapterMeta.length * 100)));
    window.dispatchEvent(new CustomEvent("huazhongren:progress", { detail: { checkpoint: `redbeard:${stage}:${state.node}`, percent, ...extra } }));
  };

  const audio = createAudioSystem();
  async function requestHostResume() {
    if (!hostPaused) return true;
    if (hostResumeInFlight) return hostResumeInFlight;
    hostResumeState = "resuming";
    window.dispatchEvent(new CustomEvent("huazhongren:host-state", { detail: { state: hostResumeState } }));
    hostResumeInFlight = (async () => {
      try {
        await audio.resume();
        if (audio.state() === "suspended") throw new DOMException("Audio resume requires a user gesture", "NotAllowedError");
        completeHostResume();
        return true;
      } catch (_) {
        hostResumeState = "pending-user-gesture";
        window.dispatchEvent(new CustomEvent("huazhongren:host-state", { detail: { state: hostResumeState } }));
        return false;
      } finally {
        hostResumeInFlight = null;
      }
    })();
    return hostResumeInFlight;
  }
  window.__redbeardHostAudio = Object.freeze({
    pause: () => audio.pause(),
    resume: () => audio.resume(),
    state: () => audio.state(),
    unlock: () => audio.unlock()
  });
  window.__redbeardHostStorage = Object.freeze({ removeSave: () => safeStorageRemove(SAVE_KEY) });
  window.__redbeardHostRuntime = Object.freeze({
    pause: hostPause,
    resume: requestHostResume,
    whenResumed: () => hostPaused ? hostResumePromise : Promise.resolve(true),
    isPaused: () => hostPaused,
    state: () => hostResumeState,
    clock: () => hostClock(),
    advance: hostAdvanceTime
  });
  window.__redbeardHostTimers = Object.freeze({ setTimeout: hostSetTimeout });

  function loadSettings() {
    try { return { ...defaultSettings(), ...JSON.parse(safeStorageGet(SETTINGS_KEY) || "{}") }; }
    catch { return defaultSettings(); }
  }

  function saveSettings() {
    safeStorageSet(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function hasSave() {
    try {
      const raw = safeStorageGet(SAVE_KEY);
      if (!raw) return false;
      const saved = migrateNarrativeSave(JSON.parse(raw));
      if (!isValidSave(saved)) {
        safeStorageRemove(SAVE_KEY);
        return false;
      }
      return true;
    } catch {
      safeStorageRemove(SAVE_KEY);
      return false;
    }
  }

  function migrateNarrativeSave(saved) {
    if (!saved || typeof saved !== "object" || saved.narrativeVersion === 2) return saved;
    if (!Number.isInteger(saved.chapter) || saved.chapter < 0 || saved.chapter >= chapterMeta.length || !["story", "ending"].includes(saved.screen) || (saved.screen === "story" && (typeof saved.node !== "string" || !nodes[saved.node]))) return saved;
    const migrated = { ...saved, narrativeVersion: 2, chapter: 0, node: "c1_disposition", screen: "story", lineIndex: 0, routeId: "pending", paintingOwner: "tanguy", hasOriginal: false, hasCommissionPainting: false, hasMoney: false, hasReceipt: false, hasVanGoghAddress: false, ending: null };
    delete migrated["aff" + "inity"];
    delete migrated["chapter" + "Score"];
    return migrated;
  }

  function narrativeState() {
    return { routeId: state.routeId, paintingOwner: state.paintingOwner, hasOriginal: state.hasOriginal, hasCommissionPainting: state.hasCommissionPainting, hasMoney: state.hasMoney, hasReceipt: state.hasReceipt, hasVanGoghAddress: state.hasVanGoghAddress };
  }

  function validNarrative(saved) {
    return ["pending", "A", "B", "C"].includes(saved.routeId) && ["tanguy", "etienne", "buyer"].includes(saved.paintingOwner) && ["hasOriginal", "hasCommissionPainting", "hasMoney", "hasReceipt", "hasVanGoghAddress"].every(key => typeof saved[key] === "boolean");
  }

  function applyNarrativeSet(values = {}) {
    for (const key of ["routeId", "paintingOwner", "hasOriginal", "hasCommissionPainting", "hasMoney", "hasReceipt", "hasVanGoghAddress", "ending"]) if (Object.prototype.hasOwnProperty.call(values, key)) state[key] = values[key];
  }

  function routeLabel() {
    return ({ A: "见证者", B: "守护者", C: "援助者", pending: state.hasOriginal ? "待定原画" : "待定" })[state.routeId] || "待定";
  }

  function isValidSave(saved) {
    if (!saved || typeof saved !== "object") return false;
    if (saved.narrativeVersion !== 2 || !validNarrative(saved)) return false;
    if (!Number.isInteger(saved.chapter) || saved.chapter < 0 || saved.chapter >= chapterMeta.length) return false;
    if (saved.screen === "ending") return true;
    if (saved.screen !== "story" || typeof saved.node !== "string" || !nodes[saved.node]) return false;
    return nodes[saved.node].chapter === saved.chapter;
  }

  function saveGame() {
    const serializable = {
      ...state,
      runtimeNode: null,
      lineIndex: state.runtimeNode ? 0 : state.lineIndex,
      screen: state.screen === "ending" ? "ending" : "story"
    };
    safeStorageSet(SAVE_KEY, JSON.stringify(serializable));
    updateContinueButton();
  }

  function loadGame() {
    try {
      const saved = migrateNarrativeSave(JSON.parse(safeStorageGet(SAVE_KEY)));
      if (!isValidSave(saved)) {
        safeStorageRemove(SAVE_KEY);
        updateContinueButton();
        return false;
      }
      state = { ...defaultState(), ...saved, settings: loadSettings(), runtimeNode: null };
      if (window.RedbeardPuzzleLogic) {
        const migratedPuzzles = window.RedbeardPuzzleLogic.validateState(state);
        state.puzzleStates = migratedPuzzles.puzzleStates;
        state.puzzleHintStages = migratedPuzzles.puzzleHintStages;
        state.puzzleRatings = migratedPuzzles.puzzleRatings;
      }
      state.clues = [...new Set(state.clues || [])];
      state.memories = [...new Set(state.memories || [])];
      applySettings();
      if (state.screen === "ending") showEnding();
      else {
        showScreen("story");
        setScene(state.chapter);
        goToNode(state.node, { preserveLine: true });
      }
      return true;
    } catch (error) {
      console.warn("Save load failed", error);
      safeStorageRemove(SAVE_KEY);
      updateContinueButton();
      return false;
    }
  }

  function updateContinueButton() {
    els.continueBtn.disabled = !hasSave();
  }

  function showScreen(name) {
    const map = { title: els.title, cinematic: els.cinematic, story: els.story, puzzle: els.puzzle, transition: els.transition, ending: els.ending };
    els.screens.forEach(screen => screen.classList.remove("is-active"));
    const target = map[name];
    if (target) target.classList.add("is-active");
    state.screen = name;
    if (name !== "story") els.video.pause();
    else els.video.play().catch(() => els.fallback.classList.add("is-visible"));
  }

  function playCinematic(id, next) {
    const item = cinematics[id];
    if (!item || (state.settings.skipSeenCinematics && state.seenCinematics.includes(id))) {
      next();
      return;
    }
    activeCinematicId = id;
    cinematicNext = next;
    els.cinematicCaption.textContent = item.caption || "";
    els.cinematicCaption.hidden = !item.caption;
    els.cinematicFallback.src = item.poster || chapterMeta[state.chapter]?.fallback || "";
    els.cinematicFallback.alt = item.poster ? "剧情过场静态画面" : "";
    els.cinematicVideo.src = item.src;
    els.cinematicVideo.poster = item.poster || "";
    els.cinematicVideo.classList.remove("is-failed");
    els.cinematicVideo.currentTime = 0;
    showScreen("cinematic");
    if (state.settings.reduceMotion && item.poster) {
      els.cinematicVideo.classList.add("is-failed");
      hostSetTimeout(finishCinematic, 700);
      return;
    }
    els.cinematicVideo.play().catch(() => finishCinematic());
  }

  function finishCinematic() {
    if (!cinematicNext) return;
    const next = cinematicNext;
    cinematicNext = null;
    els.cinematicVideo.pause();
    els.cinematicVideo.classList.remove("is-failed");
    if (activeCinematicId && !state.seenCinematics.includes(activeCinematicId)) state.seenCinematics.push(activeCinematicId);
    activeCinematicId = null;
    next();
  }

  function setScene(chapterIndex, sceneOverride = null) {
    const meta = chapterMeta[chapterIndex];
    const scene = sceneOverride ? sceneOverrides[sceneOverride] : null;
    state.chapter = chapterIndex;
    els.chapterNumber.textContent = meta.roman;
    els.chapterTitle.textContent = meta.title;
    els.chapterLocation.textContent = meta.location;
    const nextVideo = scene?.video || meta.video;
    const nextFallback = scene?.fallback || meta.fallback;
    const mediaChanged = els.video.getAttribute("src") !== nextVideo;
    if (mediaChanged) els.video.src = nextVideo;
    els.fallback.src = nextFallback;
    els.fallback.alt = scene?.alt || `${meta.title}场景`;
    els.fallback.classList.remove("is-visible");
    if (mediaChanged) els.video.load();
    updateHintUI();
    if (state.screen === "story") els.video.play().catch(() => els.fallback.classList.add("is-visible"));
  }

  function currentNode() {
    return state.runtimeNode || nodes[state.node];
  }

  function goToNode(id, options = {}) {
    if (id === "__ending") {
      state.runtimeNode = null;
      if (["A", "B", "C"].includes(state.routeId)) playCinematic(`ending-${state.routeId}`, showEnding);
      else playCinematic("ending", showEnding);
      return;
    }
    let node = nodes[id];
    if (!node) throw new Error(`Unknown node: ${id}`);
    while (node.kind === "branch") {
      applyNarrativeSet(node.set);
      const match = node.branches.find(branch => Object.entries(branch.when || {}).every(([key, value]) => state[key] === value));
      id = match?.to || node.default;
      node = nodes[id];
      if (!node) throw new Error(`Unknown branch target: ${id}`);
    }
    applyNarrativeSet(node.set);
    if (node.kind === "cinematic") {
      state.node = id;
      state.chapter = node.chapter;
      saveGame();
      playCinematic(node.cinematic, () => goToNode(node.next));
      return;
    }
    state.node = id;
    state.runtimeNode = null;
    if (!options.preserveLine) state.lineIndex = 0;
    state.chapter = node.chapter;
    setScene(node.chapter, node.scene || null);
    showScreen("story");
    renderNode(node);
    saveGame();
  }

  function renderNode(node) {
    clearTypewriter();
    clearGameplayLayers();
    els.objectiveCard.hidden = node.kind !== "explore";
    setObjective(node.objective || chapterMeta[state.chapter].question);
    if (node.kind === "dialogue") renderDialogue(node);
    if (node.kind === "choice") renderChoice(node);
    if (node.kind === "explore") renderExplore(node);
    if (node.kind === "puzzle") openPuzzle(node);
    if (node.kind === "reward") showReward(node);
  }

  function clearGameplayLayers() {
    els.hotspots.innerHTML = "";
    els.exploreContinue.hidden = true;
    els.dialogue.classList.remove("is-visible", "has-choices");
    els.choiceList.innerHTML = "";
    els.character.className = "character-layer";
    els.character.innerHTML = "";
    els.objectiveProgress.innerHTML = "";
  }

  function setObjective(text, complete = 0, total = 0) {
    els.objectiveText.textContent = text;
    els.objectiveProgress.innerHTML = "";
    if (total > 0) {
      for (let i = 0; i < total; i++) {
        const dot = document.createElement("i");
        if (i < complete) dot.classList.add("is-complete");
        els.objectiveProgress.append(dot);
      }
    }
  }

  function updateHintUI() {
    const remaining = state.hintsByChapter?.[state.chapter] ?? 3;
    els.hintCount.textContent = String(remaining);
    els.hintButton.setAttribute("aria-label", `使用提示，剩余${remaining}点`);
    els.puzzleHintButton.textContent = remaining > 0 ? `提示（${remaining}）` : "答题获得提示";
  }

  function onboardingIsActive() {
    return state.chapter === 0 && state.settings.tutorialMode === "full" && !state.onboarding.completed;
  }

  function hideOnboarding() {
    els.onboardingOverlay.hidden = true;
  }

  function completeOnboarding() {
    state.onboarding.completed = true;
    state.onboarding.step = "complete";
    hideOnboarding();
    els.hudActions.classList.remove("is-onboarding-locked");
    showToast("基本操作教学完成。");
    if (state.screen !== "title") saveGame();
  }

  function setOnboardingStep(nextStep) {
    state.onboarding.step = nextStep;
    hideOnboarding();
    saveGame();
  }

  function syncOnboarding() {
    if (!onboardingIsActive()) {
      hideOnboarding();
      els.hudActions.classList.remove("is-onboarding-locked");
      return;
    }
    els.hudActions.classList.add("is-onboarding-locked");
    const step = state.onboarding.step;
    const node = nodes[state.node];
    let selector = null;
    let title = "";
    let text = "";
    if (step === "dialogue" && node?.kind === "dialogue") {
      selector = ".dialogue-copy";
      title = "阅读对白";
      text = "点击纸张，继续阅读下一句对白。";
    }
    if (step === "choice" && node?.kind === "choice") {
      selector = ".choice-list";
      title = "做出选择";
      text = "选择一项实际处置。右侧档案会记录你得到的东西和承担的代价。";
    }
    if (step === "explore" && node?.kind === "explore") {
      selector = ".hotspot";
      title = "观察场景";
      text = "留意画面中的轻微反光，点击它来发现物品。右上角提示可以提供帮助。";
    }
    if (step === "puzzle" && state.screen === "puzzle" && ["paintingStack", "storage"].includes(activePuzzle?.puzzle)) {
      selector = activePuzzle.puzzle === "storage" ? ".storage-piece" : ".stack-painting:not(.is-secret):not(.is-moved)";
      title = "完成互动";
      text = activePuzzle.puzzle === "storage" ? "抓住最上层画框，拖向你判断合适的承放区。" : "先点击压在最上面的画。完成第一步后，剩余部分由你独立完成。";
    }
    if (!selector) {
      hideOnboarding();
      return;
    }
    const target = $(selector);
    if (!target) {
      hideOnboarding();
      return;
    }
    els.onboardingTitle.textContent = title;
    els.onboardingText.textContent = text;
    els.onboardingOverlay.hidden = false;
    requestAnimationFrame(() => positionOnboarding(target));
  }

  function positionOnboarding(target) {
    if (els.onboardingOverlay.hidden || !target) return;
    const rect = target.getBoundingClientRect();
    const padding = 8;
    els.onboardingFocus.style.left = `${Math.max(8, rect.left - padding)}px`;
    els.onboardingFocus.style.top = `${Math.max(8, rect.top - padding)}px`;
    els.onboardingFocus.style.width = `${Math.min(window.innerWidth - 16, rect.width + padding * 2)}px`;
    els.onboardingFocus.style.height = `${Math.min(window.innerHeight - 16, rect.height + padding * 2)}px`;
    const cardWidth = Math.min(384, window.innerWidth * 0.34);
    const left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, rect.left + rect.width / 2 - cardWidth / 2));
    const top = rect.top > 190 ? Math.max(16, rect.top - 160) : Math.min(window.innerHeight - 160, rect.bottom + 18);
    els.onboardingCard.style.left = `${left}px`;
    els.onboardingCard.style.top = `${top}px`;
  }

  function clearHintHighlights() {
    $$(".is-hinted").forEach(element => element.classList.remove("is-hinted"));
    $$(".is-hinted-strong").forEach(element => element.classList.remove("is-hinted-strong"));
    $$(".hint-callout").forEach(element => element.remove());
  }

  function addHintCallout(element, text) {
    if (!element) return;
    element.classList.add("is-hinted", "is-hinted-strong");
    const callout = document.createElement("span");
    callout.className = "hint-callout";
    callout.textContent = text;
    element.append(callout);
  }

  function hintTargetType() {
    if (state.screen === "puzzle" && activePuzzle) return "puzzle";
    const node = nodes[state.node];
    if (node?.kind === "choice") return "choice";
    if (node?.kind === "explore") return "explore";
    return null;
  }

  function requestHint() {
    const targetType = hintTargetType();
    if (!targetType) {
      showToast("当前只需继续对话。");
      return;
    }
    const remaining = state.hintsByChapter[state.chapter] ?? 3;
    if (remaining > 0) {
      state.hintsByChapter[state.chapter] = remaining - 1;
      updateHintUI();
      applyContextHint(targetType, 4 - remaining);
      saveGame();
      return;
    }
    openHintQuiz();
  }

  function applyContextHint(targetType = hintTargetType(), stage = 3) {
    clearHintHighlights();
    if (targetType === "choice") {
      const node = nodes[state.node];
      const index = node.choices.findIndex(choice => (choice.score ?? 0) > 0);
      const button = $$(".choice-button")[Math.max(0, index)];
      if (stage === 1) showToast("想一想，哪个回答更愿意理解对方，而不是直接否定他。");
      if (stage === 2) {
        button?.classList.add("is-hinted");
        showToast("更合适的回答已经亮起。");
      }
      if (stage >= 3) {
        addHintCallout(button, "选择这里");
        showToast("已经标出具体选项。");
      }
      return;
    }
    if (targetType === "explore") {
      const hotspot = $(".hotspot:not(.is-complete)");
      if (stage === 1) showToast("留意门口右侧的画堆，前面压着一幅普通风景画。");
      if (stage === 2 && hotspot) {
        hotspot.classList.add("is-hinted");
        showToast("大致可点击区域已经亮起。");
      }
      if (stage >= 3 && hotspot) {
        addHintCallout(hotspot, "点击这里");
        showToast("已经精确标出可点击区域。");
      }
      return;
    }
    if (targetType === "puzzle") {
      if (activePuzzle.puzzle === "paintingStack") {
        const candidates = $$(".stack-painting:not(.is-secret):not(.is-moved)");
        const target = candidates.sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
        if (stage === 1) showToast("画是层层压住的，先从最上面开始整理。");
        if (stage === 2) { target?.classList.add("is-hinted"); showToast("应该先移动的画已经亮起。"); }
        if (stage >= 3) { addHintCallout(target, "先移这幅"); showToast("已经标出第一步。"); }
      }
      if (activePuzzle.puzzle === "galleryFind") {
        const target = $('.gallery-painting[data-label="无名旧靴"]');
        if (stage === 1) showToast("刚才的谈话反复提到鞋，留意画面中的旧鞋。");
        if (stage === 2) { target?.classList.add("is-hinted"); showToast("相关画作所在区域已经亮起。"); }
        if (stage >= 3) { addHintCallout(target, "选择这幅"); showToast("已经标出要送出的画。"); }
      }
      if (activePuzzle.puzzle === "jigsaw") {
        const tiles = $$(".jigsaw-tile");
        const wrongIndex = tiles.findIndex((tile, index) => Number(tile.dataset.piece) !== index);
        const matchingIndex = tiles.findIndex(tile => Number(tile.dataset.piece) === wrongIndex);
        if (stage === 1) showToast("观察窗框、画布和墙面边缘，连续的部分应该接在一起。");
        if (stage === 2) {
          if (wrongIndex >= 0) tiles[wrongIndex]?.classList.add("is-hinted");
          if (matchingIndex >= 0) tiles[matchingIndex]?.classList.add("is-hinted");
          showToast("可以交换的两块已经亮起。");
        }
        if (stage >= 3) {
          if (wrongIndex >= 0) addHintCallout(tiles[wrongIndex], "先点这块");
          if (matchingIndex >= 0) addHintCallout(tiles[matchingIndex], "再点这块");
          showToast("已经标出这一步的交换顺序。");
        }
      }
      if (activePuzzle.puzzle === "scratchSeal") {
        const canvas = $(".scratch-canvas");
        if (stage === 1) showToast("灰尘下面藏着字样，从画框中央来回擦拭。");
        if (stage === 2) { canvas?.classList.add("is-hinted"); showToast("可以擦拭的整块画框已经亮起。"); }
        if (stage >= 3) { addHintCallout(canvas, "按住并来回擦"); showToast("在这里按住拖动，擦掉灰尘。"); }
      }
      if (activePuzzle.puzzle === "inspectBoots") {
        const targets = $$(".detail-hotspot:not(.is-found)");
        if (stage === 1) showToast("依次观察鞋头、鞋带和鞋底的磨损痕迹。");
        if (stage === 2) { targets.forEach(target => target.classList.add("is-hinted")); showToast("还未观察的细节区域已经亮起。"); }
        if (stage >= 3) { addHintCallout(targets[0], "先看这里"); showToast("已经标出下一个细节。"); }
      }
      if (activePuzzle.puzzle === "steadyCarving") {
        const safe = $(".steady-safe");
        const button = $(".steady-button");
        if (stage === 1) showToast("等摆动指针进入中央金色区域，再按住按钮。");
        if (stage === 2) { addHintCallout(safe, "指针进入这里"); addHintCallout(button, "进入金区后按住0.65秒"); showToast("金色安全区和需要按住的按钮已经标出。"); }
        if (stage >= 3) { addHintCallout(button, "指针进中间时按住"); showToast("在指针经过中央时按住这里。"); }
      }
      if (activePuzzle.puzzle === "finalAssembly") {
        const piece = $(".assembly-piece:not(:disabled)");
        const slot = piece ? $(`.assembly-slot[data-slot="${piece.dataset.piece}"]`) : null;
        if (stage === 1) showToast("对照碎片里的场景，把它放到相同轮廓的位置。");
        if (stage === 2) { piece?.classList.add("is-hinted"); slot?.classList.add("is-hinted"); showToast("一组相配的碎片和位置已经亮起。"); }
        if (stage >= 3) { addHintCallout(piece, "先选碎片"); addHintCallout(slot, "再放这里"); showToast("已经标出这一块的放置顺序。"); }
      }
    }
  }

  function openHintQuiz() {
    const unused = quizQuestions.filter(question => !state.usedQuizIds.includes(question.id));
    if (!unused.length) state.usedQuizIds = [];
    const pool = quizQuestions.filter(question => !state.usedQuizIds.includes(question.id));
    activeQuiz = pool[(state.chapter + state.usedQuizIds.length) % pool.length];
    els.quizQuestion.textContent = activeQuiz.question;
    els.quizFeedback.textContent = "";
    els.quizOptions.innerHTML = "";
    activeQuiz.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "game-button quiz-option";
      button.textContent = option;
      button.addEventListener("click", () => answerHintQuiz(index, button));
      els.quizOptions.append(button);
    });
    openModal(els.hintQuiz);
  }

  function answerHintQuiz(index, button) {
    if (!activeQuiz) return;
    if (index !== activeQuiz.answer) {
      button.disabled = true;
      els.quizFeedback.textContent = "不对，再想一想。";
      audio.play("error");
      return;
    }
    state.usedQuizIds.push(activeQuiz.id);
    state.hintsByChapter[state.chapter] = (state.hintsByChapter[state.chapter] ?? 0) + 1;
    updateHintUI();
    els.quizFeedback.textContent = `回答正确。${activeQuiz.explanation}获得1点提示。`;
    $$("button", els.quizOptions).forEach(option => { option.disabled = true; });
    audio.play("reward");
    saveGame();
    window.setTimeout(() => {
      closeModals();
    }, 700);
  }

  function renderDialogue(node) {
    els.dialogue.classList.add("is-visible");
    const index = Math.min(state.lineIndex, node.lines.length - 1);
    const [speaker, text] = node.lines[index];
    setSpeaker(speaker);
    showTypedText(text);
    els.advanceHint.textContent = index === node.lines.length - 1 ? (node.advanceLabel || "继续") : "点击继续";
    showSceneCharacter(speaker);
    syncOnboarding();
  }

  function setSpeaker(speaker) {
    els.speakerName.textContent = speaker;
    const chapterNpc = state.chapter === 0 ? "唐吉老爹" : state.chapter === 2 ? "保罗" : "提奥";
    const displayedNpc = speaker === "男人" ? "男人" : chapterNpc;
    els.playerPortrait.src = portraits["艾蒂安"];
    els.npcPortrait.src = portraits[chapterNpc];
    els.npcPortrait.alt = `${displayedNpc}头像`;
    els.npcName.textContent = displayedNpc;
    els.affinityValue.textContent = routeLabel();
    const narration = speaker === "旁白";
    els.dialogue.classList.toggle("is-narration", narration);
    els.leftCharacter.classList.toggle("is-speaking", speaker === "艾蒂安");
    els.rightCharacter.classList.toggle("is-speaking", !narration && speaker !== "艾蒂安");
  }

  function showSceneCharacter(speaker) {
    els.character.classList.remove("is-visible");
    els.character.innerHTML = "";
  }

  function showTypedText(text) {
    clearTypewriter();
    typingFullText = text;
    typingComplete = false;
    els.dialogueText.textContent = "";
    const speedMap = { slow: 62, normal: 36, fast: 18, instant: 0 };
    const delay = state.settings.reduceMotion ? 0 : speedMap[state.settings.textSpeed] ?? 36;
    if (delay === 0) {
      els.dialogueText.textContent = text;
      typingComplete = true;
      return;
    }
    let index = 0;
    typeTimer = window.setInterval(() => {
      if (hostPaused) return;
      index += 1;
      els.dialogueText.textContent = text.slice(0, index);
      if (index >= text.length) {
        clearTypewriter();
        typingComplete = true;
      }
    }, delay);
  }

  function clearTypewriter() {
    if (typeTimer) window.clearInterval(typeTimer);
    typeTimer = null;
  }

  function completeTypewriter() {
    clearTypewriter();
    els.dialogueText.textContent = typingFullText;
    typingComplete = true;
  }

  function advanceDialogue() {
    const node = currentNode();
    if (!node || node.kind !== "dialogue") return;
    if (!typingComplete) {
      completeTypewriter();
      audio.play("page");
      return;
    }
    const [speaker, text] = node.lines[state.lineIndex];
    pushHistory(speaker, text);
    if (onboardingIsActive() && state.onboarding.step === "dialogue" && state.node === "c1_intro") {
      setOnboardingStep("explore");
    }
    if (state.lineIndex < node.lines.length - 1) {
      state.lineIndex += 1;
      renderDialogue(node);
      audio.play("page");
      return;
    }
    state.lineIndex = 0;
    const next = node.next;
    if (state.runtimeNode) state.runtimeNode = null;
    goToNode(next);
  }

  function renderChoice(node) {
    els.dialogue.classList.add("is-visible", "has-choices");
    setSpeaker(node.speaker);
    els.dialogueText.textContent = node.text;
    typingFullText = node.text;
    typingComplete = true;
    els.advanceHint.textContent = "选择你的回答";
    showSceneCharacter(node.speaker);
    node.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.className = `game-button choice-button${choice.insight ? " is-insight" : ""}`;
      button.textContent = choice.text;
      button.dataset.index = String(index);
      button.addEventListener("click", () => chooseOption(node, choice));
      els.choiceList.append(button);
    });
    requestAnimationFrame(() => $("button", els.choiceList)?.focus({ preventScroll: true }));
    syncOnboarding();
  }

  function chooseOption(node, choice) {
    audio.play("choice");
    pushHistory(node.speaker, node.text);
    pushHistory("艾蒂安", choice.text);
    applyNarrativeSet(choice.set);
    els.affinityValue.textContent = routeLabel();
    const replyLines = choice.replyLines || (choice.reply ? [choice.reply] : []);
    if (replyLines.length) {
      state.node = choice.next;
      state.runtimeNode = {
        kind: "dialogue",
        chapter: node.chapter,
        objective: node.objective,
        lines: replyLines,
        next: choice.next
      };
      state.lineIndex = 0;
      clearGameplayLayers();
      renderDialogue(state.runtimeNode);
    } else {
      goToNode(choice.next);
    }
    saveGame();
  }

  function renderExplore(node) {
    const seen = new Set(state.observations[state.node] || []);
    setObjective(node.objective, node.showProgress ? seen.size : 0, node.showProgress ? node.required : 0);
    node.hotspots.forEach(hotspot => {
      const button = document.createElement("button");
      button.className = `hotspot${seen.has(hotspot.id) ? " is-complete" : ""}`;
      button.style.left = `${hotspot.x}%`;
      button.style.top = `${hotspot.y}%`;
      if (hotspot.hitWidth) button.style.width = `${hotspot.hitWidth}px`;
      if (hotspot.hitHeight) button.style.height = `${hotspot.hitHeight}px`;
      button.setAttribute("aria-label", `观察${hotspot.label}`);
      button.innerHTML = `<span class="sr-only">${hotspot.label}</span>`;
      button.addEventListener("click", () => observeHotspot(node, hotspot, button));
      els.hotspots.append(button);
    });
    if (seen.size >= node.required) revealExploreContinue(node);
    if (!state.guideSeen && state.settings.tutorialMode !== "full") {
      state.guideSeen = true;
      els.guideTip.hidden = false;
      els.hintButton.classList.add("is-guiding");
    }
    syncOnboarding();
  }

  function observeHotspot(node, hotspot, button) {
    const seen = new Set(state.observations[state.node] || []);
    if (!seen.has(hotspot.id)) {
      seen.add(hotspot.id);
      state.observations[state.node] = [...seen];
      state.clues.push(hotspot.clue);
      state.clues = [...new Set(state.clues)];
      button.classList.add("is-complete");
      audio.play("discover");
      burstAt(hotspot.x, hotspot.y, "#f1bd55", 16);
    } else audio.play("page");
    showToast(`<strong>${hotspot.label}</strong><br>${hotspot.text}`);
    pushHistory("观察", `${hotspot.label}：${hotspot.text}`);
    if (onboardingIsActive() && state.onboarding.step === "explore") {
      setOnboardingStep("puzzle");
    }
    setObjective(node.objective, node.showProgress ? seen.size : 0, node.showProgress ? node.required : 0);
    if (seen.size >= node.required) revealExploreContinue(node);
    saveGame();
  }

  function revealExploreContinue(node) {
    els.exploreContinue.hidden = false;
    els.exploreContinue.textContent = "继续";
    els.exploreContinue.onclick = () => {
      audio.play("choice");
      goToNode(node.next);
    };
  }

  function showToast(html) {
    window.clearTimeout(toastTimer);
    els.toast.innerHTML = html;
    els.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 4700);
  }

  function openPuzzle(node) {
    activePuzzle = node;
    showScreen("puzzle");
    els.puzzleKicker.textContent = chapterMeta[node.chapter].roman;
    els.puzzleTitle.textContent = node.title;
    els.puzzleInstruction.textContent = node.instruction;
    els.puzzleContent.innerHTML = "";
    els.puzzleFinish.hidden = true;
    state.puzzleProgress = 0;
    updateHintUI();
    const handledByOverhaul = window.RedbeardPuzzleOverhaul?.render({
      nodeId: state.node,
      node,
      state,
      content: els.puzzleContent,
      counter: els.puzzleCounter,
      finish: els.puzzleFinish,
      audio,
      toast: showToast,
      save: saveGame,
      setProgress: progress => { state.puzzleProgress = progress; }
    });
    if (handledByOverhaul) return;
    if (node.puzzle === "paintingStack") renderPaintingStack();
    if (node.puzzle === "galleryFind") renderGalleryFind();
    if (node.puzzle === "composition") renderComposition();
    if (node.puzzle === "memory") renderMemoryPuzzle();
    if (node.puzzle === "jigsaw") renderJigsaw();
    if (node.puzzle === "scratchSeal") renderScratchSeal();
    if (node.puzzle === "inspectBoots") renderBootInspection();
    if (node.puzzle === "steadyCarving") renderSteadyCarving();
    if (node.puzzle === "finalAssembly") renderFinalAssembly();
    syncOnboarding();
  }

  function renderPaintingStack() {
    els.puzzleCounter.textContent = "0 / 3";
    const wrapper = document.createElement("div");
    wrapper.className = "painting-stack";
    const paintings = [
      ["assets/images/backgrounds/title.png", "-4deg"],
      ["assets/images/backgrounds/chapter-4.png", "3deg"],
      ["assets/images/backgrounds/chapter-3.png", "-2deg"],
      ["assets/images/backgrounds/chapter-2.png", "5deg"]
    ];
    paintings.forEach(([image, rotation], index) => {
      const button = document.createElement("button");
      button.className = `stack-painting${index === 0 ? " is-secret" : ""}`;
      button.style.backgroundImage = `url("${image}")`;
      button.style.setProperty("--rotation", rotation);
      button.style.zIndex = String(index === 0 ? 0 : paintings.length - index);
      button.setAttribute("aria-label", index === 0 ? "隐藏的红胡子画作" : "移开旧画");
      if (index > 0) button.addEventListener("click", () => movePainting(button, index));
      wrapper.append(button);
    });
    els.puzzleContent.append(wrapper);
  }

  function movePainting(button, index) {
    if (button.classList.contains("is-moved")) return;
    const unmovedAbove = $$(".stack-painting:not(.is-secret):not(.is-moved)", els.puzzleContent);
    const topMost = unmovedAbove.sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
    if (button !== topMost) {
      audio.play("error");
      showToast("先移开压在最上面的那一幅。");
      return;
    }
    const direction = index % 2 ? 1 : -1;
    button.style.setProperty("--move-x", `${direction * (26 + index * 4)}vw`);
    button.style.setProperty("--move-y", `${(index - 2) * 3}vh`);
    button.style.setProperty("--move-r", `${direction * (15 + index * 3)}deg`);
    button.classList.add("is-moved");
    if (onboardingIsActive() && state.onboarding.step === "puzzle") {
      completeOnboarding();
    }
    state.puzzleProgress += 1;
    els.puzzleCounter.textContent = `${state.puzzleProgress} / 3`;
    audio.play("paper");
    if (state.puzzleProgress >= 3) {
      els.puzzleFinish.hidden = false;
      showToast("整理完成。");
      burstAt(50, 50, "#f2c265", 32);
    }
  }

  function renderGalleryFind() {
    els.puzzleCounter.textContent = "寻找 1 幅";
    const grid = document.createElement("div");
    grid.className = "gallery-grid";
    const works = [
      ["夜色", "assets/images/backgrounds/title.png"],
      ["画材店", "assets/images/backgrounds/chapter-1.png"],
      ["无名旧靴", "assets/images/paintings-worn-boots.png", true],
      ["画廊", "assets/images/backgrounds/chapter-2.png"],
      ["工作室", "assets/images/backgrounds/chapter-3.png"],
      ["向日葵", "assets/images/backgrounds/chapter-4.png"]
    ];
    works.forEach(([label, image, correct]) => {
      const button = document.createElement("button");
      button.className = "gallery-painting";
      button.dataset.label = label;
      button.style.backgroundImage = `url("${image}")`;
      button.setAttribute("aria-label", `查看画作：${label}`);
      button.addEventListener("click", () => {
        if (correct) {
          button.classList.add("is-correct");
          state.puzzleProgress = 1;
          els.puzzleCounter.textContent = "已找到";
          els.puzzleFinish.hidden = false;
          audio.play("discover");
          burstAt(50, 52, "#f2c265", 28);
          showToast("已找到画作。");
        } else {
          button.classList.add("is-wrong");
          audio.play("error");
          showToast("不是这幅画。");
        }
      });
      grid.append(button);
    });
    els.puzzleContent.append(grid);
  }

  function renderJigsaw() {
    els.puzzleCounter.textContent = "0 / 6";
    const board = document.createElement("div");
    board.className = "jigsaw-board";
    const positions = ["0% 0%", "50% 0%", "100% 0%", "0% 100%", "50% 100%", "100% 100%"];
    const shuffled = [2, 0, 1, 5, 3, 4];
    let selected = null;

    const applyTile = (tile, piece) => {
      tile.dataset.piece = String(piece);
      tile.style.backgroundPosition = positions[piece];
    };

    const checkSolved = () => {
      const tiles = $$(".jigsaw-tile", board);
      const correct = tiles.filter((tile, index) => Number(tile.dataset.piece) === index).length;
      state.puzzleProgress = correct;
      els.puzzleCounter.textContent = `${correct} / 6`;
      if (correct === 6) {
        els.puzzleFinish.hidden = false;
        audio.play("discover");
        burstAt(50, 50, "#f2c265", 32);
      }
    };

    shuffled.forEach(piece => {
      const tile = document.createElement("button");
      tile.className = "jigsaw-tile";
      tile.setAttribute("aria-label", "拼图块");
      applyTile(tile, piece);
      tile.addEventListener("click", () => {
        if (!selected) {
          selected = tile;
          tile.classList.add("is-selected");
          audio.play("choice");
          return;
        }
        if (selected === tile) {
          tile.classList.remove("is-selected");
          selected = null;
          return;
        }
        const firstPiece = Number(selected.dataset.piece);
        const secondPiece = Number(tile.dataset.piece);
        applyTile(selected, secondPiece);
        applyTile(tile, firstPiece);
        selected.classList.remove("is-selected");
        selected = null;
        audio.play("place");
        checkSolved();
      });
      board.append(tile);
    });
    els.puzzleContent.append(board);
  }

  function renderScratchSeal() {
    els.puzzleCounter.textContent = "0%";
    const board = document.createElement("div");
    board.className = "scratch-board";
    board.innerHTML = `<div class="seal-reveal"><span>贝尔纳画廊</span><b>印</b></div>`;
    const canvas = document.createElement("canvas");
    canvas.className = "scratch-canvas";
    canvas.width = 640;
    canvas.height = 360;
    canvas.setAttribute("aria-label", "擦去画框灰尘");
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("aria-description", "使用方向键移动擦拭位置，按空格擦去灰尘");
    const keyboardCursor = document.createElement("span");
    keyboardCursor.className = "scratch-keyboard-cursor";
    keyboardCursor.setAttribute("aria-hidden", "true");
    board.append(keyboardCursor);
    board.append(canvas);
    els.puzzleContent.append(board);
    const keyboardHelp = document.createElement("p");
    keyboardHelp.className = "scratch-keyboard-help";
    keyboardHelp.textContent = "方向键移动，空格或回车清理";
    els.puzzleContent.append(keyboardHelp);

    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, "#8d795b");
    gradient.addColorStop(.5, "#b49d75");
    gradient.addColorStop(1, "#78664d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 640, 360);
    for (let i = 0; i < 950; i += 1) {
      context.fillStyle = `rgba(55,42,28,${Math.random() * .22})`;
      context.fillRect(Math.random() * 640, Math.random() * 360, 1 + Math.random() * 5, 1 + Math.random() * 3);
    }
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 62;
    const touched = new Set();
    const columns = 32;
    const rows = 18;
    let drawing = false;
    let previous = null;
    let completed = false;
    const keyboardPoint = { x: 320, y: 180 };

    const pointerPosition = event => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * canvas.width / rect.width,
        y: (event.clientY - rect.top) * canvas.height / rect.height
      };
    };
    const markTouched = ({ x, y }) => {
      const cellX = Math.floor(x / 20);
      const cellY = Math.floor(y / 20);
      for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
        for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
          const nextX = cellX + offsetX;
          const nextY = cellY + offsetY;
          if (nextX >= 0 && nextX < columns && nextY >= 0 && nextY < rows) touched.add(`${nextX}:${nextY}`);
        }
      }
      const progress = Math.min(100, Math.round(touched.size / (columns * rows) * 100));
      els.puzzleCounter.textContent = `${progress}%`;
      state.puzzleProgress = progress;
      if (!completed && progress >= 65) {
        completed = true;
        canvas.classList.add("is-cleared");
        els.puzzleFinish.hidden = false;
        audio.play("reward");
        burstAt(50, 50, "#f2c265", 34);
      }
    };
    const erasePoint = (point, from = null) => {
      if (completed) return;
      context.beginPath();
      if (from) context.moveTo(from.x, from.y);
      else context.moveTo(point.x, point.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      markTouched(point);
    };
    const scratch = event => {
      if (!drawing || completed) return;
      const point = pointerPosition(event);
      erasePoint(point, previous);
      previous = point;
    };
    canvas.addEventListener("pointerdown", event => {
      drawing = true;
      previous = pointerPosition(event);
      canvas.setPointerCapture(event.pointerId);
      scratch(event);
    });
    canvas.addEventListener("pointermove", scratch);
    canvas.addEventListener("pointerup", () => { drawing = false; previous = null; });
    canvas.addEventListener("pointercancel", () => { drawing = false; previous = null; });
    const renderKeyboardCursor = () => {
      keyboardCursor.style.left = `${keyboardPoint.x / canvas.width * 100}%`;
      keyboardCursor.style.top = `${keyboardPoint.y / canvas.height * 100}%`;
    };
    canvas.addEventListener("keydown", event => {
      const moves = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -40], ArrowDown: [0, 40] };
      if (moves[event.key]) {
        event.preventDefault();
        keyboardPoint.x = Math.max(20, Math.min(canvas.width - 20, keyboardPoint.x + moves[event.key][0]));
        keyboardPoint.y = Math.max(20, Math.min(canvas.height - 20, keyboardPoint.y + moves[event.key][1]));
        renderKeyboardCursor();
      }
      if (event.code === "Space" || event.key === "Enter") {
        event.preventDefault();
        erasePoint(keyboardPoint);
      }
    });
    renderKeyboardCursor();
  }

  function renderBootInspection() {
    els.puzzleCounter.textContent = "0 / 3";
    const board = document.createElement("div");
    board.className = "boot-inspection";
    board.style.backgroundImage = 'url("assets/images/paintings-worn-boots.png")';
    const details = [
      { id: "toe", label: "鞋头裂口", x: 28, y: 72 },
      { id: "sole", label: "磨损鞋底", x: 61, y: 83 },
      { id: "laces", label: "松散鞋带", x: 53, y: 52 }
    ];
    const found = new Set();
    details.forEach(detail => {
      const button = document.createElement("button");
      button.className = "detail-hotspot";
      button.dataset.detail = detail.id;
      button.style.left = `${detail.x}%`;
      button.style.top = `${detail.y}%`;
      button.setAttribute("aria-label", `观察${detail.label}`);
      button.addEventListener("click", () => {
        if (found.has(detail.id)) return;
        found.add(detail.id);
        button.classList.add("is-found");
        button.textContent = detail.label;
        state.puzzleProgress = found.size;
        els.puzzleCounter.textContent = `${found.size} / 3`;
        audio.play("discover");
        if (found.size === 3) els.puzzleFinish.hidden = false;
      });
      board.append(button);
    });
    els.puzzleContent.append(board);
  }

  function renderSteadyCarving() {
    els.puzzleCounter.textContent = "等待安全区";
    const board = document.createElement("div");
    board.className = "steady-board";
    const carvingAsset = window.RedbeardGameplayAssets?.carving?.subject || "assets/gameplay/tahitian-wood-carving.png";
    board.innerHTML = `<p class="steady-instructions">观察白色指针摆动。指针进入中央金色安全区时，按住下方按钮持续0.65秒；指针离开安全区会中断。</p><div class="carving-stage"><div class="carving-figure"><img src="${carvingAsset}" alt="需要稳住的塔希提木雕"><span>塔希提木雕</span></div></div><div class="steady-track" aria-label="指针摆动轨道"><span class="track-danger track-left">危险</span><div class="steady-safe"><b>安全区</b></div><span class="track-danger track-right">危险</span><div class="steady-marker" aria-label="实时摆动指针">▼</div></div><div class="steady-hold-progress"><i></i></div><button class="game-button game-button--primary steady-button">指针进金区后按住</button><p class="steady-feedback">先看指针左右摆动，进入金色区域再按住。</p>`;
    els.puzzleContent.append(board);
    const carvingToolTray = $("#context-tool-tray");
    if (carvingToolTray) {
      carvingToolTray.dataset.tool = "jigsaw";
      $("span", carvingToolTray).textContent = "木雕稳固";
      $("p", carvingToolTray).textContent = "观察摆动指针，在金色安全区持续按住0.65秒。";
    }
    const marker = $(".steady-marker", board);
    const figure = $(".carving-figure", board);
    const holdButton = $(".steady-button", board);
    const feedback = $(".steady-feedback", board);
    const holdProgress = $(".steady-hold-progress i", board);
    const startedAt = hostClock();
    let holding = false;
    let holdStarted = 0;
    let markerPosition = 0;
    let complete = false;
    steadyRuntimeState = { holding: false, holdStarted: 0, holdElapsed: 0, markerPosition: 0, complete: false };

    const update = (scheduleNext = true) => {
      if (complete || activePuzzle?.puzzle !== "steadyCarving") return;
      if (hostPaused) { if (scheduleNext) requestAnimationFrame(() => update(true)); return; }
      const now = hostClock();
      const elapsed = now - startedAt;
      markerPosition = 50 + 46 * Math.sin(elapsed * .00055);
      steadyRuntimeState.markerPosition = markerPosition;
      marker.style.left = `${markerPosition}%`;
      marker.dataset.safe = markerPosition >= 30 && markerPosition <= 70 ? "true" : "false";
      figure.style.transform = `rotate(${(markerPosition - 50) * .18}deg)`;
      els.puzzleCounter.textContent = holding ? `${Math.min(.65, (now - holdStarted) / 1000).toFixed(2)} / 0.65秒` : markerPosition >= 30 && markerPosition <= 70 ? "现在按住" : "等待金色区";
      if (holding) {
        if (markerPosition < 30 || markerPosition > 70) {
          holding = false;
          holdStarted = 0;
          steadyRuntimeState.holding = false;
          steadyRuntimeState.holdStarted = 0;
          steadyRuntimeState.holdElapsed = 0;
          feedback.textContent = "偏离安全区，再试一次。";
          holdProgress.style.width = "0%";
          audio.play("error");
        } else if (now - holdStarted >= 650) {
          complete = true;
          steadyRuntimeState.complete = true;
          steadyRuntimeState.holdElapsed = now - holdStarted;
          state.puzzleProgress = 1;
          els.puzzleCounter.textContent = "稳定";
          feedback.textContent = "木雕已经稳住。";
          holdButton.disabled = true;
          els.puzzleFinish.hidden = false;
          audio.play("reward");
          return;
        }
      }
      if (elapsed >= 3000 && !holding) feedback.textContent = "观察摆动节奏，在中间区域按住。";
      if (holding) steadyRuntimeState.holdElapsed = now - holdStarted;
      if (holding) holdProgress.style.width = `${Math.min(100, (now - holdStarted) / 650 * 100)}%`;
      if (scheduleNext) requestAnimationFrame(() => update(true));
    };
    const startHold = () => {
      if (complete) return;
      if (markerPosition >= 30 && markerPosition <= 70) {
        holding = true;
        holdStarted = hostClock();
        steadyRuntimeState.holding = true;
        steadyRuntimeState.holdStarted = holdStarted;
        steadyRuntimeState.holdElapsed = 0;
        feedback.textContent = "保持住……";
        holdProgress.style.width = "0%";
      } else {
        feedback.textContent = "现在还不在安全区。";
        audio.play("error");
      }
    };
    const stopHold = () => { if (!complete) { holding = false; holdStarted = 0; steadyRuntimeState.holding = false; steadyRuntimeState.holdStarted = 0; steadyRuntimeState.holdElapsed = 0; } };
    holdButton.addEventListener("pointerdown", startHold);
    holdButton.addEventListener("pointerup", stopHold);
    holdButton.addEventListener("pointercancel", stopHold);
    holdButton.addEventListener("keydown", event => { if (event.code === "Space" || event.code === "Enter") startHold(); });
    holdButton.addEventListener("keyup", stopHold);
    hostAdvanceListeners.add(() => update(false));
    requestAnimationFrame(() => update(true));
  }

  function renderFinalAssembly() {
    els.puzzleCounter.textContent = "0 / 3";
    const board = document.createElement("div");
    board.className = "assembly-board";
    const canvas = document.createElement("div");
    canvas.className = "assembly-canvas";
    const tray = document.createElement("div");
    tray.className = "assembly-tray";
    const images = [
      "assets/images/backgrounds/chapter-1.png",
      "assets/images/backgrounds/chapter-2.png",
      "assets/images/backgrounds/chapter-3.png"
    ];
    let selected = null;
    const placed = new Set();
    images.forEach((image, index) => {
      const slot = document.createElement("button");
      slot.className = "assembly-slot";
      slot.dataset.slot = String(index);
      slot.setAttribute("aria-label", `碎片位置${index + 1}`);
      slot.addEventListener("click", () => placePiece(slot, selected));
      slot.addEventListener("dragover", event => event.preventDefault());
      slot.addEventListener("drop", event => {
        event.preventDefault();
        placePiece(slot, tray.querySelector(`[data-piece="${event.dataTransfer.getData("text/plain")}"]`));
      });
      canvas.append(slot);

      const piece = document.createElement("button");
      piece.className = "assembly-piece";
      piece.dataset.piece = String(index);
      piece.style.backgroundImage = `url("${image}")`;
      piece.draggable = true;
      piece.setAttribute("aria-label", `红胡子碎片${index + 1}`);
      piece.addEventListener("click", () => {
        $$(".assembly-piece", tray).forEach(item => item.classList.remove("is-selected"));
        selected = piece;
        piece.classList.add("is-selected");
      });
      piece.addEventListener("dragstart", event => event.dataTransfer.setData("text/plain", piece.dataset.piece));
      tray.append(piece);
    });

    function placePiece(slot, piece) {
      if (!piece || piece.disabled) return;
      if (slot.dataset.slot !== piece.dataset.piece) {
        slot.classList.add("is-wrong");
        window.setTimeout(() => slot.classList.remove("is-wrong"), 320);
        audio.play("error");
        return;
      }
      const index = piece.dataset.piece;
      slot.style.backgroundImage = piece.style.backgroundImage;
      slot.classList.add("is-filled");
      piece.disabled = true;
      piece.classList.remove("is-selected");
      selected = null;
      placed.add(index);
      state.puzzleProgress = placed.size;
      els.puzzleCounter.textContent = `${placed.size} / 3`;
      audio.play("place");
      if (placed.size === 3) {
        els.puzzleFinish.hidden = false;
        burstAt(50, 50, "#f2c265", 42);
      }
    }

    board.append(canvas, tray);
    els.puzzleContent.append(board);
  }

  function renderComposition() {
    els.puzzleCounter.textContent = "0 / 3";
    const board = document.createElement("div");
    board.className = "composition-board";
    const canvas = document.createElement("button");
    canvas.className = "composition-canvas";
    canvas.setAttribute("aria-label", "静物构图画布，选择对象后点击此处放置");
    const items = document.createElement("div");
    items.className = "composition-items";
    const itemData = [
      ["花瓶", "◉"], ["水果", "●"], ["木雕", "◆"], ["向日葵", "✦"], ["旧靴", "▰"], ["折叠的布", "⌁"]
    ];
    itemData.forEach(([name, symbol], index) => {
      const button = document.createElement("button");
      button.className = "still-item";
      button.innerHTML = `<span aria-hidden="true">${symbol}</span><small>${name}</small>`;
      button.dataset.symbol = symbol;
      button.dataset.name = name;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        $$(".still-item", items).forEach(el => el.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
        selectedCompositionItem = { name, symbol, index, button };
        audio.play("choice");
      });
      items.append(button);
    });
    canvas.addEventListener("click", event => {
      if (!selectedCompositionItem) {
        audio.play("error");
        showToast("先从右侧选择一个对象。");
        return;
      }
      if (selectedCompositionItem.button.disabled) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      const placed = document.createElement("span");
      placed.className = "placed-item";
      placed.textContent = selectedCompositionItem.symbol;
      placed.title = selectedCompositionItem.name;
      placed.style.left = `${Math.max(12, Math.min(88, x))}%`;
      placed.style.top = `${Math.max(18, Math.min(82, y))}%`;
      placed.style.color = ["#d5a54d", "#a6492c", "#6f4a2d", "#ddb53f", "#33261e", "#597085"][selectedCompositionItem.index];
      canvas.append(placed);
      selectedCompositionItem.button.disabled = true;
      selectedCompositionItem.button.setAttribute("aria-pressed", "false");
      selectedCompositionItem = null;
      state.puzzleProgress += 1;
      els.puzzleCounter.textContent = `${state.puzzleProgress} / 3`;
      audio.play("place");
      if (state.puzzleProgress >= 3) {
        els.puzzleFinish.hidden = false;
        showToast("你的构图没有复刻眼前的桌面。保罗第一次认真看向画布。");
      }
    });
    board.append(canvas, items);
    els.puzzleContent.append(board);
  }

  function renderMemoryPuzzle() {
    els.puzzleCounter.textContent = "0 / 3";
    selectedMemories = new Set();
    const board = document.createElement("div");
    board.className = "memory-board";
    const memories = [
      ["画具", "画", "唐吉老爹", "最便宜的颜料，也能画出无法估价的颜色。"],
      ["信件", "信", "提奥", "有人没有创造艺术，却用一生守护艺术。"],
      ["木雕", "木", "保罗", "看见与创造不是敌人，而是两种不肯妥协的道路。"],
      ["旧靴", "靴", "梵高", "没有名字的人，也值得被这个世界记住。"]
    ];
    memories.forEach(([id, icon, witness, copy]) => {
      const button = document.createElement("button");
      button.className = "memory-card";
      button.innerHTML = `<span class="memory-icon" aria-hidden="true">${icon}</span><h3>${witness}</h3><p>${copy}</p>`;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        if (selectedMemories.has(id)) {
          selectedMemories.delete(id);
          button.classList.remove("is-selected");
          button.setAttribute("aria-pressed", "false");
        } else {
          selectedMemories.add(id);
          button.classList.add("is-selected");
          button.setAttribute("aria-pressed", "true");
          audio.play("discover");
        }
        state.puzzleProgress = selectedMemories.size;
        els.puzzleCounter.textContent = `${selectedMemories.size} / 3`;
        els.puzzleFinish.hidden = selectedMemories.size < 3;
      });
      board.append(button);
    });
    els.puzzleContent.append(board);
  }

  function finishPuzzle() {
    if (!activePuzzle || state.puzzleProgress <= 0) return;
    const nodeId = state.node;
    if (!state.completedPuzzles.includes(nodeId)) state.completedPuzzles.push(nodeId);
    audio.play("reward");
    const next = activePuzzle.next;
    if (nodes[next]?.kind === "puzzle") {
      particles = [];
      const context = els.canvas.getContext("2d");
      context?.clearRect(0, 0, els.canvas.width, els.canvas.height);
    } else burstAt(50, 50, "#ffd576", 48);
    activePuzzle = null;
    saveGame();
    emitHostProgress("puzzle-complete", { puzzle: nodeId });
    goToNode(next);
  }

  function showReward(node) {
    if (!state.rewarded.includes(state.node)) {
      state.rewarded.push(state.node);
      state.fragments = Math.min(3, state.fragments + 1);
      state.memories.push(node.memory);
      state.memories = [...new Set(state.memories)];
      state.unlockedChapter = Math.max(state.unlockedChapter, node.nextChapter);
    }
    showScreen("transition");
    els.transitionTitle.textContent = node.title;
    els.transitionQuote.textContent = node.quote;
    els.transitionQuote.hidden = !node.quote;
    els.transitionCopy.textContent = node.copy;
    updateFragmentDisplays();
    els.nextChapter.textContent = `前往${chapterMeta[node.nextChapter].title}`;
    els.nextChapter.onclick = () => playCinematic(`transition-${state.chapter + 1}-${node.nextChapter + 1}`, () => startChapter(node.nextChapter));
    audio.play("reward");
    burstAt(50, 43, "#f2c15e", 44);
    saveGame();
    emitHostProgress("chapter-complete", { fragments: state.fragments });
  }

  function startChapter(index) {
    state.chapter = index;
    state.node = startNodes[index];
    state.lineIndex = 0;
    state.runtimeNode = null;
    state.unlockedChapter = Math.max(state.unlockedChapter, index);
    setScene(index);
    goToNode(startNodes[index]);
    emitHostProgress("chapter-start");
  }

  function showEnding() {
    state.unlockedChapter = 3;
    showScreen("ending");
    els.endingTitle.textContent = ({ A: "记忆见证者", B: "画作守护者", C: "艺术援助者" })[state.routeId] || "寻找结束，理解开始";
    els.endingQuote.textContent = "“他在他的画中，也在人们记忆里。”";
    els.endingSummary.textContent = ({ A: "把无名画与沿途听见的记忆重新归到一处。", B: "让原画被公开看见，并记录它经过穷困之人辗转流传的来历。", C: "把交易所得用于整理、装裱和公开展示作品，同时承担卖画的后续责任。" })[state.routeId] || "艺术作品的生命力能够横跨时间，让不同时代的人共鸣。";
    state.screen = "ending";
    saveGame();
    audio.play("ending");
    burstAt(58, 44, "#f0c35f", 64);
    emitHostProgress("ending", { complete: true });
  }

  function pushHistory(speaker, text) {
    if (!text) return;
    const last = state.history[state.history.length - 1];
    if (last && last.speaker === speaker && last.text === text) return;
    state.history.push({ speaker, text });
    state.history = state.history.slice(-80);
  }

  function renderBacklog() {
    els.backlogList.innerHTML = "";
    const entries = state.history.slice(-30).reverse();
    if (!entries.length) els.backlogList.innerHTML = "<li>旅程尚未开始。</li>";
    entries.forEach(entry => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHtml(entry.speaker)}</strong>　${escapeHtml(entry.text)}`;
      els.backlogList.append(li);
    });
  }

  function renderJournal() {
    els.witnessList.innerHTML = "";
    chapterMeta.slice(0, 3).forEach((chapter, index) => {
      const unlocked = index < state.fragments;
      const entry = document.createElement("article");
      entry.className = `witness-entry${unlocked ? "" : " is-locked"}`;
      entry.innerHTML = `<img src="${chapter.portrait}" alt="${unlocked ? chapter.title : "未解锁见证者"}"><div><h3>${unlocked ? chapter.title : "未解锁"}</h3><p>${unlocked ? chapter.memory : "继续寻找。"}</p></div>`;
      els.witnessList.append(entry);
    });
    els.journalProgress.textContent = state.fragments
      ? `已经获得 ${state.fragments} / 3 块红胡子碎片。`
      : "尚未获得红胡子碎片。";
    updateFragmentDisplays();
  }

  function updateFragmentDisplays() {
    $$(".fragment-medallion").forEach(medallion => {
      $$('i', medallion).forEach((part, index) => part.classList.toggle("is-found", index < state.fragments));
    });
  }

  function renderChapterGrid() {
    els.chapterGrid.innerHTML = "";
    chapterMeta.forEach((chapter, index) => {
      const unlocked = index <= state.unlockedChapter;
      const button = document.createElement("button");
      button.className = `chapter-card${unlocked ? "" : " is-locked"}`;
      button.style.backgroundImage = `url("${chapter.fallback}")`;
      button.disabled = !unlocked;
      button.innerHTML = `<span>${chapter.roman}</span><h3>${unlocked ? chapter.title : "档案未开启"}</h3><p>${unlocked ? chapter.question : "完成前一章后开启。"}</p>`;
      if (unlocked) button.addEventListener("click", () => {
        closeModals();
        startChapter(index);
      });
      els.chapterGrid.append(button);
    });
  }

  function openModal(modal) {
    closeModals();
    modal.hidden = false;
    if (state.screen === "story") els.video.pause();
    requestAnimationFrame(() => $("button, input, select", modal)?.focus({ preventScroll: true }));
  }

  function closeModals() {
    $$(".modal").forEach(modal => { modal.hidden = true; });
    if (state.screen === "story") els.video.play().catch(() => {});
  }

  function applySettings() {
    els.volume.value = String(state.settings.volume);
    els.textSpeed.value = state.settings.textSpeed;
    els.reduceMotion.checked = state.settings.reduceMotion;
    els.highContrast.checked = state.settings.highContrast;
    els.tutorialMode.value = state.settings.tutorialMode;
    els.skipSeenCinematics.checked = Boolean(state.settings.skipSeenCinematics);
    els.game.classList.toggle("reduced-motion", state.settings.reduceMotion);
    els.game.classList.toggle("high-contrast", state.settings.highContrast);
    audio.setVolume(state.settings.volume / 100);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function createAudioSystem() {
    let context = null;
    let master = null;
    let volume = .55;
    let ambient = null;
    let resumeBlockedForTest = false;

    function ensure() {
      if (context) {
        if (context.state === "suspended") context.resume();
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      context = new AudioCtx();
      master = context.createGain();
      master.gain.value = volume * .32;
      master.connect(context.destination);
      startAmbient();
    }

    function tone(frequency, duration, gain, type = "sine", offset = 0) {
      if (!context || !master || volume <= 0) return;
      const osc = context.createOscillator();
      const amp = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, context.currentTime + offset);
      amp.gain.setValueAtTime(0.0001, context.currentTime + offset);
      amp.gain.exponentialRampToValueAtTime(gain, context.currentTime + offset + .015);
      amp.gain.exponentialRampToValueAtTime(.0001, context.currentTime + offset + duration);
      osc.connect(amp).connect(master);
      osc.start(context.currentTime + offset);
      osc.stop(context.currentTime + offset + duration + .03);
    }

    function startAmbient() {
      if (!context || ambient) return;
      ambient = context.createOscillator();
      const gain = context.createGain();
      ambient.type = "sine";
      ambient.frequency.value = 55;
      gain.gain.value = .012;
      ambient.connect(gain).connect(master);
      ambient.start();
    }

    return {
      unlock: ensure,
      pause() {
        if (!context || context.state !== "running") return Promise.resolve();
        return context.suspend();
      },
      resume() {
        if (resumeBlockedForTest) return Promise.reject(new DOMException("Simulated autoplay policy", "NotAllowedError"));
        if (!context || context.state !== "suspended") return Promise.resolve();
        return context.resume();
      },
      state() { return context?.state || "uninitialized"; },
      setResumeBlockedForTest(value) { resumeBlockedForTest = Boolean(value); },
      setVolume(value) {
        volume = value;
        if (master && context) master.gain.setTargetAtTime(value * .32, context.currentTime, .05);
      },
      play(kind) {
        ensure();
        if (!context) return;
        const recipes = {
          page: () => tone(310, .08, .08, "triangle"),
          choice: () => { tone(220, .09, .1, "triangle"); tone(330, .13, .07, "sine", .05); },
          discover: () => { tone(440, .14, .08, "sine"); tone(660, .22, .06, "sine", .08); },
          paper: () => tone(145, .11, .06, "sawtooth"),
          place: () => { tone(125, .08, .1, "triangle"); tone(240, .12, .05, "sine", .03); },
          error: () => tone(92, .18, .08, "square"),
          reward: () => [220, 330, 440, 660].forEach((f, i) => tone(f, .34, .055, "sine", i * .09)),
          ending: () => [165, 220, 330, 440].forEach((f, i) => tone(f, .85, .045, "sine", i * .2))
        };
        recipes[kind]?.();
      }
    };
  }

  function resizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    els.canvas.width = Math.round(window.innerWidth * dpr);
    els.canvas.height = Math.round(window.innerHeight * dpr);
    els.canvas.style.width = `${window.innerWidth}px`;
    els.canvas.style.height = `${window.innerHeight}px`;
  }

  function burstAt(percentX, percentY, color, count = 20) {
    if (state.settings.reduceMotion) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const x = (percentX / 100) * els.canvas.width;
    const y = (percentY / 100) * els.canvas.height;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1.2 + Math.random() * 3.5) * dpr;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1.2 * dpr, life: 1, size: (1 + Math.random() * 2.2) * dpr, color });
    }
  }

  function updateParticles() {
    const ctx = els.canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
    particles = particles.filter(particle => particle.life > 0);
    particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += .035;
      particle.life -= .018;
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(updateParticles);
  }

  function handleAction(action) {
    audio.unlock();
    if (action === "start") {
      if (hasSave() && !window.confirm("开始新的寻找会覆盖当前进度，确定继续吗？")) return;
      state = defaultState();
      applySettings();
      playCinematic("opening", () => startChapter(0));
    }
    if (action === "continue") loadGame();
    if (action === "chapters") { renderChapterGrid(); openModal(els.chapters); }
    if (action === "settings") openModal(els.settings);
    if (action === "journal" || action === "ending-journal") { renderJournal(); openModal(els.journal); }
    if (action === "backlog") { renderBacklog(); openModal(els.backlog); }
    if (action === "pause") { window.RedbeardPuzzleOverhaul?.setHostPaused(true, false); openModal(els.pause); }
    if (action === "resume" || action === "close-modal") { window.RedbeardPuzzleOverhaul?.setHostPaused(false, false); closeModals(); }
    if (action === "title") { closeModals(); saveGame(); showScreen("title"); updateContinueButton(); }
    if (action === "toggle-sound") {
      state.settings.volume = state.settings.volume > 0 ? 0 : 55;
      applySettings(); saveSettings();
      showToast(state.settings.volume > 0 ? "环境声音已开启" : "环境声音已关闭");
    }
    if (action === "hint") {
      if (state.screen === "puzzle") showPuzzleHint();
      else requestHint();
    }
    if (action === "dismiss-guide") {
      els.guideTip.hidden = true;
      els.hintButton.classList.remove("is-guiding");
    }
    if (action === "skip-onboarding") completeOnboarding();
    if (action === "skip-cinematic") finishCinematic();
    if (action === "fullscreen") toggleFullscreen();
    if (action === "clear-save") {
      if (!window.confirm("确定清除全部旅程记录吗？此操作无法撤销。")) return;
      safeStorageRemove(SAVE_KEY);
      updateContinueButton();
      showToast("旅程记录已清除。设置仍会保留。");
    }
    if (action === "restart") {
      if (!window.confirm("确定重新开始寻找吗？当前进度会被覆盖。")) return;
      state = defaultState(); applySettings(); startChapter(0);
    }
    if (action === "puzzle-hint") showPuzzleHint();
  }

  function showPuzzleHint() {
    if (activePuzzle && window.RedbeardPuzzleOverhaul && window.RedbeardPuzzleLogic?.nodeIds.includes(state.node)) {
      const remaining = state.hintsByChapter[state.chapter] ?? 3;
      if (remaining <= 0) {
        openHintQuiz();
        return;
      }
      state.puzzleHintStages ||= {};
      const stage = Math.max(0, Math.min(2, Number(state.puzzleHintStages[state.node]) || 0));
      const puzzleState = state.puzzleStates?.[state.node] || window.RedbeardPuzzleLogic.createState(state.node);
      state.hintsByChapter[state.chapter] = remaining - 1;
      const message = window.RedbeardPuzzleOverhaul.applyHint?.(state.node, stage, puzzleState)
        || window.RedbeardPuzzleOverhaul.hint(state.node, stage, puzzleState);
      showToast(message);
      state.puzzleHintStages[state.node] = Math.min(3, stage + 1);
      updateHintUI();
      saveGame();
      return;
    }
    const remaining = state.hintsByChapter[state.chapter] ?? 3;
    if (remaining <= 0) { openHintQuiz(); return; }
    state.puzzleHintStages ||= {};
    const stage = Math.max(0, Math.min(2, Number(state.puzzleHintStages[state.node]) || 0));
    const hints = {
      paintingStack: "从边框最高、阴影最靠上的画开始移开。",
      galleryFind: "寻找有磨损、裂口和劳动痕迹的对象，不要被漂亮的主题吸引。",
      scratchSeal: "在画框中央按住拖动，擦去大部分灰尘。",
      inspectBoots: "观察鞋头裂口、松散鞋带和磨损鞋底。",
      steadyCarving: "等指针进入中央金色区域时按住按钮。",
      finalAssembly: "选择右侧碎片，再点击左侧相同位置。",
      jigsaw: "先找窗框和墙面边缘连续的两块交换。",
      composition: "先选右侧对象，再点击左侧画布放置。三个对象就能完成。",
      memory: "至少选择三张记忆卡。你可以再次点击取消。"
    };
    const message = hints[activePuzzle?.puzzle] || "观察画面中发光或高亮的部分。";
    state.hintsByChapter[state.chapter] = remaining - 1;
    state.puzzleHintStages[state.node] = Math.min(3, stage + 1);
    updateHintUI();
    applyContextHint("puzzle", stage + 1);
    document.querySelector(".legacy-puzzle-hint")?.remove();
    const panel = document.createElement("p");
    panel.className = "legacy-puzzle-hint";
    panel.textContent = stage === 0 ? `文字提示：${message}` : stage === 1 ? "操作演示：跟随高亮的安全区和按钮完成这一轮。" : `直接提示：${message}`;
    document.querySelector(".steady-board")?.prepend(panel);
    showToast(panel.textContent);
    saveGame();
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await els.game.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) { showToast(`无法切换全屏：${error.message}`); }
  }

  document.addEventListener("click", event => {
    const actionElement = event.target.closest("[data-action]");
    if (actionElement) handleAction(actionElement.dataset.action);
  });

  ["pointerdown", "keydown", "touchstart"].forEach(type => document.addEventListener(type, event => {
    if (hostResumeState !== "pending-user-gesture" || !event.target.closest?.("#game")) return;
    void requestHostResume();
  }, true));

  ["click", "pointerdown", "pointerup", "keydown", "keyup"].forEach(type => document.addEventListener(type, event => {
    if (!hostPaused || !event.target.closest?.("#game")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true));

  $(".dialogue-copy").addEventListener("click", advanceDialogue);
  els.puzzleFinish.addEventListener("click", finishPuzzle);

  els.volume.addEventListener("input", () => {
    state.settings.volume = Number(els.volume.value);
    audio.setVolume(state.settings.volume / 100);
    saveSettings();
  });
  els.textSpeed.addEventListener("change", () => { state.settings.textSpeed = els.textSpeed.value; saveSettings(); });
  els.reduceMotion.addEventListener("change", () => { state.settings.reduceMotion = els.reduceMotion.checked; applySettings(); saveSettings(); window.RedbeardPuzzleOverhaul?.setReduceMotion(state.settings.reduceMotion); });
  els.highContrast.addEventListener("change", () => { state.settings.highContrast = els.highContrast.checked; applySettings(); saveSettings(); });
  els.tutorialMode.addEventListener("change", () => {
    state.settings.tutorialMode = els.tutorialMode.value;
    if (state.settings.tutorialMode === "off") completeOnboarding();
    else syncOnboarding();
    saveSettings();
  });
  els.skipSeenCinematics.addEventListener("change", () => { state.settings.skipSeenCinematics = els.skipSeenCinematics.checked; saveSettings(); });

  els.cinematicVideo.addEventListener("ended", finishCinematic);
  els.cinematicVideo.addEventListener("error", finishCinematic);

  document.addEventListener("keydown", event => {
    const modalOpen = $$(".modal").some(modal => !modal.hidden);
    if (event.key === "f" || event.key === "F") { event.preventDefault(); toggleFullscreen(); return; }
    if (event.key === "j" || event.key === "J") { event.preventDefault(); renderJournal(); openModal(els.journal); return; }
    if (event.key === "b" || event.key === "B") { event.preventDefault(); renderBacklog(); openModal(els.backlog); return; }
    if (event.key === "Escape") {
      if (modalOpen) { if (!els.pause.hidden) window.RedbeardPuzzleOverhaul?.setHostPaused(false, false); closeModals(); }
      else if (state.screen === "story" || state.screen === "puzzle") { window.RedbeardPuzzleOverhaul?.setHostPaused(true, false); openModal(els.pause); }
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && !modalOpen && state.screen === "story") {
      if (!els.dialogue.classList.contains("has-choices")) {
        event.preventDefault(); advanceDialogue();
      }
    }
  });

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("resize", syncOnboarding);
  document.addEventListener("fullscreenchange", resizeCanvas);
  els.video.addEventListener("error", () => els.fallback.classList.add("is-visible"));
  els.video.addEventListener("canplay", () => els.fallback.classList.remove("is-visible"));

  window.render_game_to_text = () => {
    const node = currentNode();
    const puzzleState = activePuzzle && window.RedbeardPuzzleOverhaul && state.puzzleStates?.[state.node]
      ? window.RedbeardPuzzleOverhaul.getTextState(state.node, state.puzzleStates[state.node])
      : null;
    return JSON.stringify({
      coordinateSystem: "Hotspot coordinates are percentages from top-left; +x right, +y down.",
      screen: state.screen,
      chapter: state.chapter + 1,
      chapterTitle: chapterMeta[state.chapter]?.title,
      node: state.node,
      nodeKind: node?.kind,
      objective: state.screen === "ending" ? "查看最终画作与旅程总结" : els.objectiveText.textContent,
      speaker: els.speakerName.textContent,
      dialogue: els.dialogueText.textContent,
      choices: $$(".choice-button").map(button => button.textContent),
      hotspots: $$(".hotspot").map(button => ({ label: $("span", button)?.textContent, completed: button.classList.contains("is-complete") })),
      puzzle: activePuzzle?.puzzle || null,
      puzzleType: puzzleState?.type || activePuzzle?.puzzle || null,
      puzzleGoal: activePuzzle ? (window.RedbeardPuzzleOverhaul?.goals?.[state.node] || activePuzzle.instruction) : null,
      puzzleState: puzzleState,
      puzzleProgress: state.puzzleProgress,
      fragments: state.fragments,
      narrative: narrativeState(),
      hintsRemaining: state.hintsByChapter[state.chapter],
      clues: state.clues.slice(-8),
      hostPaused,
      hostResumeState,
      steadyHolding: Boolean(steadyRuntimeState?.holding),
      steadyHoldMs: steadyRuntimeState?.holding ? Math.max(0, Math.round(hostClock() - steadyRuntimeState.holdStarted)) : Math.round(steadyRuntimeState?.holdElapsed || 0),
      modal: $$(".modal").find(modal => !modal.hidden)?.id || null
    });
  };

  window.advanceTime = milliseconds => {
    hostAdvanceTime(milliseconds);
    window.RedbeardPuzzleOverhaul?.advanceTime(milliseconds, { hostPaused, audioPending: hostResumeState === "pending-user-gesture" });
    const steps = Math.max(1, Math.round(milliseconds / (1000 / 60)));
    for (let i = 0; i < steps; i++) {
      particles.forEach(particle => { particle.life = Math.max(0, particle.life - .001); });
    }
    return window.render_game_to_text();
  };

  try {
    const loopback = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    if (loopback && sessionStorage.getItem("huazhongren.testHarness") === "1") {
      window.__redbeardTestHarness = Object.freeze({
        advanceToEnding: () => goToNode("__ending"),
        openStoryNode: (id, narrative = {}) => {
          if (!nodes[id] || !["dialogue", "choice", "branch", "cinematic"].includes(nodes[id].kind)) throw new Error("Unknown story node");
          applyNarrativeSet({ routeId:"pending", paintingOwner:"tanguy", hasOriginal:false, hasCommissionPainting:false, hasMoney:false, hasReceipt:false, hasVanGoghAddress:false, ending:null, ...narrative });
          state.runtimeNode = null;
          goToNode(id);
        },
        openPuzzleNode: id => {
          if (!window.RedbeardPuzzleLogic?.nodeIds.includes(id)) throw new Error("Unknown overhaul puzzle");
          state.puzzleStates[id] = window.RedbeardPuzzleLogic.createState(id);
          state.puzzleHintStages[id] = 0;
          goToNode(id);
        },
        openLegacyPuzzleNode: id => {
          if (!nodes[id] || nodes[id].kind !== "puzzle" || window.RedbeardPuzzleLogic?.nodeIds.includes(id)) throw new Error("Unknown legacy puzzle");
          goToNode(id);
        },
        setAudioResumeBlocked: value => audio.setResumeBlockedForTest(value)
      });
    }
  } catch { /* 测试辅助不可用时不影响正式游戏。 */ }

  applySettings();
  updateContinueButton();
  updateFragmentDisplays();
  resizeCanvas();
  updateParticles();
  renderChapterGrid();
})();
