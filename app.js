const CATS = ["PF", "PPF", "LIC", "FD", "RD", "Banks", "Shares"];

const LS_DATA_KEY = "tijori_data";
const LS_CFG_KEY = "tijori_cfg";
const LS_AUTH_KEY = "tijori_auth";
const AUTH_USER = "milansoni";
const AUTH_PASS = "123";

let state = loadLocal();
let cfg = JSON.parse(localStorage.getItem(LS_CFG_KEY) || "{}");
let fileSha = null;

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const empty = {};
  CATS.forEach((c) => (empty[c] = []));
  return empty;
}

function saveLocal() {
  localStorage.setItem(LS_DATA_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function render() {
  renderSummary();
  renderTables();
}

function renderSummary() {
  let totalCurrent = 0,
    totalInvested = 0;
  const byCat = {};
  CATS.forEach((c) => {
    const rows = state[c] || [];
    const cur = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const inv = rows.reduce((s, r) => s + Number(r.invested || 0), 0);
    byCat[c] = cur;
    totalCurrent += cur;
    totalInvested += inv;
  });
  const gain = totalCurrent - totalInvested;
  const gainPct = totalInvested ? ((gain / totalInvested) * 100).toFixed(1) : "0.0";

  const wrap = document.getElementById("summary");
  wrap.innerHTML = "";

  const cards = [
    { label: "Total Current Value", value: fmt(totalCurrent), cls: "total" },
    { label: "Total Invested", value: fmt(totalInvested), cls: "" },
    {
      label: "Gain / Loss",
      value: (gain >= 0 ? "+" : "") + fmt(gain) + " (" + gainPct + "%)",
      cls: gain >= 0 ? "gain" : "loss",
    },
  ];
  cards.forEach((c) => {
    const div = document.createElement("div");
    div.className = "summary-card " + c.cls;
    div.innerHTML = `<div class="label">${c.label}</div><div class="value">${c.value}</div>`;
    wrap.appendChild(div);
  });

  CATS.forEach((c) => {
    const div = document.createElement("div");
    div.className = "summary-card";
    div.innerHTML = `<div class="label">${catLabel(c)}</div><div class="value">${fmt(byCat[c])}</div>`;
    wrap.appendChild(div);
  });
}

function catLabel(c) {
  return c === "Shares" ? "Share Market" : c;
}

function renderTables() {
  const wrap = document.getElementById("tablesWrap");
  wrap.innerHTML = "";

  CATS.forEach((c) => {
    const rows = state[c] || [];
    const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

    const section = document.createElement("div");
    section.className = "cat-section";

    const header = document.createElement("div");
    header.className = "cat-header";
    header.innerHTML = `<span>${catLabel(c)} (${rows.length})</span><span class="cat-total">${fmt(total)}</span>`;
    section.appendChild(header);

    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-row";
      empty.textContent = "No entries yet.";
      section.appendChild(empty);
    } else {
      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Name</th>
            <th>Invested</th>
            <th>Current Value</th>
            <th>Gain/Loss</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector("tbody");
      rows.forEach((r) => {
        const gain = Number(r.amount || 0) - Number(r.invested || 0);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(r.name)}</td>
          <td>${fmt(r.invested)}</td>
          <td>${fmt(r.amount)}</td>
          <td class="${gain >= 0 ? "gain-text" : "loss-text"}">${gain >= 0 ? "+" : ""}${fmt(gain)}</td>
          <td>${escapeHtml(r.note || "")}</td>
          <td><button class="del-btn" data-cat="${c}" data-id="${r.id}">✕</button></td>
        `;
        tbody.appendChild(tr);
      });
      section.appendChild(table);
    }

    wrap.appendChild(section);
  });

  wrap.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { cat, id } = btn.dataset;
      state[cat] = state[cat].filter((r) => r.id !== id);
      saveLocal();
      render();
    });
  });
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

document.getElementById("btnAdd").addEventListener("click", () => {
  const cat = document.getElementById("catSelect").value;
  const name = document.getElementById("inputName").value.trim();
  const amount = document.getElementById("inputAmount").value;
  const invested = document.getElementById("inputInvested").value;
  const note = document.getElementById("inputNote").value.trim();

  if (!name || !amount) {
    alert("Please enter at least a name and current value.");
    return;
  }

  state[cat] = state[cat] || [];
  state[cat].push({
    id: uid(),
    name,
    amount: Number(amount),
    invested: invested ? Number(invested) : Number(amount),
    note,
  });
  saveLocal();
  render();

  document.getElementById("inputName").value = "";
  document.getElementById("inputAmount").value = "";
  document.getElementById("inputInvested").value = "";
  document.getElementById("inputNote").value = "";
});

// ---------- Settings modal ----------
const settingsModal = document.getElementById("settingsModal");

document.getElementById("btnSettings").addEventListener("click", () => {
  document.getElementById("cfgRepo").value = cfg.repo || "themilansoni/tijori";
  document.getElementById("cfgBranch").value = cfg.branch || "main";
  document.getElementById("cfgToken").value = cfg.token || "";
  settingsModal.classList.remove("hidden");
});

document.getElementById("btnCancelSettings").addEventListener("click", () => {
  settingsModal.classList.add("hidden");
});

document.getElementById("btnSaveSettings").addEventListener("click", () => {
  cfg = {
    repo: document.getElementById("cfgRepo").value.trim() || "themilansoni/tijori",
    branch: document.getElementById("cfgBranch").value.trim() || "main",
    token: document.getElementById("cfgToken").value.trim(),
  };
  localStorage.setItem(LS_CFG_KEY, JSON.stringify(cfg));
  settingsModal.classList.add("hidden");
  setStatus("Settings saved", false);
});

// ---------- GitHub sync ----------
function setStatus(msg, isError) {
  const el = document.getElementById("syncStatus");
  el.textContent = msg;
  el.style.color = isError ? "#f87171" : "#8aa0b4";
}

function apiBase() {
  return `https://api.github.com/repos/${cfg.repo}/contents/data.json`;
}

async function ghGet() {
  const res = await fetch(`${apiBase()}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const json = await res.json();
  fileSha = json.sha;
  const decoded = decodeURIComponent(
    atob(json.content.replace(/\n/g, ""))
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
  return JSON.parse(decoded);
}

async function ghPut(data) {
  const content = btoa(
    encodeURIComponent(JSON.stringify(data, null, 2)).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode("0x" + p1)
    )
  );
  const body = {
    message: `Update investment data — ${new Date().toISOString()}`,
    content,
    branch: cfg.branch,
  };
  if (fileSha) body.sha = fileSha;

  const res = await fetch(apiBase(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub PUT failed: ${res.status} ${t}`);
  }
  const json = await res.json();
  fileSha = json.content.sha;
}

document.getElementById("btnSync").addEventListener("click", async () => {
  if (!cfg.token || !cfg.repo) {
    setStatus("Set up GitHub token in Settings first", true);
    document.getElementById("btnSettings").click();
    return;
  }
  setStatus("Syncing...", false);
  try {
    const remote = await ghGet();
    if (remote) {
      // merge: remote wins if it's newer; simplest approach: ask user
      const useRemote = confirm(
        "Remote data.json found on GitHub. Click OK to load it (overwrites local), or Cancel to push your local data instead."
      );
      if (useRemote) {
        state = remote;
        CATS.forEach((c) => (state[c] = state[c] || []));
        saveLocal();
        render();
        setStatus("Loaded from GitHub", false);
        return;
      }
    }
    await ghPut(state);
    setStatus("Pushed to GitHub ✓", false);
  } catch (e) {
    console.error(e);
    setStatus("Sync failed: " + e.message, true);
  }
});

// ---------- Login gate ----------
function isLoggedIn() {
  return localStorage.getItem(LS_AUTH_KEY) === "1" || sessionStorage.getItem(LS_AUTH_KEY) === "1";
}

function showApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appRoot").classList.remove("hidden");
  render();
}

function showLogin() {
  document.getElementById("appRoot").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("loginPassword").value = "";
}

function attemptLogin() {
  const u = document.getElementById("loginUsername").value.trim();
  const p = document.getElementById("loginPassword").value;
  const card = document.getElementById("loginCard");
  const remember = document.getElementById("rememberMe").checked;
  if (u === AUTH_USER && p === AUTH_PASS) {
    if (remember) {
      localStorage.setItem(LS_AUTH_KEY, "1");
    } else {
      sessionStorage.setItem(LS_AUTH_KEY, "1");
    }
    document.getElementById("loginError").classList.add("hidden");
    showApp();
  } else {
    document.getElementById("loginError").classList.remove("hidden");
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
  }
}

document.getElementById("btnLogin").addEventListener("click", attemptLogin);
document.getElementById("loginPassword").addEventListener("keydown", (e) => {
  if (e.key === "Enter") attemptLogin();
});
document.getElementById("loginUsername").addEventListener("keydown", (e) => {
  if (e.key === "Enter") attemptLogin();
});
document.getElementById("btnLogout").addEventListener("click", () => {
  localStorage.removeItem(LS_AUTH_KEY);
  sessionStorage.removeItem(LS_AUTH_KEY);
  showLogin();
});

document.getElementById("forgotLink").addEventListener("click", () => {
  document.getElementById("forgotNote").classList.toggle("hidden");
});

document.getElementById("togglePw").addEventListener("click", () => {
  const pw = document.getElementById("loginPassword");
  const btn = document.getElementById("togglePw");
  const show = pw.type === "password";
  pw.type = show ? "text" : "password";
  btn.textContent = show ? "hide" : "show";
  btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

// ---------- Background glow + grid parallax ----------
(function initBgParallax() {
  const bg = document.getElementById("liveBg");
  if (!bg) return;
  const glow = bg.querySelector(".glow");
  const grid = bg.querySelector(".dot-grid");
  let targetX = 0, targetY = 0, curX = 0, curY = 0;

  document.getElementById("loginScreen").addEventListener("mousemove", (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function tick() {
    curX += (targetX - curX) * 0.03;
    curY += (targetY - curY) * 0.03;
    if (glow) glow.style.transform = `translate(calc(-50% + ${curX * 30}px), calc(-50% + ${curY * 30}px))`;
    if (grid) grid.style.transform = `translate(${curX * 8}px, ${curY * 8}px)`;
    requestAnimationFrame(tick);
  }
  tick();
})();

if (isLoggedIn()) {
  showApp();
} else {
  showLogin();
}
