import test from "node:test";
import assert from "node:assert/strict";
import { informationPages, informationForRoute, informationReturnHref } from "./informationRoutes.js";
import { sceneAt, progressForCard } from "./tree/treeMotion.js";

test("04 and 05 open only at explicit information routes", () => {
  for (const page of informationPages) {
    assert.equal(informationForRoute(`#${page.id}`), page);
    assert.equal(informationForRoute(`#reading/${page.id}`), page);
  }
  for (const route of ["#top", "#projects", "#contact", "#reading", "#reading/projects", "#reading/contact", "#gallery/process", "#gallery/about", "#project/huazhongren"]) {
    assert.equal(informationForRoute(route), undefined, route);
  }
});

test("return links restore the matching tree card or reading list", () => {
  for (const page of informationPages) {
    assert.equal(informationReturnHref(page, false), `#gallery/${page.id}`);
    assert.equal(informationReturnHref(page, true), "#reading/projects");
    assert.equal(sceneAt(progressForCard(page.cardIndex)).activeIndex, page.cardIndex);
  }
});
