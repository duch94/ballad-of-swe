const dom = {
  body: document.body,
  phaseLabel: document.getElementById("phase-label"),
  heroTitle: document.getElementById("hero-title"),
  heroSubtitle: document.getElementById("hero-subtitle"),
  posterSlogan: document.getElementById("poster-slogan"),
  dataNote: document.getElementById("data-note"),
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
  currentEpisode: document.getElementById("current-episode"),
  episodesLeft: document.getElementById("episodes-left"),
  targetDate: document.getElementById("target-date"),
  openReminder: document.getElementById("open-reminder"),
  reminderModal: document.getElementById("reminder-modal"),
  modalBackdrop: document.getElementById("modal-backdrop"),
  closeReminder: document.getElementById("close-reminder"),
  reminderText: document.getElementById("reminder-text"),
  copyButton: document.getElementById("copy-button"),
  copyLabel: document.getElementById("copy-label"),
  copyFeedback: document.getElementById("copy-feedback"),
  fireworks: document.getElementById("fireworks")
};

let appData = null;
let countdownTimer = null;
let celebrationStarted = false;
let lastFocusedElement = null;

function getEpisodeOverride() {
  const params = new URLSearchParams(window.location.search);
  const rawValue = params.get("episode");
  if (!rawValue) {
    return null;
  }

  const episode = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(episode) || episode < 1) {
    return null;
  }

  return episode;
}

function applyEpisodeOverride(data) {
  const episodeOverride = getEpisodeOverride();
  if (!episodeOverride) {
    return data;
  }

  const scheduled = new Date(data.scheduled_utc);
  const episodesRemaining = 1500 - episodeOverride;
  const target = new Date(scheduled.getTime() + Math.max(episodesRemaining, 0) * 7 * 24 * 60 * 60 * 1000);

  return {
    ...data,
    episode: episodeOverride,
    episodes_remaining: episodesRemaining,
    target_utc: target.toISOString(),
    simulation_mode: true
  };
}

function pad(value, size = 2) {
  return String(value).padStart(size, "0");
}

function formatTargetDate(target) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(target);
}

function getPhase(data) {
  const target = new Date(data.target_utc);
  if (data.episode >= 1500 || Date.now() >= target.getTime()) {
    return "celebration";
  }

  if (data.episode >= 1490) {
    return "final-stretch";
  }

  return "build-up";
}

function getReminderText(episode) {
  if (episode >= 1500) {
    return "Umputun, не забудь об истории про программиста! Время пришло";
  }

  const weeksLeft = Math.max(1500 - episode, 0);
  return `Umputun, не забудь об истории про программиста! Осталось ${weeksLeft} недель`;
}

function setPhaseContent(phase, data) {
  const phaseContent = {
    "build-up": {
      label: "Народный отсчет ведется",
      title: "До великого напоминания осталось",
      subtitle:
        "История про программиста держится в эфирной памяти и уверенно движется к выпуску 1500.",
      slogan: "Товарищи слушатели, подготовка к историческому напоминанию идет по графику.",
      note: "Расчет основан на RSS Радио-Т и гипотезе, что выпуски идут каждую субботу в 20:00 UTC без пропусков."
    },
    "final-stretch": {
      label: "Финальный эфирный рывок",
      title: "Почти юбилей. Пора держать напоминание наготове",
      subtitle:
        "Прожекторы уже включены, народ волнуется, а текст для Umputun пора подносить к буферу обмена.",
      slogan: "Триумфальный эфир близко. Победная готовность к напоминанию объявляется открытой.",
      note: "Чем ближе выпуск 1500, тем серьезнее становится народный контроль за обещанной историей."
    },
    celebration: {
      label: "Момент настал",
      title: "Выпуск 1500 здесь. Время напомнить",
      subtitle:
        "Салют в небе, торжество на сцене, а история про программиста официально требует выхода к слушателям.",
      slogan: "Праздничное распоряжение дня: скопировать текст и направить его в эфирное пространство.",
      note: "Данные RSS больше не нужны для ожидания: выпуск 1500 уже пришел, и напоминание готово к отправке."
    }
  }[phase];

  dom.body.dataset.phase = phase;
  dom.phaseLabel.textContent = phaseContent.label;
  dom.heroTitle.textContent = phaseContent.title;
  dom.heroSubtitle.textContent = phaseContent.subtitle;
  dom.posterSlogan.textContent = phaseContent.slogan;
  dom.dataNote.textContent = phaseContent.note;
  dom.openReminder.textContent =
    phase === "build-up" ? "Открыть напоминание" : "Открыть и напомнить";
  dom.episodesLeft.textContent = `${Math.max(data.episodes_remaining, 0)} выпусков`;
}

function openReminderModal() {
  if (!appData || dom.copyButton.disabled) {
    return;
  }

  lastFocusedElement = document.activeElement;
  dom.reminderModal.hidden = false;
  dom.body.style.overflow = "hidden";
  dom.copyButton.focus();
}

function closeReminderModal() {
  dom.reminderModal.hidden = true;
  dom.body.style.overflow = "";
  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
}

function updateCountdown(target, phase) {
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (phase === "celebration" || diffMs <= 0) {
    dom.days.textContent = "1500";
    dom.hours.textContent = "00";
    dom.minutes.textContent = "00";
    dom.seconds.textContent = "00";
    return;
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  dom.days.textContent = pad(days, 4);
  dom.hours.textContent = pad(hours);
  dom.minutes.textContent = pad(minutes);
  dom.seconds.textContent = pad(seconds);
}

async function copyReminder() {
  if (!appData) {
    dom.copyFeedback.textContent = "Нет данных для текста напоминания.";
    return;
  }

  const text = getReminderText(appData.episode);

  try {
    await navigator.clipboard.writeText(text);
    dom.copyFeedback.textContent = "Скопировано. Теперь это можно нести в @radio_t_chat.";
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "readonly");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    document.body.removeChild(helper);
    dom.copyFeedback.textContent = "Скопировано через запасной способ. Напоминание готово.";
  }

  const previousLabel = dom.copyLabel.textContent;
  dom.copyLabel.textContent = "Скопировано";
  window.setTimeout(() => {
    dom.copyLabel.textContent = previousLabel;
  }, 1600);
}

function startCountdown(data) {
  const target = new Date(data.target_utc);
  const phase = getPhase(data);

  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }

  updateCountdown(target, phase);
  countdownTimer = window.setInterval(() => {
    updateCountdown(target, phase);
  }, 1000);
}

function render(data) {
  appData = data;
  dom.copyButton.disabled = false;
  dom.openReminder.disabled = false;
  const phase = getPhase(data);
  const target = new Date(data.target_utc);

  dom.currentEpisode.textContent = `#${data.episode}`;
  dom.targetDate.textContent = formatTargetDate(target);
  dom.reminderText.textContent = getReminderText(data.episode);
  setPhaseContent(phase, data);

  if (data.simulation_mode) {
    dom.phaseLabel.textContent += " · демо-режим";
    dom.dataNote.textContent += " Сейчас включена симуляция через параметр ?episode=.";
  }

  startCountdown(data);

  if (phase === "celebration" && !celebrationStarted) {
    celebrationStarted = true;
    startFireworks();
  }
}

async function loadData() {
  try {
    const response = await fetch("./data/latest.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    render(applyEpisodeOverride(data));
  } catch {
    const openedFromFile = window.location.protocol === "file:";
    dom.body.dataset.phase = "build-up";
    dom.phaseLabel.textContent = "Данные временно недоступны";
    dom.heroTitle.textContent = "Не удалось загрузить актуальный отсчет";
    dom.heroSubtitle.textContent =
      openedFromFile
        ? "Страница открыта через file://, а браузер не дает fetch читать локальный JSON рядом с HTML."
        : "Файл data/latest.json не прочитался. Проверь, что GitHub Actions успел обновить данные и что страница открывается с веб-сервера.";
    dom.posterSlogan.textContent = openedFromFile
      ? "Для локального просмотра нужен простой веб-сервер. На GitHub Pages все будет работать штатно."
      : "Народный контроль ждет свежий JSON и временно держит паузу.";
    dom.dataNote.textContent =
      openedFromFile
        ? "Запусти страницу через сервер, например `python3 -m http.server`, или открой опубликованную версию на GitHub Pages."
        : "Для этой страницы нужен локальный файл data/latest.json из репозитория. Без него отсчет намеренно не показывается.";
    dom.currentEpisode.textContent = "—";
    dom.episodesLeft.textContent = "—";
    dom.targetDate.textContent = "—";
    dom.reminderText.textContent = "Текст напоминания появится здесь после загрузки актуального JSON.";
    dom.days.textContent = "----";
    dom.hours.textContent = "--";
    dom.minutes.textContent = "--";
    dom.seconds.textContent = "--";
    dom.copyButton.disabled = true;
    dom.openReminder.disabled = true;
    dom.copyFeedback.textContent = "Сначала нужен актуальный JSON с данными выпуска.";
  }
}

function startFireworks() {
  const canvas = dom.fireworks;
  const context = canvas.getContext("2d");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!context || prefersReducedMotion) {
    return;
  }

  const phase = appData ? getPhase(appData) : "celebration";
  const config =
    phase === "celebration"
      ? { burstCount: 3, particleCount: 52, intervalMs: 700 }
      : { burstCount: 2, particleCount: 34, intervalMs: 1300 };

  const particles = [];
  let animationFrame = null;

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  function spawnBurst() {
    const x = Math.random() * window.innerWidth;
    const y = window.innerHeight * (0.18 + Math.random() * 0.38);
    const count = config.particleCount;
    const palette = ["#f7c25b", "#f15c35", "#fff2cc", "#ffd36b", "#f96d53"];

    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const speed = 1.4 + Math.random() * 2.3;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 60 + Math.random() * 30,
        color: palette[index % palette.length],
        size: 2 + Math.random() * 2.5
      });
    }
  }

  function draw() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.015;
      particle.life -= 1;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }

      context.globalAlpha = Math.max(particle.life / 90, 0);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    animationFrame = window.requestAnimationFrame(draw);
  }

  resize();
  for (let burstIndex = 0; burstIndex < config.burstCount; burstIndex += 1) {
    spawnBurst();
  }
  draw();
  window.setInterval(spawnBurst, config.intervalMs);
  window.addEventListener("resize", resize);

  window.addEventListener("beforeunload", () => {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
    }
  });
}

dom.openReminder.addEventListener("click", openReminderModal);
dom.closeReminder.addEventListener("click", closeReminderModal);
dom.modalBackdrop.addEventListener("click", closeReminderModal);
dom.copyButton.addEventListener("click", copyReminder);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !dom.reminderModal.hidden) {
    closeReminderModal();
  }
});
loadData();
