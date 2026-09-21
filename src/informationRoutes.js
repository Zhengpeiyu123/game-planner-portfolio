export const informationPages = [
  { id: "process", number: "04", title: "设计方法", cardIndex: 3 },
  { id: "about", number: "05", title: "关于我", cardIndex: 4 },
];

export function informationForRoute(route) {
  const id = route.replace(/^#(?:reading\/)?/, "");
  return informationPages.find((page) => page.id === id);
}

export function informationReturnHref(page, readingMode) {
  return readingMode ? "#reading/projects" : `#gallery/${page.id}`;
}
