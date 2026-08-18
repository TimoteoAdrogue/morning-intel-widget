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

async function fetchBrief() {
  const req = new Request(FEED_URL + "?t=" + Date.now()); // cache-bust
  req.timeoutInterval = 10;
  return await req.loadJSON();
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(Device.locale(), { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

async function buildWidget() {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#111318");
  widget.setPadding(14, 14, 14, 14);

  let data;
  try {
    data = await fetchBrief();
  } catch (e) {
    const errText = widget.addText("Morning Intel\nCouldn't load — check connection.");
    errText.textColor = Color.white();
    errText.font = Font.mediumSystemFont(13);
    widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
    return widget;
  }

  // Header row: title + generated time
  const header = widget.addStack();
  header.centerAlignContent();
  const title = header.addText(data.title || "Morning Intel");
  title.font = Font.boldSystemFont(15);
  title.textColor = new Color("#F5C542");
  header.addSpacer();
  const time = header.addText(formatDate(data.generated_at));
  time.font = Font.systemFont(11);
  time.textColor = new Color("#8A8F98");

  widget.addSpacer(8);

  const bullets = Array.isArray(data.bullets) ? data.bullets : [];
  const family = config.widgetFamily || "medium";
  const maxBullets = family === "small" ? 3 : family === "medium" ? 5 : 8;

  if (bullets.length === 0) {
    const empty = widget.addText("Nothing new this morning.");
    empty.font = Font.systemFont(12);
    empty.textColor = new Color("#C7CBD1");
  }

  bullets.slice(0, maxBullets).forEach((b, i) => {
    if (i > 0) widget.addSpacer(6);
    const row = widget.addStack();
    row.centerAlignContent();
    const dot = row.addText("•  ");
    dot.font = Font.systemFont(12);
    dot.textColor = new Color("#F5C542");
    const line = row.addText(b);
    line.font = Font.systemFont(12);
    line.textColor = Color.white();
    line.lineLimit = family === "small" ? 2 : 3;
  });

  if (bullets.length > maxBullets) {
    widget.addSpacer(6);
    const more = widget.addText(`+${bullets.length - maxBullets} more`);
    more.font = Font.systemFont(10);
    more.textColor = new Color("#8A8F98");
  }

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
