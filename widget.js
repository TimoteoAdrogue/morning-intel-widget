// Morning Intel — Scriptable home-screen widget
// Fetches the daily brief published by the "Morning Financial News Summary"
// Claude routine and renders it on the iOS home screen.
//
// Setup:
//   1. Install Scriptable (free, App Store).
//   2. Create a new script in Scriptable named "Morning Intel", paste this file's contents in.
//   3. Long-press your home screen -> add a Scriptable widget (small or medium).
//   4. Tap the widget -> Edit Widget -> set "Script" to "Morning Intel".
//   5. Done. iOS refreshes it on its own schedule (roughly every 15-60 min).

const FEED_URL = "https://raw.githubusercontent.com/TimoteoAdrogue/morning-intel-widget/main/latest.json";

const GOLD = new Color("#F2B33D");
const WHITE = new Color("#F4F5F7");
const MUTED = new Color("#8A8F98");
const BG_TOP = new Color("#15171E");
const BG_BOTTOM = new Color("#1D2029");

async function fetchBrief() {
  const req = new Request(FEED_URL + "?t=" + Date.now()); // cache-bust
  req.timeoutInterval = 10;
  return await req.loadJSON();
}

function relativeTime(iso) {
  try {
    const then = new Date(iso).getTime();
    const diffMin = Math.round((Date.now() - then) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.round(diffH / 24)}d ago`;
  } catch (e) {
    return "";
  }
}

function dateBadgeText(dateStr) {
  try {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString(Device.locale(), { month: "short", day: "numeric" });
  } catch (e) {
    return dateStr || "";
  }
}

function addIcon(container, symbolName, size, color) {
  const symbol = SFSymbol.named(symbolName);
  symbol.applyFont(Font.mediumSystemFont(size));
  const img = container.addImage(symbol.image);
  img.imageSize = new Size(size, size);
  img.tintColor = color;
  return img;
}

async function buildWidget() {
  const widget = new ListWidget();
  widget.backgroundGradient = (() => {
    const g = new LinearGradient();
    g.colors = [BG_TOP, BG_BOTTOM];
    g.locations = [0, 1];
    return g;
  })();
  widget.setPadding(14, 14, 12, 14);

  let data, loadError = false;
  try {
    data = await fetchBrief();
  } catch (e) {
    loadError = true;
    data = { title: "Morning Intel", bullets: [] };
  }

  // Header: icon + title, date pill on the right
  const header = widget.addStack();
  header.centerAlignContent();
  addIcon(header, "newspaper.fill", 14, GOLD);
  header.addSpacer(5);
  const title = header.addText(data.title || "Morning Intel");
  title.font = Font.boldSystemFont(15);
  title.textColor = WHITE;
  header.addSpacer();
  if (data.date) {
    const badge = header.addText(dateBadgeText(data.date));
    badge.font = Font.mediumSystemFont(11);
    badge.textColor = MUTED;
  }

  widget.addSpacer(6);
  const divider = widget.addStack();
  divider.size = new Size(0, 1);
  divider.backgroundColor = new Color("#FFFFFF", 0.08);
  widget.addSpacer(10);

  const family = config.widgetFamily || "medium";

  if (loadError) {
    const err = widget.addText("Couldn't load — check connection.");
    err.font = Font.systemFont(12);
    err.textColor = MUTED;
    widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
    return widget;
  }

  const bullets = Array.isArray(data.bullets) ? data.bullets : [];
  const maxBullets = family === "small" ? 3 : family === "medium" ? 5 : 9;

  if (bullets.length === 0) {
    const empty = widget.addText("Nothing new this morning.");
    empty.font = Font.systemFont(12);
    empty.textColor = MUTED;
  }

  bullets.slice(0, maxBullets).forEach((b, i) => {
    if (i > 0) widget.addSpacer(7);
    const row = widget.addStack();
    row.centerAlignContent();
    const dot = row.addStack();
    dot.size = new Size(5, 5);
    dot.cornerRadius = 2.5;
    dot.backgroundColor = GOLD;
    row.addSpacer(7);
    const line = row.addText(b);
    line.font = Font.systemFont(family === "small" ? 11.5 : 12.5);
    line.textColor = WHITE;
    line.lineLimit = family === "small" ? 2 : 3;
    line.minimumScaleFactor = 0.9;
  });

  if (bullets.length > maxBullets) {
    widget.addSpacer(7);
    const more = widget.addText(`+${bullets.length - maxBullets} more`);
    more.font = Font.mediumSystemFont(10);
    more.textColor = MUTED;
  }

  widget.addSpacer();
  const footer = widget.addStack();
  footer.centerAlignContent();
  addIcon(footer, "clock.fill", 9, MUTED);
  footer.addSpacer(4);
  const updated = footer.addText(`Updated ${relativeTime(data.generated_at)}`);
  updated.font = Font.systemFont(9.5);
  updated.textColor = MUTED;

  // Refresh a few times an hour so content feels current through the day.
  widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  return widget;
}

const widget = await buildWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // Previewing inside the Scriptable app
  await widget.presentMedium();
}
Script.complete();
