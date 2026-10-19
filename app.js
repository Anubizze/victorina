const roster = [
  { klass: "11а", people: ["Мейрамгали Диана"] },
  { klass: "10а", people: ["Аминова Аделина", "Юнусов Эмир"] },
  { klass: "9а", people: ["Прокопенко Мария"] },
  { klass: "8а", people: ["Дмитриева Эвелина"] },
  { klass: "8б", people: ["Чиглинцева Аделина", "Орумбаева Ислана", "Манчур Диана"] },
  { klass: "7б", people: ["Серикова Инара", "Молдыбаева Данэль"] },
  { klass: "6а", people: ["Алпаслан Мира"] },
  { klass: "6б", people: ["Левенс София"] },
  { klass: "5б", people: ["Кладинова Мария"] },
];

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

const state = {
  klass: null,
  person: null,
};

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

function countLabel(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} человек`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} человека`;
  return `${count} человек`;
}

function renderClasses() {
  classesEl.innerHTML = "";
  roster.forEach((group) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "class-btn" + (state.klass === group.klass ? " is-on" : "");
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(state.klass === group.klass));
    button.innerHTML = `${formatClass(group.klass)}<small>${countLabel(group.people.length)}</small>`;
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
  peopleCount.textContent = countLabel(group.people.length);
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
  confirmBtn.disabled = !ready;
  stepLabel.textContent = state.person ? "Шаг 2 из 2" : "Шаг 1 из 2";
}

function selectClass(klass) {
  state.klass = klass;
  state.person = null;
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
  renderPeople();
  renderDock();
}

function showResult() {
  resultName.textContent = state.person;
  resultClass.textContent = `Класс ${formatClass(state.klass)}`;
  picker.hidden = true;
  result.hidden = false;
  dock.hidden = true;
  stepLabel.textContent = "Готово";
  localStorage.setItem("victorina-pick", JSON.stringify({ klass: state.klass, person: state.person }));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPicker() {
  picker.hidden = false;
  result.hidden = true;
  renderClasses();
  renderPeople();
  renderDock();
}

confirmBtn.addEventListener("click", showResult);
changeBtn.addEventListener("click", () => {
  localStorage.removeItem("victorina-pick");
  showPicker();
});

const saved = localStorage.getItem("victorina-pick");
if (saved) {
  try {
    const pick = JSON.parse(saved);
    const group = roster.find((item) => item.klass === pick.klass && item.people.includes(pick.person));
    if (group) {
      state.klass = pick.klass;
      state.person = pick.person;
      showResult();
    } else {
      showPicker();
    }
  } catch {
    showPicker();
  }
} else {
  showPicker();
}
