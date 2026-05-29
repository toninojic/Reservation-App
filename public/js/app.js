const state = {
  user: null,
  bounds: null,
  events: [],
  users: [],
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
  selectedAdminUser: null,
  profileLogoObjectUrl: null,
  swipe: {
    startX: 0,
    startY: 0,
    currentX: 0,
    active: false,
    didSwipe: false
  },
  modalEvent: null,
  modalMode: "view"
};

const monthNames = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar"
];

const weekdays = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"];

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  renderWeekdays();
  checkSession();
});

function cacheElements() {
  Object.assign(els, {
    authScreen: document.querySelector("#auth-screen"),
    appShell: document.querySelector("#app-shell"),
    loginForm: document.querySelector("#login-form"),
    registerForm: document.querySelector("#register-form"),
    authMessage: document.querySelector("#auth-message"),
    authTabs: document.querySelectorAll(".auth-tab"),
    logoutButton: document.querySelector("#logout-button"),
    roleLabel: document.querySelector("#role-label"),
    workspaceTitle: document.querySelector("#workspace-title"),
    topbarMonthLabel: document.querySelector("#topbar-month-label"),
    publicAuthActions: document.querySelector("#public-auth-actions"),
    publicLoginButton: document.querySelector("#public-login-button"),
    publicRegisterButton: document.querySelector("#public-register-button"),
    userChip: document.querySelector("#user-chip"),
    profileButton: document.querySelector("#profile-button"),
    calendarView: document.querySelector("#calendar-view"),
    profileView: document.querySelector("#profile-view"),
    adminView: document.querySelector("#admin-view"),
    previousMonth: document.querySelector("#previous-month"),
    nextMonth: document.querySelector("#next-month"),
    todayButton: document.querySelector("#today-button"),
    mobileMonthLabel: document.querySelector("#mobile-month-label"),
    monthSelect: document.querySelector("#month-select"),
    yearSelect: document.querySelector("#year-select"),
    weekdayGrid: document.querySelector("#weekday-grid"),
    calendarGrid: document.querySelector("#calendar-grid"),
    calendarPanel: document.querySelector(".calendar-panel"),
    upcomingEvents: document.querySelector("#upcoming-events"),
    todayEventsWidget: document.querySelector("#today-events-widget"),
    todayEvents: document.querySelector("#today-events"),
    profileForm: document.querySelector("#profile-form"),
    profileLogoInput: document.querySelector("#profile-logo-input"),
    profileLogoPreview: document.querySelector("#profile-logo-preview"),
    profileLogoPlaceholder: document.querySelector("#profile-logo-placeholder"),
    profileEmail: document.querySelector("#profile-email"),
    profileStatus: document.querySelector("#profile-status"),
    profileMessage: document.querySelector("#profile-message"),
    backToCalendar: document.querySelector("#back-to-calendar"),
    cancelProfileEdit: document.querySelector("#cancel-profile-edit"),
    eventModal: document.querySelector("#event-modal"),
    modalClose: document.querySelector("#modal-close"),
    modalTitle: document.querySelector("#modal-title"),
    modalDateLabel: document.querySelector("#modal-date-label"),
    eventDetails: document.querySelector("#event-details"),
    eventForm: document.querySelector("#event-form"),
    eventMessage: document.querySelector("#event-message"),
    cancelEdit: document.querySelector("#cancel-edit"),
    removeFlyerWrap: document.querySelector("#remove-flyer-wrap"),
    usersTable: document.querySelector("#users-table"),
    eventsTable: document.querySelector("#events-table"),
    pendingCount: document.querySelector("#pending-count"),
    eventCount: document.querySelector("#event-count"),
    userModal: document.querySelector("#user-modal"),
    userModalClose: document.querySelector("#user-modal-close"),
    userModalTitle: document.querySelector("#user-modal-title"),
    adminUserDetails: document.querySelector("#admin-user-details"),
    passwordResetForm: document.querySelector("#password-reset-form"),
    passwordResetMessage: document.querySelector("#password-reset-message"),
    cancelPasswordReset: document.querySelector("#cancel-password-reset"),
    flyerLightbox: document.querySelector("#flyer-lightbox"),
    lightboxClose: document.querySelector("#lightbox-close"),
    lightboxImage: document.querySelector("#lightbox-image"),
    toast: document.querySelector("#toast")
  });
}

function bindEvents() {
  els.authTabs.forEach((tab) =>
    tab.addEventListener("click", () => navigateTo(tab.dataset.authTab === "register" ? "/register" : "/login"))
  );
  els.publicLoginButton.addEventListener("click", () => navigateTo("/login"));
  els.publicRegisterButton.addEventListener("click", () => navigateTo("/register"));
  els.loginForm.addEventListener("submit", handleLogin);
  els.registerForm.addEventListener("submit", handleRegister);
  els.profileButton.addEventListener("click", showProfileView);
  els.backToCalendar.addEventListener("click", showCalendarView);
  els.cancelProfileEdit.addEventListener("click", showCalendarView);
  els.profileLogoInput.addEventListener("change", handleProfileLogoPreview);
  els.profileForm.addEventListener("submit", handleProfileSubmit);
  els.logoutButton.addEventListener("click", handleLogout);
  els.previousMonth.addEventListener("click", () => moveMonth(-1));
  els.nextMonth.addEventListener("click", () => moveMonth(1));
  els.todayButton.addEventListener("click", goToToday);
  els.monthSelect.addEventListener("change", () => {
    state.currentMonth = Number(els.monthSelect.value);
    renderCalendar();
  });
  els.yearSelect.addEventListener("change", () => {
    state.currentYear = Number(els.yearSelect.value);
    renderCalendar();
  });
  els.modalClose.addEventListener("click", closeModal);
  els.cancelEdit.addEventListener("click", () => {
    if (state.modalEvent) {
      showEventDetails(state.modalEvent);
    } else {
      closeModal();
    }
  });
  els.eventModal.addEventListener("click", (event) => {
    if (event.target === els.eventModal) {
      closeModal();
    }
  });
  els.calendarPanel.addEventListener("touchstart", handleCalendarTouchStart, { passive: true });
  els.calendarPanel.addEventListener("touchmove", handleCalendarTouchMove, { passive: false });
  els.calendarPanel.addEventListener("touchend", handleCalendarTouchEnd);
  els.calendarPanel.addEventListener("touchcancel", handleCalendarTouchCancel);
  els.userModalClose.addEventListener("click", closeUserModal);
  els.cancelPasswordReset.addEventListener("click", closeUserModal);
  els.userModal.addEventListener("click", (event) => {
    if (event.target === els.userModal) {
      closeUserModal();
    }
  });
  els.passwordResetForm.addEventListener("submit", handlePasswordReset);
  els.lightboxClose.addEventListener("click", closeFlyerLightbox);
  els.flyerLightbox.addEventListener("click", (event) => {
    if (event.target === els.flyerLightbox) {
      closeFlyerLightbox();
    }
  });
  els.eventForm.addEventListener("submit", handleEventSubmit);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (!els.flyerLightbox.hidden) {
      closeFlyerLightbox();
    } else if (!els.eventModal.hidden) {
      closeModal();
    } else if (!els.userModal.hidden) {
      closeUserModal();
    }
  });
  window.addEventListener("popstate", () => {
    applyRoute();
  });
}

async function api(path, options = {}) {
  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Zahtev nije uspeo.");
  }

  return data;
}

async function checkSession() {
  try {
    const data = await api("/api/auth/me");
    state.user = data.user;
  } catch (err) {
    state.user = null;
  }

  await applyRoute();
}

function normalizeRoutePath(pathname) {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const knownRoutes = new Set(["/", "/login", "/register", "/dashboard", "/admin"]);
  return knownRoutes.has(cleanPath) ? cleanPath : "/";
}

function navigateTo(path, options = {}) {
  const normalizedPath = normalizeRoutePath(path);
  const method = options.replace ? "replaceState" : "pushState";

  if (window.location.pathname !== normalizedPath) {
    window.history[method]({}, "", normalizedPath);
  } else if (options.replace) {
    window.history.replaceState({}, "", normalizedPath);
  }

  return applyRoute();
}

async function applyRoute() {
  const path = normalizeRoutePath(window.location.pathname);

  if (path !== window.location.pathname) {
    window.history.replaceState({}, "", path);
  }

  if ((path === "/login" || path === "/register") && state.user) {
    await navigateTo(state.user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    return;
  }

  if (path === "/login" || path === "/register") {
    showAuth(path === "/register" ? "register" : "login");
    return;
  }

  if (path === "/admin") {
    if (!state.user) {
      await navigateTo("/login", { replace: true });
      return;
    }

    if (state.user.role !== "admin") {
      showToast("Nemate pristup admin panelu.");
      await navigateTo("/dashboard", { replace: true });
      return;
    }

    await showAdminView();
    return;
  }

  if (path === "/dashboard") {
    if (!state.user) {
      await navigateTo("/login", { replace: true });
      return;
    }

    if (state.user && state.user.role === "admin") {
      await navigateTo("/admin", { replace: true });
      return;
    }

    await showOrganizationCalendar();
    return;
  }

  if (state.user) {
    await navigateTo(state.user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    return;
  }

  await showPublicCalendar();
}

function showAuth(tabName = "login") {
  els.authScreen.hidden = false;
  els.appShell.hidden = true;
  switchAuthTab(tabName, { updateRoute: false });
  setMessage(els.authMessage, "");
}

async function showPublicCalendar() {
  els.authScreen.hidden = true;
  els.appShell.hidden = false;
  els.publicAuthActions.hidden = false;
  els.userChip.hidden = true;
  els.userChip.innerHTML = "";
  els.logoutButton.hidden = true;
  els.profileButton.hidden = true;
  els.roleLabel.textContent = "Javni kalendar";
  els.workspaceTitle.textContent = "Rezervacije";
  els.adminView.hidden = true;
  els.profileView.hidden = true;
  els.calendarView.hidden = false;
  setupCalendarControls();
  await loadEvents();
}

async function showAdminView() {
  els.authScreen.hidden = true;
  els.appShell.hidden = false;
  els.publicAuthActions.hidden = true;
  els.userChip.hidden = false;
  els.logoutButton.hidden = false;
  els.profileButton.hidden = true;
  renderUserChip();
  els.roleLabel.textContent = "Admin panel";
  els.workspaceTitle.textContent = "Upravljanje rezervacijama";
  els.topbarMonthLabel.textContent = "Admin panel";
  els.calendarView.hidden = true;
  els.profileView.hidden = true;
  els.adminView.hidden = false;
  await loadAdminData();
}

async function showOrganizationCalendar() {
  els.authScreen.hidden = true;
  els.appShell.hidden = false;
  els.publicAuthActions.hidden = true;
  els.userChip.hidden = false;
  els.logoutButton.hidden = false;
  els.profileButton.hidden = false;
  renderUserChip();
  els.roleLabel.textContent = "Kalendar";
  els.workspaceTitle.textContent = state.user.organization_name;
  els.adminView.hidden = true;
  els.profileView.hidden = true;
  els.calendarView.hidden = false;
  setupCalendarControls();
  await loadEvents();
}

function renderUserChip() {
  els.userChip.innerHTML = "";

  if (!state.user) {
    return;
  }

  if (state.user.logo_path) {
    const logo = document.createElement("img");
    logo.src = state.user.logo_path;
    logo.alt = state.user.organization_name;
    els.userChip.append(logo);
  }

  els.userChip.append(document.createTextNode(state.user.organization_name));
}

function showCalendarView() {
  revokeProfilePreviewUrl();
  els.profileView.hidden = true;
  els.adminView.hidden = true;
  els.calendarView.hidden = false;
  els.roleLabel.textContent = "Kalendar";
  els.workspaceTitle.textContent = state.user.organization_name;
  els.topbarMonthLabel.textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;
  setMessage(els.profileMessage, "");
  renderCalendar();
}

function showProfileView() {
  renderProfileForm();
  els.calendarView.hidden = true;
  els.adminView.hidden = true;
  els.profileView.hidden = false;
  els.roleLabel.textContent = "Podešavanja profila";
  els.workspaceTitle.textContent = state.user.organization_name;
  els.topbarMonthLabel.textContent = "Podešavanja profila";
}

function renderProfileForm() {
  revokeProfilePreviewUrl();
  els.profileForm.reset();
  els.profileForm.elements.organization_name.value = state.user.organization_name || "";
  els.profileEmail.textContent = state.user.email;
  els.profileStatus.textContent = statusLabel(state.user.status);
  setProfileLogoPreview(state.user.logo_path);
  setMessage(els.profileMessage, "");
}

function setProfileLogoPreview(src) {
  if (src) {
    els.profileLogoPreview.src = src;
    els.profileLogoPreview.hidden = false;
    els.profileLogoPlaceholder.hidden = true;
  } else {
    els.profileLogoPreview.src = "";
    els.profileLogoPreview.hidden = true;
    els.profileLogoPlaceholder.hidden = false;
  }
}

function handleProfileLogoPreview() {
  const file = els.profileLogoInput.files && els.profileLogoInput.files[0];

  if (!file) {
    revokeProfilePreviewUrl();
    setProfileLogoPreview(state.user.logo_path);
    return;
  }

  revokeProfilePreviewUrl();
  state.profileLogoObjectUrl = URL.createObjectURL(file);
  setProfileLogoPreview(state.profileLogoObjectUrl);
}

function revokeProfilePreviewUrl() {
  if (state.profileLogoObjectUrl) {
    URL.revokeObjectURL(state.profileLogoObjectUrl);
    state.profileLogoObjectUrl = null;
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  setMessage(els.profileMessage, "");

  try {
    const data = await api("/api/auth/profile", {
      method: "PUT",
      body: new FormData(els.profileForm)
    });
    state.user = data.user;
    renderUserChip();
    renderProfileForm();
    els.workspaceTitle.textContent = state.user.organization_name;
    showToast(data.message || "Izmene profila su sačuvane.");
    setMessage(els.profileMessage, data.message || "Izmene profila su sačuvane.", "success");
    await loadEvents();
  } catch (err) {
    setMessage(els.profileMessage, err.message, "error");
  }
}

function switchAuthTab(tabName, options = {}) {
  els.authTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.authTab === tabName));
  els.loginForm.classList.toggle("is-hidden", tabName !== "login");
  els.registerForm.classList.toggle("is-hidden", tabName !== "register");
  if (options.updateRoute !== false) {
    window.history.replaceState({}, "", tabName === "register" ? "/register" : "/login");
  }
  setMessage(els.authMessage, "");
}

async function handleLogin(event) {
  event.preventDefault();
  setMessage(els.authMessage, "");

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(els.loginForm)))
    });
    state.user = data.user;
    els.loginForm.reset();
    await navigateTo(state.user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  } catch (err) {
    setMessage(els.authMessage, err.message, "error");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  setMessage(els.authMessage, "");

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: new FormData(els.registerForm)
    });
    els.registerForm.reset();
    await navigateTo("/login", { replace: true });
    setMessage(els.authMessage, data.message || "Nalog čeka odobrenje.", "success");
  } catch (err) {
    setMessage(els.authMessage, err.message, "error");
  }
}

async function handleLogout() {
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  state.user = null;
  state.events = [];
  state.users = [];
  await navigateTo("/", { replace: true });
}

function setupCalendarControls() {
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 1;
  const maxYear = currentYear + 2;
  state.bounds = {
    min: `${minYear}-01-01`,
    max: `${maxYear}-12-31`
  };

  els.monthSelect.innerHTML = monthNames
    .map((month, index) => `<option value="${index}">${month}</option>`)
    .join("");

  els.yearSelect.innerHTML = "";
  for (let year = minYear; year <= maxYear; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    els.yearSelect.append(option);
  }

  clampCurrentMonth();
}

async function loadEvents() {
  const data = await api(`/api/events?from=${state.bounds.min}&to=${state.bounds.max}`);
  state.events = data.events;
  state.bounds = data.bounds || state.bounds;
  clampCurrentMonth();
  renderCalendar();
  renderUpcomingEvents();
}

async function loadAdminData() {
  const [usersData, eventsData] = await Promise.all([api("/api/admin/users"), api("/api/admin/events")]);
  state.users = usersData.users;
  state.events = eventsData.events;
  state.bounds = eventsData.bounds;
  renderAdmin();
}

function renderWeekdays() {
  els.weekdayGrid.innerHTML = weekdays.map((day) => `<div class="weekday">${day}</div>`).join("");
}

function clampCurrentMonth() {
  if (!state.bounds) {
    return;
  }

  const min = parseDateParts(state.bounds.min);
  const max = parseDateParts(state.bounds.max);
  const selected = state.currentYear * 12 + state.currentMonth;
  const minIndex = min.year * 12 + (min.month - 1);
  const maxIndex = max.year * 12 + (max.month - 1);
  const clamped = Math.min(Math.max(selected, minIndex), maxIndex);
  state.currentYear = Math.floor(clamped / 12);
  state.currentMonth = clamped % 12;
}

function renderCalendar() {
  const eventsByDate = new Map(state.events.map((event) => [event.event_date, event]));
  const firstDay = new Date(state.currentYear, state.currentMonth, 1);
  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const leadingEmpty = (firstDay.getDay() + 6) % 7;
  const today = formatDate(new Date());
  const cells = [];

  els.monthSelect.value = String(state.currentMonth);
  els.yearSelect.value = String(state.currentYear);
  els.topbarMonthLabel.textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;
  els.mobileMonthLabel.textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;

  for (let i = 0; i < leadingEmpty; i += 1) {
    cells.push('<div class="day-cell is-empty" aria-hidden="true"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = formatDate(new Date(state.currentYear, state.currentMonth, day));
    const event = eventsByDate.get(dateKey);
    const classes = ["day-cell"];
    const statusDots = renderCalendarStatusDots(event, dateKey, today);

    if (dateKey === today) {
      classes.push("is-today");
    }

    if (dateKey === state.selectedDate) {
      classes.push("is-selected");
    }

    if (event) {
      classes.push("is-reserved");
      if (state.user && event.user_id === state.user.id) {
        classes.push("is-own");
      }
    }

    cells.push(`
      <button class="${classes.join(" ")}" type="button" data-date="${dateKey}" title="${escapeHtml(
        event ? event.event_name : "Rezerviši datum"
      )}">
        <span class="day-cell-top">
          <span class="day-number">${day}</span>
          <span class="date-status-dots" aria-hidden="true">${statusDots}</span>
        </span>
        ${event ? renderEventPreview(event) : '<span class="day-free">Slobodno</span>'}
      </button>
    `);
  }

  els.calendarGrid.innerHTML = cells.join("");
  els.calendarGrid.querySelectorAll("button[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.swipe.didSwipe) {
        return;
      }

      openDate(button.dataset.date);
    });
  });

  updateMonthButtons();
}

function getCalendarStatus(event, dateKey, todayKey) {
  if (event && state.user && event.user_id === state.user.id) {
    return "mine";
  }

  if (event && state.user && event.user_id && event.user_id !== state.user.id) {
    return "other";
  }

  if (event) {
    return "reserved";
  }

  if (dateKey === todayKey) {
    return "today";
  }

  return "free";
}

function renderCalendarStatusDots(event, dateKey, todayKey) {
  const status = getCalendarStatus(event, dateKey, todayKey);
  const dots = [`<i class="status-dot status-dot--${status}"></i>`];

  if (dateKey === todayKey && status !== "today") {
    dots.push('<i class="status-dot status-dot--today status-dot--secondary"></i>');
  }

  return dots.join("");
}

function renderUpcomingEvents() {
  const today = startOfDay(new Date());
  const lastDay = addDays(today, 6);
  const todayKey = formatDate(today);
  const upcoming = state.events
    .filter((event) => {
      const eventDate = dateFromKey(event.event_date);
      return eventDate >= today && eventDate <= lastDay;
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time));
  const todayEvents = upcoming.filter((event) => event.event_date === todayKey);
  const futureUpcoming = upcoming.filter((event) => event.event_date > todayKey);

  renderTodayEvents(todayEvents);

  if (!futureUpcoming.length) {
    els.upcomingEvents.innerHTML = `
      <div class="empty-upcoming">
        <strong>Nema predstojećih događaja.</strong>
        <span>Narednih 7 dana nema budućih rezervacija.</span>
      </div>
    `;
    return;
  }

  els.upcomingEvents.innerHTML = futureUpcoming
    .map(
      (event) => `
        <button class="upcoming-card" type="button" data-date="${event.event_date}">
          <span class="upcoming-date">${formatDisplayDate(event.event_date)}</span>
          <strong>${escapeHtml(event.event_name)}</strong>
          <span>${escapeHtml(event.start_time)} - ${escapeHtml(event.end_time)}</span>
          <span>${escapeHtml(event.location)}</span>
          <em>${escapeHtml(event.organization_name || "Organizacija")}</em>
        </button>
      `
    )
    .join("");

  els.upcomingEvents.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => openDate(button.dataset.date));
  });
}

function renderTodayEvents(events) {
  if (!events.length) {
    els.todayEventsWidget.hidden = true;
    els.todayEvents.innerHTML = "";
    return;
  }

  els.todayEventsWidget.hidden = false;
  els.todayEvents.innerHTML = events
    .map(
      (event) => `
        <button class="today-event-card" type="button" data-date="${event.event_date}">
          <span class="today-badge">Danas</span>
          <strong>${escapeHtml(event.event_name)}</strong>
          <span>${escapeHtml(event.start_time)} - ${escapeHtml(event.end_time)}</span>
          <span>${escapeHtml(event.location)}</span>
          <em>${escapeHtml(event.organization_name || "Organizacija")}</em>
        </button>
      `
    )
    .join("");

  els.todayEvents.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => openDate(button.dataset.date));
  });
}

function renderEventPreview(event) {
  const imagePath = event.logo_path || event.flyer_path;
  return `
    <span class="event-preview">
      ${imagePath ? `<img class="event-thumb" src="${escapeAttribute(imagePath)}" alt="">` : ""}
      <span class="event-title">${escapeHtml(event.event_name)}</span>
    </span>
  `;
}

function updateMonthButtons() {
  const min = parseDateParts(state.bounds.min);
  const max = parseDateParts(state.bounds.max);
  const selected = state.currentYear * 12 + state.currentMonth;
  els.previousMonth.disabled = selected <= min.year * 12 + (min.month - 1);
  els.nextMonth.disabled = selected >= max.year * 12 + (max.month - 1);
}

function moveMonth(delta) {
  const date = new Date(state.currentYear, state.currentMonth + delta, 1);
  state.currentYear = date.getFullYear();
  state.currentMonth = date.getMonth();
  clampCurrentMonth();
  if (!selectedDateIsVisible()) {
    state.selectedDate = null;
  }
  renderCalendar();
}

function selectedDateIsVisible() {
  if (!state.selectedDate) {
    return false;
  }

  const selected = parseDateParts(state.selectedDate);
  return selected.year === state.currentYear && selected.month === state.currentMonth + 1;
}

function isMobileCalendar() {
  return window.matchMedia("(max-width: 620px)").matches;
}

function handleCalendarTouchStart(event) {
  if (!isMobileCalendar() || event.touches.length !== 1) {
    return;
  }

  const touch = event.touches[0];
  state.swipe.startX = touch.clientX;
  state.swipe.startY = touch.clientY;
  state.swipe.currentX = touch.clientX;
  state.swipe.active = true;
}

function handleCalendarTouchMove(event) {
  if (!state.swipe.active || !isMobileCalendar() || event.touches.length !== 1) {
    return;
  }

  const touch = event.touches[0];
  const deltaX = touch.clientX - state.swipe.startX;
  const deltaY = touch.clientY - state.swipe.startY;

  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
    event.preventDefault();
    state.swipe.currentX = touch.clientX;
    const dragOffset = Math.max(-42, Math.min(42, deltaX * 0.22));
    els.calendarGrid.style.transform = `translateX(${dragOffset}px)`;
    els.calendarGrid.style.opacity = String(1 - Math.min(Math.abs(deltaX) / 650, 0.22));
  }
}

function handleCalendarTouchEnd(event) {
  if (!state.swipe.active) {
    return;
  }

  const touch = event.changedTouches && event.changedTouches[0];
  const endX = touch ? touch.clientX : state.swipe.currentX;
  const endY = touch ? touch.clientY : state.swipe.startY;
  const deltaX = endX - state.swipe.startX;
  const deltaY = endY - state.swipe.startY;
  state.swipe.active = false;
  resetCalendarSwipeStyles();

  if (Math.abs(deltaX) < 58 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
    return;
  }

  state.swipe.didSwipe = true;
  moveMonth(deltaX < 0 ? 1 : -1);
  window.setTimeout(() => {
    state.swipe.didSwipe = false;
  }, 260);
}

function handleCalendarTouchCancel() {
  state.swipe.active = false;
  resetCalendarSwipeStyles();
}

function resetCalendarSwipeStyles() {
  els.calendarGrid.style.transform = "";
  els.calendarGrid.style.opacity = "";
}

function goToToday() {
  const today = new Date();
  const todayKey = formatDate(today);
  state.currentYear = today.getFullYear();
  state.currentMonth = today.getMonth();
  state.selectedDate = todayKey;
  clampCurrentMonth();
  renderCalendar();
}

function openDate(dateKey) {
  const parts = parseDateParts(dateKey);
  state.currentYear = parts.year;
  state.currentMonth = parts.month - 1;
  state.selectedDate = dateKey;
  clampCurrentMonth();
  renderCalendar();

  const event = state.events.find((item) => item.event_date === dateKey);

  if (event) {
    showEventDetails(event);
  } else if (!state.user) {
    showPublicReservationPrompt(dateKey);
  } else {
    showEventForm({
      event_date: dateKey,
      event_name: "",
      start_time: "",
      end_time: "",
      location: "",
      contact_person: "",
      phone: "",
      description: "",
      flyer_path: ""
    });
  }
}

function showPublicReservationPrompt(dateKey) {
  state.modalEvent = null;
  state.modalMode = "public";
  els.eventForm.hidden = true;
  els.eventDetails.hidden = false;
  els.eventMessage.textContent = "";
  els.modalTitle.textContent = "Rezervacija datuma";
  els.modalDateLabel.textContent = formatDisplayDate(dateKey);
  els.eventDetails.innerHTML = `
    <div class="description-box public-lock-message">
      Morate biti prijavljeni da biste rezervisali datum.
    </div>
    <div class="modal-actions">
      <button class="primary-button" type="button" data-action="login">Prijavi se</button>
      <button class="ghost-button" type="button" data-action="register">Registruj se</button>
      <button class="ghost-button" type="button" data-action="close">Zatvori</button>
    </div>
  `;

  els.eventDetails.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handlePublicPromptAction(button.dataset.action));
  });

  els.eventModal.hidden = false;
}

async function handlePublicPromptAction(action) {
  if (action === "login") {
    closeModal();
    await navigateTo("/login");
    return;
  }

  if (action === "register") {
    closeModal();
    await navigateTo("/register");
    return;
  }

  closeModal();
}

function showEventDetails(event) {
  state.modalEvent = event;
  state.modalMode = "view";
  els.eventForm.hidden = true;
  els.eventDetails.hidden = false;
  els.modalTitle.textContent = event.event_name;
  els.modalDateLabel.textContent = formatDisplayDate(event.event_date);
  els.eventMessage.textContent = "";

  const imagePath = event.logo_path || event.flyer_path;
  const canManage = state.user && (state.user.role === "admin" || event.user_id === state.user.id);
  const heroMedia =
    imagePath && imagePath === event.flyer_path
      ? `<button class="media-button" type="button" data-action="flyer" aria-label="Otvori flajer">
           <img src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(event.event_name)}">
         </button>`
      : imagePath
        ? `<img src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(event.event_name)}">`
        : `<div class="brand-mark"><span>RK</span></div>`;

  els.eventDetails.innerHTML = `
    <div class="detail-hero">
      ${heroMedia}
      <div>
        <p class="eyebrow">${escapeHtml(event.organization_name)}</p>
        <h3>${escapeHtml(event.event_name)}</h3>
      </div>
    </div>
    <div class="detail-grid">
      ${detailItem("Datum", formatDisplayDate(event.event_date))}
      ${detailItem("Vreme", `${event.start_time} - ${event.end_time}`)}
      ${detailItem("Lokacija", event.location)}
      ${detailItem("Kontakt osoba", event.contact_person || "Nije uneto")}
      ${detailItem("Telefon", event.phone || "Nije uneto")}
      ${detailItem("Organizacija", event.organization_name)}
    </div>
    ${
      event.description
        ? `<div class="description-box">${escapeHtml(event.description)}</div>`
        : ""
    }
    ${
      event.flyer_path && imagePath !== event.flyer_path
        ? `<button class="flyer-preview" type="button" data-action="flyer">
             <img src="${escapeAttribute(event.flyer_path)}" alt="${escapeAttribute(event.event_name)}">
             <span>Otvori flajer preko celog ekrana</span>
           </button>`
        : ""
    }
    <div class="modal-actions">
      ${
        canManage
          ? `<button class="primary-button" type="button" data-action="edit">Izmeni</button>
             <button class="danger-button" type="button" data-action="delete">Obriši</button>`
          : ""
      }
      <button class="ghost-button" type="button" data-action="close">Zatvori</button>
    </div>
  `;

  els.eventDetails.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleModalAction(button.dataset.action, event));
  });

  els.eventModal.hidden = false;
}

function detailItem(label, value) {
  return `
    <div class="detail-item">
      <span>${escapeHtml(label)}</span>
      <p>${escapeHtml(value)}</p>
    </div>
  `;
}

function showEventForm(event) {
  state.modalEvent = event.id ? event : null;
  state.modalMode = event.id ? "edit" : "create";
  els.eventDetails.hidden = true;
  els.eventForm.hidden = false;
  els.eventForm.reset();
  els.eventMessage.textContent = "";
  els.modalTitle.textContent = event.id ? "Izmeni rezervaciju" : "Rezerviši datum";
  els.modalDateLabel.textContent = formatDisplayDate(event.event_date);

  const fields = els.eventForm.elements;
  fields.id.value = event.id || "";
  fields.event_date.value = event.event_date || "";
  fields.event_date.min = state.bounds.min;
  fields.event_date.max = state.bounds.max;
  fields.event_name.value = event.event_name || "";
  fields.start_time.value = event.start_time || "";
  fields.end_time.value = event.end_time || "";
  fields.location.value = event.location || "";
  fields.contact_person.value = event.contact_person || "";
  fields.phone.value = event.phone || "";
  fields.description.value = event.description || "";
  els.removeFlyerWrap.hidden = !event.flyer_path;

  els.eventModal.hidden = false;
  fields.event_name.focus();
}

async function handleModalAction(action, event) {
  if (action === "close") {
    closeModal();
    return;
  }

  if (action === "edit") {
    showEventForm(event);
    return;
  }

  if (action === "flyer") {
    openFlyerLightbox(event.flyer_path, event.event_name);
    return;
  }

  if (action === "delete") {
    await deleteEvent(event.id);
  }
}

async function handleEventSubmit(event) {
  event.preventDefault();
  setMessage(els.eventMessage, "");
  if (!state.user) {
    setMessage(els.eventMessage, "Morate biti prijavljeni da biste rezervisali datum.", "error");
    return;
  }

  const formData = new FormData(els.eventForm);
  const id = formData.get("id");
  if (!formData.get("remove_flyer")) {
    formData.set("remove_flyer", "false");
  }

  try {
    const path = id ? `/api/events/${id}` : "/api/events";
    const method = id ? "PUT" : "POST";
    const data = await api(path, { method, body: formData });
    closeModal();
    showToast(data.message || "Sačuvano.");
    if (state.user && state.user.role === "admin") {
      await loadAdminData();
    } else {
      await loadEvents();
    }
  } catch (err) {
    setMessage(els.eventMessage, err.message, "error");
  }
}

async function deleteEvent(id) {
  if (!state.user) {
    showToast("Morate biti prijavljeni da biste menjali rezervacije.");
    return;
  }

  if (!window.confirm("Da li ste sigurni da želite da obrišete ovu rezervaciju?")) {
    return;
  }

  try {
    const data = await api(`/api/events/${id}`, { method: "DELETE" });
    closeModal();
    showToast(data.message || "Obrisano.");
    if (state.user && state.user.role === "admin") {
      await loadAdminData();
    } else {
      await loadEvents();
    }
  } catch (err) {
    showToast(err.message);
  }
}

function closeModal() {
  els.eventModal.hidden = true;
  els.eventDetails.innerHTML = "";
  els.eventForm.reset();
  state.modalEvent = null;
  state.modalMode = "view";
}

function openFlyerLightbox(src, alt) {
  if (!src) {
    return;
  }

  els.lightboxImage.src = src;
  els.lightboxImage.alt = alt || "Flajer događaja";
  els.flyerLightbox.hidden = false;
}

function closeFlyerLightbox() {
  els.flyerLightbox.hidden = true;
  els.lightboxImage.src = "";
}

async function openAdminUserDetails(userId) {
  try {
    const data = await api(`/api/admin/users/${userId}`);
    state.selectedAdminUser = data.user;
    renderAdminUserDetails(data.user);
    els.userModal.hidden = false;
  } catch (err) {
    showToast(err.message);
  }
}

function renderAdminUserDetails(user) {
  els.userModalTitle.textContent = user.organization_name;
  els.passwordResetForm.reset();
  els.passwordResetForm.elements.user_id.value = user.id;
  setMessage(els.passwordResetMessage, "");

  els.adminUserDetails.innerHTML = `
    <div class="detail-hero">
      ${
        user.logo_path
          ? `<img src="${escapeAttribute(user.logo_path)}" alt="${escapeAttribute(user.organization_name)}">`
          : `<div class="brand-mark"><span>RK</span></div>`
      }
      <div>
        <p class="eyebrow">${escapeHtml(statusLabel(user.status))}</p>
        <h3>${escapeHtml(user.organization_name)}</h3>
      </div>
    </div>
    <div class="detail-grid">
      ${detailItem("Email", user.email)}
      ${detailItem("Uloga", user.role === "admin" ? "Admin" : "Organizacija")}
      ${detailItem("Status", statusLabel(user.status))}
      ${detailItem("Rezervacije", String(user.event_count || 0))}
    </div>
    <div class="description-box">Lozinka nije prikazana jer se čuva kao bezbedan hash. Ako organizacija zaboravi lozinku, unesite novu privremenu lozinku i pošaljite je organizaciji ručno.</div>
  `;

  els.passwordResetForm.hidden = user.role !== "user";
}

function closeUserModal() {
  els.userModal.hidden = true;
  els.adminUserDetails.innerHTML = "";
  els.passwordResetForm.reset();
  setMessage(els.passwordResetMessage, "");
  state.selectedAdminUser = null;
}

async function handlePasswordReset(event) {
  event.preventDefault();
  setMessage(els.passwordResetMessage, "");
  const formData = new FormData(els.passwordResetForm);
  const userId = formData.get("user_id");
  const password = String(formData.get("password") || "");

  try {
    const data = await api(`/api/admin/users/${userId}/password`, {
      method: "PATCH",
      body: JSON.stringify({ password })
    });
    els.passwordResetForm.reset();
    els.passwordResetForm.elements.user_id.value = userId;
    setMessage(els.passwordResetMessage, data.message || "Lozinka je uspešno resetovana.", "success");
    showToast(data.message || "Lozinka je uspešno resetovana.");
  } catch (err) {
    setMessage(els.passwordResetMessage, err.message, "error");
  }
}

function renderAdmin() {
  const pending = state.users.filter((user) => user.status === "pending").length;
  els.pendingCount.textContent = `${pending} na čekanju`;
  els.eventCount.textContent = `${state.events.length} događaja`;

  els.usersTable.innerHTML = state.users.map(renderUserRow).join("");
  els.eventsTable.innerHTML = state.events.map(renderAdminEventRow).join("");

  els.usersTable.querySelectorAll("[data-user-action]").forEach((button) => {
    button.addEventListener("click", () =>
      handleUserAction(button.dataset.userAction, Number(button.dataset.userId))
    );
  });

  els.eventsTable.querySelectorAll("[data-event-action]").forEach((button) => {
    button.addEventListener("click", () =>
      handleAdminEventAction(button.dataset.eventAction, Number(button.dataset.eventId))
    );
  });
}

function renderUserRow(user) {
  return `
    <tr>
      <td>
        <div class="org-cell">
          ${user.logo_path ? `<img src="${escapeAttribute(user.logo_path)}" alt="">` : ""}
          <span>${escapeHtml(user.organization_name)}</span>
        </div>
      </td>
      <td>${escapeHtml(user.email)}</td>
      <td>${statusPill(user.status)}</td>
      <td>${Number(user.event_count || 0)}</td>
      <td>
        <div class="actions">
          ${
            user.role !== "admin"
              ? `<button class="small-button" type="button" data-user-action="details" data-user-id="${user.id}">Detalji</button>`
              : ""
          }
          ${
            user.status !== "approved"
              ? `<button class="small-button" type="button" data-user-action="approved" data-user-id="${user.id}">Odobri</button>`
              : ""
          }
          ${
            user.status !== "rejected" && user.role !== "admin"
              ? `<button class="small-button" type="button" data-user-action="rejected" data-user-id="${user.id}">Odbij</button>`
              : ""
          }
          ${
            user.role !== "admin"
              ? `<button class="danger-button" type="button" data-user-action="delete" data-user-id="${user.id}">Obriši</button>`
              : ""
          }
        </div>
      </td>
    </tr>
  `;
}

function renderAdminEventRow(event) {
  return `
    <tr>
      <td>${formatDisplayDate(event.event_date)}</td>
      <td>${escapeHtml(event.event_name)}</td>
      <td>${escapeHtml(event.organization_name)}</td>
      <td>${escapeHtml(`${event.start_time} - ${event.end_time}`)}</td>
      <td>${escapeHtml(event.location)}</td>
      <td>
        <div class="actions">
          <button class="small-button" type="button" data-event-action="view" data-event-id="${event.id}">Prikaži</button>
          <button class="small-button" type="button" data-event-action="edit" data-event-id="${event.id}">Izmeni</button>
          <button class="danger-button" type="button" data-event-action="delete" data-event-id="${event.id}">Obriši</button>
        </div>
      </td>
    </tr>
  `;
}

function statusPill(status) {
  const labels = {
    pending: "Na čekanju",
    approved: "Odobren",
    rejected: "Odbijen"
  };

  return `<span class="status-pill ${status}">${labels[status] || status}</span>`;
}

function statusLabel(status) {
  const labels = {
    pending: "Na čekanju",
    approved: "Odobren",
    rejected: "Odbijen"
  };

  return labels[status] || status;
}

async function handleUserAction(action, userId) {
  try {
    if (action === "details") {
      await openAdminUserDetails(userId);
      return;
    }

    if (action === "delete") {
      if (!window.confirm("Da li želite da obrišete ovaj nalog i njegove rezervacije?")) {
        return;
      }

      const data = await api(`/api/admin/users/${userId}`, { method: "DELETE" });
      showToast(data.message || "Nalog je obrisan.");
    } else {
      const data = await api(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: action })
      });
      showToast(data.message || "Status je ažuriran.");
    }

    await loadAdminData();
  } catch (err) {
    showToast(err.message);
  }
}

async function handleAdminEventAction(action, eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) {
    return;
  }

  if (action === "view") {
    showEventDetails(event);
  } else if (action === "edit") {
    showEventForm(event);
  } else if (action === "delete") {
    await deleteEvent(eventId);
  }
}

function setMessage(element, text, type) {
  element.textContent = text || "";
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 3600);
}

function parseDateParts(value) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function dateFromKey(value) {
  const { year, month, day } = parseDateParts(value);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  const { year, month, day } = parseDateParts(value);
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
