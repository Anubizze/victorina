let roster = [];

const tones = ["#ffe14a", "#ffb4a2", "#9ad7ff", "#c8f54a", "#f3c1ff", "#ffd29a"];

const classesEl = document.getElementById("classes");
const peopleWrap = document.getElementById("peopleWrap");
const peopleEl = document.getElementById("people");
const peopleTitle = document.getElementById("peopleTitle");
const peopleCount = document.getElementById("peopleCount");
const dock = document.getElementById("dock");
const dockName = document.getElementById("dockName");
const confirmBtn = document.getElementById("confirmBtn");
const stepLabel = document.getElementById("stepLabel");
const picker = document.getElementById("picker");
const result = document.getElementById("result");
const resultName = document.getElementById("resultName");
const resultClass = document.getElementById("resultClass");
const changeBtn = document.getElementById("changeBtn");
const topList = document.getElementById("topList");
const boardTotal = document.getElementById("boardTotal");
const voteError = document.getElementById("voteError");
const resultError = document.getElementById("resultError");

const state = {
  klass: null,
  person: null,
  sending: false,
};

let pollTimer = 0;

function formatClass(klass) {
  return klass.slice(0, -1) + klass.slice(-1).toUpperCase();
}

function initials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function tone(name) {
  const code = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[code % tones.length];
}

function plural(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} ${few}`;
  return `${count} ${many}`;
}

function voterId() {
  const key = "victorina-voter";
  let id = localStorage.getItem(key);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(id || "")) {
    id = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(key, id);
  }
  return id;
}

function renderClasses() {
  classesEl.innerHTML = "";
  roster.forEach((group) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "class-btn" + (state.klass === group.klass ? " is-on" : "");
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(state.klass === group.klass));
    button.innerHTML = `${formatClass(group.klass)}<small>${plural(group.people.length, "человек", "человека", "человек")}</small>`;
    button.addEventListener("click", () => selectClass(group.klass));
    classesEl.appendChild(button);
  });
}

function renderPeople() {
  const group = roster.find((item) => item.klass === state.klass);
  if (!group) {
    peopleWrap.hidden = true;
    return;
  }

  peopleWrap.hidden = false;
  peopleTitle.textContent = `Класс ${formatClass(group.klass)}`;
  peopleCount.textContent = plural(group.people.length, "человек", "человека", "человек");
  peopleEl.innerHTML = "";

  group.people.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "person" + (state.person === name ? " is-on" : "");
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(state.person === name));
    button.innerHTML = `
      <span class="avatar" style="background:${tone(name)}">${initials(name)}</span>
      <span class="person-name">${name}</span>
      <span class="mark" aria-hidden="true"></span>
    `;
    button.addEventListener("click", () => selectPerson(name));
    peopleEl.appendChild(button);
  });
}

function renderDock() {
  const ready = Boolean(state.klass && state.person);
  dock.hidden = false;
  dockName.textContent = ready ? `${state.person}, ${formatClass(state.klass)}` : "Сначала выбери человека";
  confirmBtn.disabled = !ready || state.sending;
  confirmBtn.textContent = state.sending ? "Сохраняем..." : "Проголосовать";
  stepLabel.textContent = state.person ? "Шаг 2 из 2" : "Шаг 1 из 2";
}

function renderTop(top, total) {
  boardTotal.textContent = plural(total, "голос", "голоса", "голосов");
  topList.innerHTML = "";
  const max = Math.max(1, ...top.map((item) => item.votes));

  top.forEach((item) => {
    const row = document.createElement("li");
    const mine = item.klass === state.klass && item.person === state.person;
    row.className = "rank" + (mine ? " is-mine" : "");

    const place = document.createElement("span");
    place.className = "rank-n";
    place.textContent = String(item.rank);

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.style.background = tone(item.person);
    avatar.textContent = initials(item.person);

    const copy = document.createElement("span");
    copy.className = "rank-copy";
    const name = document.createElement("span");
    name.className = "person-name";
    name.textContent = item.person;
    const klass = document.createElement("span");
    klass.className = "rank-class";
    klass.textContent = formatClass(item.klass);
    copy.append(name, klass);

    const votes = document.createElement("span");
    votes.className = "rank-votes";
    votes.textContent = plural(item.votes, "голос", "голоса", "голосов");

    const bar = document.createElement("span");
    bar.className = "rank-bar";
    bar.style.width = `${Math.round((item.votes / max) * 100)}%`;

    row.append(place, avatar, copy, votes, bar);
    topList.appendChild(row);
  });
}

function selectClass(klass) {
  state.klass = klass;
  state.person = null;
  voteError.hidden = true;
  renderClasses();
  renderPeople();
  renderDock();
  const dockHeight = dock.getBoundingClientRect().height;
  const bottom = peopleWrap.getBoundingClientRect().bottom + window.scrollY;
  const target = bottom - window.innerHeight + dockHeight + 24;
  window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
}

function selectPerson(name) {
  state.person = name;
  voteError.hidden = true;
  renderPeople();
  renderDock();
}

function stopPoll() {
  clearInterval(pollTimer);
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(() => {
    refreshTop();
  }, 5000);
}

function showResult(data) {
  resultName.textContent = state.person;
  resultClass.textContent = `Класс ${formatClass(state.klass)}`;
  resultError.hidden = true;
  renderTop(data.top, data.total);
  picker.hidden = true;
  result.hidden = false;
  dock.hidden = true;
  stepLabel.textContent = "Топ";
  window.scrollTo({ top: 0, behavior: "smooth" });
  startPoll();
}

function showPicker() {
  stopPoll();
  picker.hidden = false;
  result.hidden = true;
  renderClasses();
  renderPeople();
  renderDock();
}

async function refreshTop() {
  try {
    const response = await fetch(`/api/results?voterId=${encodeURIComponent(voterId())}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    renderTop(data.top, data.total);
  } catch {
    resultError.hidden = false;
    resultError.textContent = "Не удалось обновить топ";
  }
}

async function submitVote() {
  if (!state.klass || !state.person || state.sending) return;
  state.sending = true;
  voteError.hidden = true;
  renderDock();

  try {
    const response = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId: voterId(), klass: state.klass, person: state.person }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Не удалось сохранить голос");
    localStorage.setItem("victorina-pick", JSON.stringify({ klass: state.klass, person: state.person }));
    showResult(data);
  } catch (error) {
    voteError.hidden = false;
    voteError.textContent = error.message || "Не удалось сохранить голос";
  } finally {
    state.sending = false;
    if (result.hidden) renderDock();
  }
}

confirmBtn.addEventListener("click", submitVote);
changeBtn.addEventListener("click", showPicker);

async function boot() {
  const response = await fetch("./roster.json", { cache: "no-store" });
  roster = await response.json();

  const saved = localStorage.getItem("victorina-pick");
  if (!saved) {
    showPicker();
    return;
  }

  try {
    const pick = JSON.parse(saved);
    const group = roster.find((item) => item.klass === pick.klass && item.people.includes(pick.person));
    if (!group) {
      showPicker();
      return;
    }
    state.klass = pick.klass;
    state.person = pick.person;
    const results = await fetch(`/api/results?voterId=${encodeURIComponent(voterId())}`, { cache: "no-store" });
    if (!results.ok) {
      showPicker();
      return;
    }
    showResult(await results.json());
  } catch {
    showPicker();
  }
}

boot();
