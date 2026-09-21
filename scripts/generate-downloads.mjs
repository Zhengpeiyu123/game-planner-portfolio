import { mkdir, writeFile } from "node:fs/promises";
import { caseStudies } from "../src/content.js";

const output = new URL("../public/downloads/", import.meta.url);
await mkdir(output, { recursive: true });

for (const project of caseStudies) {
  const notes = [
    `# ${project.title}｜设计案例`,
    "",
    project.subtitle,
    "",
    ...project.facts.map(([label, value]) => `- ${label}：${value}`),
    "",
    `个人职责：${project.role}`,
    "",
    "## 设计命题",
    "",
    project.question,
    "",
    project.intro,
    "",
    `项目边界：${project.scope}`,
    "",
    "## 体验结构",
    "",
    ...project.flow.map(
      (step, index) => `${index + 1}. ${step.title}：${step.text}`,
    ),
    "",
    "## 设计取舍",
    "",
    project.decisionNote,
    "",
    ...project.decisions.flatMap((d) => [
      `### ${d.title}`,
      "",
      `目标：${d.goal}`,
      "",
      `方案：${d.choice}`,
      "",
      `取舍：${d.tradeoff}`,
      "",
      `验证：${d.check}`,
      "",
    ]),
    ...(project.routes
      ? [
          "## 路线设计",
          "",
          ...project.routes.flatMap((r) => [
            `### ${r.title}`,
            "",
            `获得：${r.gain}`,
            "",
            `代价：${r.cost}`,
            "",
            `责任：${r.meaning}`,
            "",
          ]),
        ]
      : []),
    "## 执行规格",
    "",
    project.specNote,
    "",
    ...project.rules.map((r) => `- ${r.join("：")}`),
    "",
    "## 配置说明",
    "",
    project.configNote,
    "",
    ...project.configRows.map((r) => `- ${r.join("：")}`),
    "",
    "## 交付关注点",
    "",
    ...project.checklist.map((s) => `- ${s}`),
    "",
    "## 复盘与下一步",
    "",
    ...project.review.flatMap((r) => [`### ${r.title}`, "", r.text, ""]),
    "## 材料边界",
    "",
    project.boundary,
    "",
  ].join("\n");
  const csv = [
    [`${project.title}｜配置结构示例`],
    [project.configNote],
    project.configHeaders,
    ...project.configRows,
  ]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
  await writeFile(new URL(`${project.id}-design-notes.md`, output), notes);
  await writeFile(
    new URL(`${project.id}-configuration-example.csv`, output),
    "\uFEFF" + csv,
  );
}
console.log("Generated 3 case notes and 3 configuration examples.");
