// Polls participants.json and adds new cards to the wall as pull requests get merged.
const POLL_MS = 15000;
const NEON = ["#00f5ff", "#ff00ff", "#b366ff"];

const wall = document.getElementById("wall");
const empty = document.getElementById("empty");
const count = document.getElementById("count");
const latest = document.getElementById("latest");
const toast = document.getElementById("toast");

const seen = new Set();
let firstLoad = true;
let toastTimer;

// On GitHub Pages the URL is https://<owner>.github.io/<repo>/
function repoUrl() {
  const owner = location.hostname.endsWith(".github.io") ? location.hostname.split(".")[0] : null;
  const repo = location.pathname.split("/").filter(Boolean)[0];
  return owner && repo ? `https://github.com/${owner}/${repo}` : null;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // textContent: participant text is never treated as HTML
  return node;
}

// `index` is the contributor's position (0-based), or null for the trainer's card.
function buildCard(p, index) {
  const trainer = index === null;
  const card = el("li", trainer ? "card host" : index < 3 ? "card top" : "card");

  const rank = el("span", "rank", trainer ? "TRAINER" : `#${String(index + 1).padStart(2, "0")}`);
  if (!trainer) rank.title = `Contributor #${index + 1}`;

  const avatar = el("img", "avatar");
  avatar.src = `https://github.com/${encodeURIComponent(p.username)}.png?size=176`;
  avatar.alt = "";
  avatar.loading = "lazy";
  avatar.onerror = () => { avatar.removeAttribute("src"); };

  const username = el("a", "username", `@${p.username}`);
  username.href = `https://github.com/${encodeURIComponent(p.username)}`;
  username.target = "_blank";
  username.rel = "noopener";

  card.append(rank, avatar, el("h2", "name", p.name), username,
    el("p", "city", p.city), el("p", "fact", p.fun_fact));
  return card;
}

function celebrate(p) {
  toast.replaceChildren(
    el("span", "ok", "✓ "), `@${p.username} merged `,
    el("span", "branch", `add-${p.username}`), " into main",
  );
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4500);
  if (window.confetti && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    confetti({ particleCount: 90, spread: 70, startVelocity: 38, ticks: 220, colors: NEON, origin: { y: 0.75 } });
  }
}

async function load() {
  let participants;
  try {
    const res = await fetch(`participants.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    participants = (await res.json()).participants;
  } catch {
    if (firstLoad) empty.hidden = false;
    firstLoad = false;
    return;
  }

  const contributors = participants.filter((p) => !p.trainer);
  participants.forEach((p) => {
    if (seen.has(p.username)) return;
    seen.add(p.username);
    const card = buildCard(p, p.trainer ? null : contributors.indexOf(p));
    //wall.prepend(card); // newest first, so new arrivals show up at the top of the projector
    wall.append(card); // #1 first, #n last
    if (!firstLoad && !p.trainer) {
      card.classList.add("new");
      celebrate(p);
    }
  });

  empty.hidden = contributors.length > 0;
  count.textContent = contributors.length;
  latest.textContent = contributors.length ? `@${contributors[contributors.length - 1].username}` : "—";
  firstLoad = false;
}

const url = repoUrl();
if (url) document.getElementById("join").href = `${url}/blob/main/MISSIONS.md`;

load();
setInterval(load, POLL_MS);
