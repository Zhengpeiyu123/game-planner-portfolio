import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { caseStudies } from '../content';
import { publicUrl } from '../publicUrl.js';
import { informationPages } from '../informationRoutes';
import { sceneAt, progressForCard, GALLERY_START } from './treeMotion';
import './TreeExperience.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const entries = [
  ...caseStudies.map((project, index) => ({
    id: project.id, title: project.title, image: project.image, alt: project.alt,
    label: ['互动叙事 · 玩法设计', '剧情解谜 · 制作协作', '战斗规则 · 快速原型'][index],
    description: project.cardQuestion, href: `#project/${project.id}`, kind: '设计案例',
  })),
  { id: 'process', title: '设计如何发生', label: '体验目标 → 取舍 → 规则 → 验证', image: publicUrl('/assets/cases/minguo-flow-after.jpg'), alt: '民国诡事的关卡流程设计图', description: '每一个设计，都应该回答「为什么」。', href: '#process', kind: '设计方法' },
  { id: 'about', title: '故事背后的人', label: '郑佩玉 · 游戏策划', image: publicUrl('/assets/portrait-zheng-peiyu.jpeg'), alt: '郑佩玉个人照片', description: '用设计的眼睛，思考游戏的体验。', href: '#about', kind: '关于我' },
];

export default function TreeExperience() {
  const root = useRef(null);
  const host = useRef(null);
  const progress = useRef(0);
  const [isReduced, setIsReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-height: 539px)').matches);
  const reducedMotion = useRef(isReduced);
  const triggerRef = useRef(null);
  const drag = useRef(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(isReduced);
  const [failed, setFailed] = useState(false);
  const openingLink = useRef(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compactQuery = window.matchMedia('(max-height: 539px)');
    const change = () => { setIsReduced(query.matches); setPaused(query.matches); };
    const resize = () => setCompact(compactQuery.matches);
    query.addEventListener('change', change);
    compactQuery.addEventListener('change', resize);
    return () => { query.removeEventListener('change', change); compactQuery.removeEventListener('change', resize); };
  }, []);
  useEffect(() => { reducedMotion.current = paused || isReduced; }, [paused, isReduced]);

  const { contextSafe } = useGSAP(() => {
    if (isReduced || failed || compact) return;
    const scope = root.current;
    const hero = scope.querySelector('.tree-introduction');
    const opening = scope.querySelector('.storybook-opening');
    const sky = scope.querySelector('.storybook-sky');
    const galleryUI = scope.querySelector('.tree-gallery-ui');
    const hint = scope.querySelector('.tree-scroll-hint');
    const line = scope.querySelector('.tree-progress-fill');
    let index = -1;
    const state = { value: 0 };
    const update = () => {
      progress.current = state.value;
      const frame = sceneAt(state.value);
      hero.style.opacity = frame.heroOpacity;
      hero.style.transform = `translateY(${-55 * (1 - frame.heroOpacity)}px)`;
      hero.style.visibility = frame.heroOpacity > 0.01 ? 'visible' : 'hidden';
      opening.style.opacity = 1 - frame.entrance;
      opening.style.transform = `scale(${1 + frame.entrance * 0.08})`;
      opening.style.visibility = frame.entrance < 0.999 ? 'visible' : 'hidden';
      sky.style.transform = `translateY(${-frame.gallery * 5}%)`;
      galleryUI.style.opacity = frame.galleryOpacity;
      galleryUI.style.visibility = frame.galleryOpacity > 0.05 ? 'visible' : 'hidden';
      hint.style.opacity = 1 - frame.galleryOpacity;
      line.style.transform = `scaleX(${frame.gallery})`;
      if (index !== frame.activeIndex) { index = frame.activeIndex; setActive(index); }
    };
    const animation = gsap.to(state, {
      value: 1, ease: 'none', onUpdate: update,
      scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom bottom', scrub: 0.65, invalidateOnRefresh: true },
    });
    triggerRef.current = animation.scrollTrigger;
    update();
    let disposed = false;
    let dispose = () => {};
    // Painted layers retain the paper texture while the project cards orbit in depth.
    import('./PaintedTrunkRenderer').then(({ mountStorybookRenderer }) => {
      if (disposed) return;
      dispose = mountStorybookRenderer({
        host: host.current,
        slots: [...scope.querySelectorAll('.tree-orbit-slot')],
        cards: [...scope.querySelectorAll('.tree-orbit-card')],
        progress, reducedMotion, onError: () => { if (!disposed) setFailed(true); },
      });
    }).catch(() => { if (!disposed) setFailed(true); });
    gsap.from('.tree-introduction > *', { y: 26, opacity: 0, duration: 1.1, stagger: 0.13, ease: 'power3.out', delay: 0.15 });
    const refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => { disposed = true; cancelAnimationFrame(refreshFrame); triggerRef.current = null; dispose(); };
  }, { scope: root, dependencies: [isReduced, failed, compact], revertOnUpdate: true });

  useGSAP(() => {
    if (isReduced || failed || compact) return;
    gsap.fromTo('.tree-active-info > *', { opacity: 0, y: 15, filter: 'blur(4px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, stagger: 0.085, ease: 'power3.out', clearProps: 'transform,filter,opacity' });
  }, { scope: root, dependencies: [active, isReduced, failed, compact], revertOnUpdate: true });

  const openInformation = (event) => contextSafe(() => {
    const link = event.target.closest('a');
    const href = link?.getAttribute('href');
    if (!href?.startsWith('#') || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || isReduced) return;
    event.preventDefault();
    if (openingLink.current) return;
    openingLink.current = true;
    const scope = root.current;
    const picked = link.querySelector('.tree-card-image');
    const wash = scope.querySelector('.tree-exit-wash');
    const labels = scope.querySelectorAll('.tree-gallery-label, .tree-active-info, .tree-orbit-nav');
    const timeline = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: () => {
      openingLink.current = false;
      const information = informationPages.find(page => href === `#${page.id}`);
      // Back should return to the card that opened this information page.
      if (information) window.history.replaceState(window.history.state, '', `#gallery/${information.id}`);
      window.location.hash = href;
      gsap.set(wash, { autoAlpha: 0 });
      gsap.set(labels, { clearProps: 'opacity,transform' });
      if (picked) gsap.set(picked, { clearProps: 'transform' });
    } });
    timeline.to(labels, { opacity: 0, y: -12, duration: 0.26, stagger: 0.025 }, 0);
    if (picked) timeline.to(picked, { scale: 1.13, y: -12, duration: 0.48, ease: 'power3.inOut' }, 0);
    timeline.to(wash, { autoAlpha: 1, duration: 0.36 }, 0.18);
  })();

  const goTo = (index) => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    window.scrollTo({ top: trigger.start + progressForCard(index) * (trigger.end - trigger.start), behavior: isReduced ? 'instant' : 'smooth' });
  };
  const dragStart = (event) => {
    if (event.target.closest('a, button') || event.pointerType === 'touch') return;
    drag.current = { x: event.clientX, scroll: window.scrollY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const dragMove = (event) => {
    if (!drag.current) return;
    window.scrollTo({ top: drag.current.scroll + (drag.current.x - event.clientX) * 3.2, behavior: 'instant' });
  };

  if (isReduced || failed || compact) return (
    <section className="tree-static section-frame" id="top">
      <img className="storybook-static-art" src={publicUrl('/assets/storybook/starry-canopy-source.png')} alt="" aria-hidden="true" />
      <p className="tree-eyebrow">ZHENG PEIYU · GAME DESIGN</p>
      <h1>让故事生长，<br />让玩家参与。</h1>
      <p>我是郑佩玉，专注游戏内容、剧情与互动叙事策划。</p>
      <p className="tree-static-note">{failed ? '插画暂时未能加载，作品内容仍可正常阅读。' : compact ? '已切换到适合横屏阅读的作品列表。' : '已根据系统偏好关闭空间动效。'}</p>
      <div className="tree-static-projects" id="projects">
        {entries.slice(0, 3).map(entry => <a key={entry.id} href={entry.href}><img src={entry.image} alt={entry.alt} /><span>{entry.title} <span aria-hidden="true">↗</span></span><small>{entry.label}</small></a>)}
      </div>
      <nav className="information-index" aria-label="更多资料">
        {informationPages.map(page => <a id={`gallery/${page.id}`} className="text-link" href={`#${page.id}`} key={page.id}><span>{page.number}</span> {page.title} <span aria-hidden="true">↗</span></a>)}
      </nav>
    </section>
  );

  return (
    <section className="tree-experience" id="top" ref={root} aria-label="树之作品集，向下滚动探索">
      <span id="projects" className="tree-projects-anchor" style={{ top: `${GALLERY_START * 580}dvh` }} />
      {informationPages.map(page => <span key={page.id} id={`gallery/${page.id}`} className="tree-projects-anchor" style={{ top: `${progressForCard(page.cardIndex) * 580}dvh` }} />)}
      <div className="tree-stage" onClick={openInformation} onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <div className="storybook-sky" aria-hidden="true" />
        <div className="storybook-opening" aria-hidden="true"><img src={publicUrl('/assets/storybook/starry-canopy-source.png')} alt="" fetchPriority="high" draggable="false" /></div>
        <div className="tree-canvas" ref={host} />
        {entries.map((entry, index) => (
          <div className="tree-orbit-slot" key={entry.id}>
            <a className={`tree-orbit-card orbit-${entry.id}`} href={entry.href} tabIndex={-1} aria-label={`${entry.kind}：${entry.title}`}>
              <div className="tree-card-image"><img src={entry.image} alt={entry.alt} draggable="false" /><span className="tree-card-open" aria-hidden="true">↗</span></div>
              <div className="tree-card-caption"><div><span className="tree-card-number">0{index + 1}</span><h2>{entry.title}</h2></div><p>{entry.label}</p></div>
            </a>
          </div>
        ))}
        <div className="tree-introduction">
          <p className="tree-eyebrow"><span />郑佩玉 · 游戏策划作品集</p>
          <h1>让故事生长，<br />让玩家参与。</h1>
          <p className="tree-specialty">游戏内容 · 剧情 · 互动叙事策划</p>
          <div className="tree-hero-links"><button onClick={() => goTo(0)}>探索作品 <span aria-hidden="true">↓</span></button><a href={publicUrl('/downloads/zheng-peiyu-resume.docx')} download>下载简历 <span aria-hidden="true">↗</span></a></div>
        </div>
        <div className="tree-scroll-hint"><span className="tree-hint-line" /><span>向下滚动，让想法展开</span><span className="tree-edition">SELECTED WORKS / 2026</span></div>
        <div className="tree-gallery-ui">
          <div className="tree-gallery-label"><p className="tree-eyebrow">精选作品 / 设计过程</p><h2>沿着想法，<br />走进作品。</h2><p>滚动，让树干与作品旋转。<br />点击，展开故事的细节。</p></div>
          <div className="tree-active-info" aria-live="polite" aria-atomic="true"><p><span>0{active + 1}</span> / 0{entries.length} — {entries[active].kind}</p><a href={entries[active].href}>{entries[active].title} <span aria-hidden="true">↗</span></a><span className="tree-active-description">{entries[active].description}</span></div>
          <nav className="tree-orbit-nav" aria-label="选择环绕资料"><button type="button" onClick={() => goTo(Math.max(0, active - 1))} disabled={active === 0} aria-label="上一份资料">↑</button>{entries.map((entry, index) => <button key={entry.id} type="button" onClick={() => goTo(index)} aria-label={`转到${entry.title}`} aria-pressed={active === index}><span>0{index + 1}</span><i /></button>)}<button type="button" onClick={() => goTo(Math.min(entries.length - 1, active + 1))} disabled={active === entries.length - 1} aria-label="下一份资料">↓</button></nav>
          <div className="tree-progress"><span className="tree-progress-fill" /></div>
        </div>
        <div className="tree-utility"><button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? '开启环境动效' : '暂停环境动效'}</button><span>/</span><a href="#reading">直接阅读 <span aria-hidden="true">↗</span></a></div>
        <div className="tree-exit-wash" aria-hidden="true" />
      </div>
    </section>
  );
}
