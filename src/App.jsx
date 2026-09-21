import { useEffect, useRef, useState } from "react";
import { caseStudies, methods } from "./content";
import { publicUrl } from "./publicUrl.js";
import { informationPages, informationForRoute, informationReturnHref } from "./informationRoutes";
import TreeExperience from "./tree/TreeExperience";
import "./App.css";
import "./tree/TreeReading.css";
import "./tree/StorybookReading.css";
import "./tree/StorybookExperience.css";
import "./tree/ReadingMotion.css";
import "./MethodWorkbench.css";
import { useImageReveal, useProjectTransition, useReadingReveal, useReadingSelection } from "./tree/useReadingMotion";

const caseHref = (id) => `#project/${id}`;
const Arrow = ({ diagonal = false }) => (
  <span aria-hidden="true" className="arrow">
    {diagonal ? "↗" : "→"}
  </span>
);

function Header({ detail, route }) {
  const sectionHref = (id) => route.startsWith("#reading") ? `#reading/${id}` : `#${id}`;
  const [scrolled, setScrolled] = useState(window.scrollY > 40);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`site-header ${detail || scrolled ? "header-paper" : ""}`}
    >
      <div className="header-inner">
        <a className="brand" href="#top" aria-label="郑佩玉作品集首页">
          <span className="brand-mark">郑</span>
          <span>
            郑佩玉<small>游戏策划 · 互动叙事</small>
          </span>
        </a>
        <nav aria-label="主导航" className="desktop-nav">
          <a
            href={sectionHref("projects")}
            aria-current={route.startsWith("#project/") || route === sectionHref("projects") ? "page" : undefined}
          >
            精选项目
          </a>
          <a
            href={sectionHref("process")}
            aria-current={route === sectionHref("process") ? "page" : undefined}
          >
            设计方法
          </a>
          <a
            href={sectionHref("about")}
            aria-current={route === sectionHref("about") ? "page" : undefined}
          >
            关于我
          </a>
        </nav>
        <a className="nav-contact" href={sectionHref("contact")}>
          联系我 <Arrow diagonal />
        </a>
      </div>
    </header>
  );
}

function ProjectCard({ project, index }) {
  return (
    <article
      className={`project-card ${index === 0 ? "project-card-featured" : ""}`}
      data-reading-reveal
    >
      <a
        href={caseHref(project.id)}
        className="project-image-link"
        aria-label={`阅读${project.title}设计案例`}
      >
        <div className="project-media">
          <img src={project.image} alt={project.alt} loading="lazy" />
          <span className="image-index">0{index + 1} / SELECTED WORK</span>
          <span className="image-open">
            <Arrow diagonal />
          </span>
        </div>
      </a>
      <div className="project-copy">
        <p className="project-type">
          {project.type}
          <span>{project.statusShort}</span>
        </p>
        <h3>
          <a href={caseHref(project.id)}>{project.title}</a>
        </h3>
        <p className="project-question">{project.cardQuestion}</p>
        <p className="project-summary">{project.summary}</p>
        <ul className="project-tags" aria-label="案例内容">
          {project.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <a className="text-link" href={caseHref(project.id)}>
          阅读设计案例 <Arrow />
        </a>
      </div>
    </article>
  );
}

function MethodSection({ id = "process" }) {
  const section = useRef(null);
  const [selected, setSelected] = useReadingSelection(section, ".method-detail");
  useReadingReveal(section);
  const method = methods[selected];
  return (
    <section ref={section} id={id} className="method-section section-frame" data-reading-scope>
      <div className="section-heading" data-reading-reveal>
        <p className="section-kicker">04 / 设计方法</p>
        <h1 id="information-title" tabIndex="-1">
          每一个设计，
          <br />
          都应该回答「为什么」。
        </h1>
        <p>
          从玩家感受出发，拆成可讨论的决策、可执行的规则，以及可以被检验的体验。
        </p>
      </div>
      <div className="method-workbench">
        <div className="method-selector" aria-label="选择设计步骤">
          {methods.map((m, i) => (
            <button
              key={m.title}
              type="button"
              aria-pressed={selected === i}
              className={selected === i ? "selected" : ""}
              onClick={() => setSelected(i)}
            >
              <span>0{i + 1}</span>
              <strong>{m.title}</strong>
              <Arrow />
            </button>
          ))}
        </div>
        <article className="method-detail" aria-live="polite">
          <p className="eyebrow">{method.label}</p>
          <h3>{method.question}</h3>
          <p>{method.description}</p>
          <ol className="method-approach" aria-label="我的设计步骤">
            {method.approach.map((step, index) => (
              <li key={step.title}>
                <span className="method-step-index" aria-hidden="true">0{index + 1}</span>
                <div><h4>{step.title}</h4><p>{step.text}</p></div>
              </li>
            ))}
          </ol>
          <div className="method-example">
            <span>{method.exampleLabel}</span>
            <p>{method.example}</p>
          </div>
          <div className="method-checks">
            <h4>我会检查</h4>
            <ul>{method.checks.map((check) => <li key={check}>{check}</li>)}</ul>
          </div>
          {method.evidenceNote && <p className="method-evidence-note">{method.evidenceNote}</p>}
          <div className="method-output">
            <span>对应交付</span>
            <strong>{method.output}</strong>
          </div>
        </article>
      </div>
    </section>
  );
}

function ReadingHome() {
  const reading = useRef(null);
  useReadingReveal(reading);
  return (
    <div ref={reading} className="reading-home" data-reading-scope>
      <section className="hero" id="reading" aria-labelledby="hero-title">
        <div className="hero-scrim" />
        <div className="hero-content" data-reading-reveal>
          <p className="hero-kicker">Zheng Peiyu · Game design portfolio</p>
          <h1 id="hero-title" tabIndex="-1">
            让故事发生，
            <br />
            让玩家参与其中。
          </h1>
          <p className="hero-summary">
            游戏内容 / 剧情 / 互动叙事策划
            <br />
            <span>以叙事建立动机，用规则组织行动，让反馈承接情绪。</span>
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#reading/projects">
              探索设计案例 <Arrow />
            </a>
            <a
              className="hero-resume"
              href={publicUrl("/downloads/zheng-peiyu-resume.docx")}
              download
            >
              下载简历 <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        <div className="hero-bottom">
          <span>叙事构思 · 玩法设计 · 交互原型 · 内容交付</span>
          <a href="#reading/projects">向下阅读 ↓</a>
        </div>
      </section>
      <div className="proof-strip">
        <div>
          <strong>3</strong>
          <span>
            个精选案例
            <br />
            <small>从创意到制作</small>
          </span>
        </div>
        <div>
          <strong>4 人 / 3 个月</strong>
          <span>
            《民国诡事》团队
            <br />
            <small>完成游戏第一章</small>
          </span>
        </div>
        <div>
          <strong>20,000+</strong>
          <span>
            项目 Steam 心愿单
            <br />
            <small>阶段性记录 · 团队整体成果</small>
          </span>
        </div>
        <a href={caseHref("minguo")}>
          了解我的项目贡献 <Arrow />
        </a>
      </div>
      <section className="projects section-frame" id="reading/projects">
        <div className="section-heading heading-row" data-reading-reveal>
          <div>
            <p className="section-kicker">01 / 精选项目</p>
            <h2>
              看见作品，
              <br />
              也看见设计的过程。
            </h2>
          </div>
          <p>
            三个案例，分别展开叙事与玩法的结合、真实项目中的协作交付，以及快速原型中的规则思考。
          </p>
        </div>
        <div className="project-grid">
          {caseStudies.map((p, i) => (
            <ProjectCard project={p} index={i} key={p.id} />
          ))}
        </div>
      </section>
      <nav className="information-index section-frame" aria-label="更多资料">
        {informationPages.map((page) => (
          <a className="text-link" href={`#reading/${page.id}`} key={page.id}>
            <span>{page.number}</span> {page.title} <Arrow diagonal />
          </a>
        ))}
      </nav>
    </div>
  );
}

function Home() {
  return <TreeExperience />;
}

function InformationPage({ page, readingMode }) {
  return (
    <article className="information-page" aria-labelledby="information-title">
      <div className="information-back section-frame">
        <a className="back-link" href={informationReturnHref(page, readingMode)}>
          ← {readingMode ? "返回作品列表" : `返回树上 · ${page.number}`}
        </a>
      </div>
      {page.id === "process" ? <MethodSection /> : <AboutSection />}
    </article>
  );
}

function AboutSection({ id = "about" }) {
  const section = useRef(null);
  useReadingReveal(section);
  return (
      <section ref={section} className="about section-frame" id={id} data-reading-scope>
        <div className="about-portrait" data-reading-reveal>
          <div className="portrait-frame">
            <img
              src={publicUrl("/assets/portrait-zheng-peiyu.jpeg")}
              alt="郑佩玉个人照片"
              loading="lazy"
            />
          </div>
          <p className="portrait-note">北京 · 北京邮电大学设计专业硕士在读</p>
        </div>
        <div className="about-copy" data-reading-reveal>
          <p className="section-kicker">05 / 关于我</p>
          <h1 id="information-title" tabIndex="-1">
            用设计的眼睛，
            <br />
            思考游戏的体验。
          </h1>
          <p className="lead">
            我是郑佩玉，聚焦游戏内容、剧情与互动叙事策划。设计与美术背景让我关注画面的表达；游戏项目经历让我进一步关注：玩家为什么行动、如何理解规则，以及行动之后获得什么。
          </p>
          <p className="about-practice">
            使用策划案、剧情树、关卡流程图和交互原型表达方案，结合 Excel、Figma
            与 AI 工具推动内容制作。工具的价值在于缩短想法到可玩体验之间的距离。
          </p>
          <div className="experience-list" aria-label="经历摘要">
            <article>
              <time>2026.02 — 2026.09</time>
              <div>
                <h3>Linear Game</h3>
                <p>AI 游戏策划实习生 · 游戏策划与内容制作</p>
              </div>
            </article>
            <article>
              <time>2025.11 — 2026.02</time>
              <div>
                <h3>小明太极国漫有限公司</h3>
                <p>AI 短剧实习生 · 全流程内容生产</p>
              </div>
            </article>
            <article>
              <time>2024.07 — 2025.09</time>
              <div>
                <h3>北京铱灵智能科技有限公司</h3>
                <p>AIGC 设计师 · 分镜与视觉内容</p>
              </div>
            </article>
          </div>
          <a
            className="text-link"
            href={publicUrl("/downloads/zheng-peiyu-resume.docx")}
            download
          >
            下载完整简历 ↓
          </a>
        </div>
      </section>
  );
}

function DataTable({ headers, rows, caption }) {
  return (
    <>
      <p className="table-hint">横向滑动，查看完整表格 →</p>
      <div
        className="table-scroll"
        role="region"
        aria-label={caption}
        tabIndex="0"
      >
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, n) => (
              <tr key={n}>
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={i}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RouteExplorer({ routes }) {
  const section = useRef(null);
  const [selected, setSelected] = useReadingSelection(section, ".route-result:not([hidden])");
  return (
    <section ref={section} className="route-explorer">
      <p className="eyebrow">分支设计 / 三种责任，没有标准答案</p>
      <h3>选择改变的，是你愿意承担什么。</h3>
      <div className="route-options">
        {routes.map((r, i) => (
          <button
            key={r.title}
            type="button"
            onClick={() => setSelected(i)}
            aria-pressed={selected === i}
          >
            {r.title}
          </button>
        ))}
      </div>
      <div className="route-results" aria-live="polite">
        {routes.map((route, index) => (
          <section
            className="route-result"
            key={route.title}
            hidden={selected !== index}
          >
            <h4 className="route-result-title">{route.title}</h4>
            <div>
              <span>获得</span>
              <p>{route.gain}</p>
            </div>
            <div>
              <span>代价</span>
              <p>{route.cost}</p>
            </div>
            <div>
              <span>责任落点</span>
              <p>{route.meaning}</p>
            </div>
          </section>
        ))}
      </div>
      <p className="small-note">
        根据项目方案重构的路线说明，用于呈现分支取舍。
      </p>
    </section>
  );
}

function DetailTabs({ project }) {
  const section = useRef(null);
  const [selected, setSelected] = useReadingSelection(section, "[role='tabpanel']:not([hidden])");
  const refs = useRef([]);
  const tabs = ["设计取舍", "执行规格", "交付与复盘"];
  const onKeyDown = (e, i) => {
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % 3
        : e.key === "ArrowLeft"
          ? (i + 2) % 3
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? 2
              : undefined;
    if (next !== undefined) {
      e.preventDefault();
      setSelected(next);
      refs.current[next]?.focus();
    }
  };
  return (
    <div ref={section} className="case-tabs">
      <div className="tab-list" role="tablist" aria-label="案例阅读视角">
        {tabs.map((label, i) => (
          <button
            ref={(el) => {
              refs.current[i] = el;
            }}
            key={label}
            id={`case-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={selected === i}
            aria-controls={`case-panel-${i}`}
            tabIndex={selected === i ? 0 : -1}
            onClick={() => setSelected(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span>0{i + 1}</span>
            {label}
          </button>
        ))}
      </div>
      <section
        id="case-panel-0"
        role="tabpanel"
        aria-labelledby="case-tab-0"
        hidden={selected !== 0}
        tabIndex="0"
      >
        <div className="panel-heading">
          <p className="eyebrow">Design decisions</p>
          <h2>{project.decisionTitle}</h2>
          <p>{project.decisionNote}</p>
        </div>
        <div className="decision-list">
          {project.decisions.map((d, i) => (
            <article className="decision" key={d.title}>
              <div className="decision-number">0{i + 1}</div>
              <div>
                <h3>{d.title}</h3>
                <dl>
                  <div>
                    <dt>设计目标</dt>
                    <dd>{d.goal}</dd>
                  </div>
                  <div>
                    <dt>方案选择</dt>
                    <dd>{d.choice}</dd>
                  </div>
                  <div>
                    <dt>边界与取舍</dt>
                    <dd>{d.tradeoff}</dd>
                  </div>
                  <div className="decision-check">
                    <dt>如何验证</dt>
                    <dd>{d.check}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
        {project.routes && <RouteExplorer routes={project.routes} />}
        <div className="case-callout">
          <span>策划视角</span>
          <p>{project.takeaway}</p>
        </div>
      </section>
      <section
        id="case-panel-1"
        role="tabpanel"
        aria-labelledby="case-tab-1"
        hidden={selected !== 1}
        tabIndex="0"
      >
        <div className="panel-heading">
          <p className="eyebrow">From intention to specification</p>
          <h2>把设计意图，写成可讨论的规则。</h2>
          <p>{project.specNote}</p>
        </div>
        <DataTable
          caption={project.rulesTitle}
          headers={["设计项", "规则与依据", "交互 / 交付关注点"]}
          rows={project.rules}
        />
        {project.specImage && (
          <figure className="spec-image">
            <a
              href={project.specImage.src}
              target="_blank"
              rel="noreferrer"
              aria-label="打开原始界面大图"
            >
              <img
                src={project.specImage.src}
                alt={project.specImage.alt}
                loading="lazy"
              />
            </a>
            <figcaption>
              {project.specImage.caption} · 点击查看原图 ↗
            </figcaption>
          </figure>
        )}
        <section className="config-section">
          <div className="subsection-heading">
            <div>
              <p className="eyebrow">配置设计示例</p>
              <h3>{project.configTitle}</h3>
            </div>
            <a
              className="text-link"
              href={publicUrl(`/downloads/${project.id}-configuration-example.csv`)}
              download
            >
              下载示例 CSV ↓
            </a>
          </div>
          <p className="muted">{project.configNote}</p>
          <DataTable
            caption="字段与示例记录"
            headers={project.configHeaders}
            rows={project.configRows}
          />
        </section>
        <div className="spec-checklist">
          <h3>交付时，我关注这四件事</h3>
          <ul>
            {project.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
      <section
        id="case-panel-2"
        role="tabpanel"
        aria-labelledby="case-tab-2"
        hidden={selected !== 2}
        tabIndex="0"
      >
        <div className="panel-heading">
          <p className="eyebrow">Evidence & reflection</p>
          <h2>{project.reviewTitle}</h2>
          <p>{project.reviewIntro}</p>
        </div>
        {project.comparison && (
          <figure className="comparison">
            <div>
              {project.comparison.images.map((img) => (
                <div key={img.src}>
                  <a
                    href={img.src}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`查看${img.label}原图`}
                  >
                    <img src={img.src} alt={img.alt} loading="lazy" />
                  </a>
                  <span>{img.label} ↗</span>
                </div>
              ))}
            </div>
            <figcaption>{project.comparison.caption}</figcaption>
          </figure>
        )}
        <div className="review-list">
          {project.review.map((r) => (
            <article key={r.title}>
              <span>{r.label}</span>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </article>
          ))}
        </div>
        <div className="materials">
          <h3>可阅读的材料</h3>
          <a
            className="material-link"
            href={publicUrl(`/downloads/${project.id}-design-notes.md`)}
            download
          >
            <span>
              <strong>设计案例说明</strong>
              <small>设计命题、方案取舍、规则与复盘 · Markdown</small>
            </span>
            <span aria-hidden="true">↓</span>
          </a>
          {project.materials?.map((m) => (
            <a
              className="material-link"
              key={m.href}
              href={m.href}
              download={m.download || undefined}
              target={m.download ? undefined : "_blank"}
              rel={m.download ? undefined : "noreferrer"}
            >
              <span>
                <strong>{m.title}</strong>
                <small>{m.description}</small>
              </span>
              <Arrow diagonal />
            </a>
          ))}
        </div>
        <p className="evidence-note">{project.boundary}</p>
      </section>
    </div>
  );
}

function CaseImageViewer({ images, initialIndex, onClose }) {
  const dialog = useRef(null);
  const [index, setIndex] = useState(initialIndex);
  const item = images[index];
  useImageReveal(dialog, index);
  useEffect(() => {
    const element = dialog.current;
    if (!element.open) element.showModal();
    // Removal of the dialog also removes its top-layer entry. Avoid close() in
    // this effect's cleanup: StrictMode replays would dispatch a stale close.
  }, []);
  const move = (direction) => setIndex((current) => (current + direction + images.length) % images.length);
  return (
    <dialog
      ref={dialog}
      className="case-image-viewer"
      aria-label="项目图片大图浏览"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current.close();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="case-image-viewer-toolbar">
        <span>项目图册 / {String(index + 1).padStart(2, "0")} — {String(images.length).padStart(2, "0")}</span>
        <div>
          {images.length > 1 && <>
            <button type="button" onClick={() => move(-1)} aria-label="上一张图片">←</button>
            <button type="button" onClick={() => move(1)} aria-label="下一张图片">→</button>
          </>}
          <button type="button" onClick={() => dialog.current.close()} aria-label="关闭大图">×</button>
        </div>
      </div>
      <figure className="case-image-viewer-media" aria-live="polite">
        <img src={item.src} alt={item.alt} />
        <figcaption>
          <span>{item.caption || item.alt}</span>
          <a href={item.src} target="_blank" rel="noreferrer">打开原图 ↗</a>
        </figcaption>
      </figure>
    </dialog>
  );
}

function ProjectDetail({ project }) {
  const article = useRef(null);
  const [preparingPrint, setPreparingPrint] = useState(false);
  const [imageIndex, setImageIndex] = useState(null);
  useReadingReveal(article, { hero: true });
  const images = [
    { src: project.image, alt: project.alt, caption: project.imageCaption },
    ...(project.specImage ? [project.specImage] : []),
    ...(project.comparison?.images || []),
  ];
  const openEvidenceImage = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.(".spec-image a, .comparison a");
    if (!link) return;
    const index = images.findIndex((item) => item.src === link.getAttribute("href"));
    if (index !== -1) {
      event.preventDefault();
      setImageIndex(index);
    }
  };
  const printCase = async () => {
    setPreparingPrint(true);
    const images = [...document.querySelectorAll(".case-page img")];
    await Promise.all(
      images.map((image) => {
        image.loading = "eager";
        return image.decode().catch(() => {});
      }),
    );
    setPreparingPrint(false);
    window.print();
  };
  const next =
    caseStudies[(caseStudies.indexOf(project) + 1) % caseStudies.length];
  const primaryMaterial = project.materials?.[0];
  return (
    <article ref={article} className="case-page" onClick={openEvidenceImage} data-reading-scope>
      <div className="case-heading section-frame">
        <a href="#projects" className="back-link">
          ← 返回精选项目
        </a>
        <div className="case-heading-grid">
          <div>
            <p className="section-kicker">{project.type} / 设计案例</p>
            <h1 id="case-title" tabIndex="-1">
              {project.title}
            </h1>
            <p className="case-subtitle">{project.subtitle}</p>
          </div>
          <p className="case-position">{project.position}</p>
        </div>
        <div className="case-facts">
          {project.facts.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="case-actions">
          {primaryMaterial && (
            <a
              className="text-link"
              href={primaryMaterial.href}
              download={primaryMaterial.download || undefined}
              target={primaryMaterial.download ? undefined : "_blank"}
              rel={primaryMaterial.download ? undefined : "noreferrer"}
            >
              {primaryMaterial.title} <Arrow diagonal />
            </a>
          )}
          <a
            className="text-link"
            href={publicUrl(`/downloads/${project.id}-design-notes.md`)}
            download
          >
            下载案例说明 ↓
          </a>
        </div>
      </div>
      <figure className="case-cover">
        <button className="case-cover-zoom" type="button" onClick={() => setImageIndex(0)} aria-label={`查看${project.title}封面大图`}>
          <img src={project.image} alt={project.alt} />
          <span aria-hidden="true">查看大图 ↗</span>
        </button>
        <figcaption>{project.imageCaption}</figcaption>
      </figure>
      <div className="case-body section-frame">
        <aside className="case-sidebar">
          <p className="eyebrow">阅读这份案例</p>
          <p>{project.readingGuide}</p>
          <a href="#projects" className="text-link">
            所有项目 <Arrow />
          </a>
          <button
            type="button"
            className="text-link"
            onClick={printCase}
            disabled={preparingPrint}
          >
            {preparingPrint ? "正在准备图片…" : "打印 / 保存 PDF ↓"}
          </button>
          <div className="scope-note">
            <span>我的职责</span>
            <p>{project.role}</p>
          </div>
        </aside>
        <div className="case-main">
          <section className="design-brief" data-reading-reveal>
            <p className="section-kicker">设计命题</p>
            <h2>{project.question}</h2>
            <p>{project.intro}</p>
            <div className="brief-boundary">
              <span>项目边界</span>
              <p>{project.scope}</p>
            </div>
          </section>
          <section className="flow-section" data-reading-reveal>
            <div className="subsection-heading">
              <h3>{project.flowTitle}</h3>
              <span>{project.flowLabel}</span>
            </div>
            <ol className="design-flow">
              {project.flow.map((s, i) => (
                <li key={s.title}>
                  <span className="flow-number">0{i + 1}</span>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
            <p className="flow-caption">{project.flowCaption}</p>
          </section>
          <DetailTabs project={project} key={project.id} />
        </div>
      </div>
      <section className="next-project section-frame" data-reading-reveal>
        <p className="eyebrow">继续阅读 / 下一个案例</p>
        <a href={caseHref(next.id)}>
          <h2>{next.title}</h2>
          <Arrow diagonal />
        </a>
        <p>{next.cardQuestion}</p>
      </section>
      {imageIndex !== null && <CaseImageViewer images={images} initialIndex={imageIndex} onClose={() => setImageIndex(null)} />}
    </article>
  );
}

function Contact({ id = "contact" }) {
  return (
    <section className="contact" id={id}>
      <div className="contact-inner">
        <div>
          <p className="section-kicker">一起做值得体验的游戏</p>
          <h2>
            把下一个想法，
            <br />
            推进到玩家手中。
          </h2>
          <p>求职方向 · 游戏内容 / 剧情 / 互动叙事策划</p>
        </div>
        <div className="contact-links">
          <a className="contact-email" href="mailto:15528165282@163.com">
            15528165282@163.com <Arrow diagonal />
          </a>
          <a href="tel:+8615528165282">+86 155 2816 5282</a>
          <a
            className="text-link"
            href={publicUrl("/downloads/zheng-peiyu-resume.docx")}
            download
          >
            下载简历 · DOCX ↓
          </a>
        </div>
      </div>
      <footer>
        <span>郑佩玉 · 游戏策划作品集</span>
        <span>叙事 / 规则 / 体验</span>
        <a href="#top">返回首页 ↑</a>
      </footer>
    </section>
  );
}

export default function App() {
  const [route, setRoute] = useState(window.location.hash || "#top");
  const main = useRef(null);
  const onProjectClick = useProjectTransition(main, route);
  const projectId = route.startsWith("#project/") ? route.slice(9) : null;
  const project = caseStudies.find((item) => item.id === projectId);
  const information = informationForRoute(route);
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || "#top");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    // Old map bookmarks now lead to their original reading pages.
    if (route.startsWith("#island/")) {
      const id = route.slice(8);
      window.location.replace(caseStudies.some((item) => item.id === id)
        ? caseHref(id)
        : ["about", "process", "contact"].includes(id) ? `#${id}` : "#top");
      return;
    }
    document.title = project
      ? `${project.title} · 设计案例 | 郑佩玉`
      : information ? `${information.title} | 郑佩玉 · 游戏策划作品集`
      : "郑佩玉 | 游戏策划作品集";
    const frame = requestAnimationFrame(() => {
      if (projectId || information) {
        document.getElementById(information ? "information-title" : "case-title")?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: "instant" });
      } else {
        if (route === "#reading") document.getElementById("hero-title")?.focus({ preventScroll: true });
        document
          .getElementById(route.slice(1) || "top")
          ?.scrollIntoView({ behavior: "instant", block: "start" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [route, project, projectId, information]);
  return (
    <div className="site-shell tree-theme storybook-theme">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        跳到主要内容
      </a>
      <Header detail={Boolean(projectId || information)} route={route} />
      <main ref={main} id="main-content" tabIndex="-1" onClick={onProjectClick}>
        {project ? (
          <ProjectDetail project={project} key={project.id} />
        ) : projectId ? (
          <section className="not-found section-frame">
            <p className="section-kicker">未找到这个案例</p>
            <h1>换一条路径，继续探索。</h1>
            <a className="text-link" href="#projects">
              返回精选项目 <Arrow />
            </a>
          </section>
        ) : information ? (
          <InformationPage page={information} readingMode={route.startsWith("#reading/")} key={information.id} />
        ) : route.startsWith("#reading") ? (
          <ReadingHome />
        ) : (
          <Home />
        )}
        <Contact id={route.startsWith("#reading") ? "reading/contact" : "contact"} />
      </main>
    </div>
  );
}
