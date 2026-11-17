/* KEPIL: shared state, JSON listings, jQuery events and browser-local drafts. */
"use strict";
const storage = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem("kepil-" + key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem("kepil-" + key, JSON.stringify(value));
      return true;
    } catch {
      toast("Не удалось сохранить: хранилище браузера недоступно.");
      return false;
    }
  },
};
let saved = storage.get("saved", []);
if (!Array.isArray(saved)) saved = [];
let apartments = [];
let toastTimer;
const money = (n) => new Intl.NumberFormat("ru-RU").format(n);
const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function toast(message) {
  $("#toast").text(message).addClass("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").removeClass("visible"), 3000);
}
function syncSaved() {
  $("#saved-count").text(saved.length);
  $(".save-btn").each(function () {
    const active = saved.includes(Number(this.dataset.id));
    $(this)
      .toggleClass("saved", active)
      .attr("aria-pressed", String(active))
      .attr(
        "aria-label",
        active ? "Убрать из избранного" : "Добавить в избранное",
      )
      .text(active ? "♥" : "♡");
  });
}
function card(a, columns = "col-md-6 col-lg-4") {
  return `<div class="${columns}"><article class="property-card"><div class="card-image"><a href="apartment.html?id=${a.id}"><img src="assets/${a.image}" alt="Интерьер: ${escapeHTML(a.title)}" loading="lazy" width="720" height="480"></a><button class="save-btn" data-id="${a.id}" aria-label="Добавить в избранное" aria-pressed="false">♡</button><span class="card-tag">${a.tag}</span></div><div class="card-info"><p class="price">${money(a.price)} ₸ <small>/ месяц</small></p><h3><a href="apartment.html?id=${a.id}">${a.title}</a></h3><p class="address">${a.city} · ${a.address}</p><div class="card-meta"><span>${a.rooms}-комн.</span><span>${a.area} м²</span><span>${a.floor} этаж</span></div></div></article></div>`;
}
function empty(title, body) {
  return `<div class="empty"><h2>${title}</h2><p>${body}</p><a href="catalog.html" class="btn btn-primary">Посмотреть квартиры ↗</a></div>`;
}
function renderFavorites() {
  if (!$("#favorites-grid").length) return;
  const list = apartments.filter((a) => saved.includes(a.id));
  $("#favorites-grid").html(
    list.length
      ? list.map((a) => card(a)).join("")
      : empty(
          "Пока ни одной. Но это ненадолго.",
          "Нажмите на сердечко у понравившейся квартиры — она появится здесь.",
        ),
  );
  syncSaved();
}
function renderCatalog() {
  if (!$("#filters").length) return;
  const f = new FormData(document.querySelector("#filters")),
    q = String(f.get("q") || "")
      .trim()
      .toLowerCase();
  let list = apartments.filter(
    (a) =>
      (!f.get("city") || a.city === f.get("city")) &&
      (!f.get("rooms") || a.rooms === Number(f.get("rooms"))) &&
      (!f.get("max") || a.price <= Number(f.get("max"))) &&
      (!f.get("pets") || a.pets) &&
      (!q || `${a.title} ${a.city} ${a.address}`.toLowerCase().includes(q)),
  );
  const order = $("#sort").val();
  if (order === "price-asc") list.sort((a, b) => a.price - b.price);
  if (order === "price-desc") list.sort((a, b) => b.price - a.price);
  if (order === "area") list.sort((a, b) => b.area - a.area);
  $("#result-count").text(`Найдено вариантов: ${list.length}`);
  $("#catalog-grid").html(
    list.length
      ? list.map((a) => card(a, "col-md-6")).join("")
      : empty(
          "По этим условиям пока ничего",
          "Измените город, бюджет или сбросьте фильтры.",
        ),
  );
  syncSaved();
  const params = new URLSearchParams();
  for (const [k, v] of f) if (v) params.set(k, v);
  history.replaceState(
    null,
    "",
    location.pathname + (params.size ? "?" + params : ""),
  );
}
function renderDetail() {
  if (!$("#property-detail").length) return;
  const id = Number(new URLSearchParams(location.search).get("id")),
    a = apartments.find((a) => a.id === id);
  if (!a) {
    $("#property-detail").html(
      empty(
        "Квартира не найдена",
        "Возможно, ссылка устарела. Выберите другой вариант в каталоге.",
      ),
    );
    return;
  }
  document.title = `${a.title} — KEPIL`;
  $("#property-detail").html(
    `<div class="detail-heading"><div><h1>${a.title}</h1><p class="muted">${a.city} · ${a.address}</p></div><span class="demo-badge">Демонстрационное объявление</span></div><img class="detail-image" src="assets/${a.image}" alt="Интерьер квартиры: ${a.title}"><div class="detail-columns"><section><div class="detail-meta"><div><strong>${a.rooms}</strong><small>комнаты</small></div><div><strong>${a.area} м²</strong><small>общая площадь</small></div><div><strong>${a.floor}</strong><small>этаж</small></div></div><h2>О пространстве</h2><p>${a.description}</p><h2>Всё необходимое</h2><ul class="amenities">${a.amenities.map((x) => `<li>${x}</li>`).join("")}</ul><h2>Условия аренды</h2><p>Длительная аренда · Депозит: ${money(a.price)} ₸ · ${a.pets ? "Можно с питомцами по согласованию" : "Без питомцев"} · Без курения.</p><p class="muted">Все условия и адреса приведены для демонстрации. Фотография иллюстративная.</p></section><aside class="booking-card"><p class="eyebrow">ВАШ НОВЫЙ ДОМ?</p><p class="price">${money(a.price)} ₸ <small>/ месяц</small></p><p class="muted">Коммунальные услуги оплачиваются отдельно</p><button id="open-contact" class="btn btn-primary">Запланировать просмотр ↗</button><button id="detail-save" class="btn btn-outline">${saved.includes(id) ? "Убрать из избранного" : "Сохранить в избранное"}</button><small>Учебная версия: форма создаёт локальный запрос, а не реальную бронь.</small></aside></div>`,
  );
  $("#detail-save").on("click", () => {
    toggleSave(id);
    $("#detail-save").text(
      saved.includes(id) ? "Убрать из избранного" : "Сохранить в избранное",
    );
  });
  $("#open-contact").on("click", () =>
    document.querySelector("#contact-modal").showModal(),
  );
  const date = document.querySelector("[name=date]");
  const today = new Date();
  date.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const request = storage.get("request-" + id, null);
  if (request) {
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = `Сохранён запрос на ${request.date}. Можно изменить его, заполнив форму снова.`;
    document.querySelector(".booking-card").append(note);
  }
  $("#contact-form")
    .off("submit")
    .on("submit", function (e) {
      e.preventDefault();
      if (!this.reportValidity()) return;
      const data = Object.fromEntries(new FormData(this));
      if (data.date < date.min) {
        toast("Выберите сегодняшнюю или будущую дату.");
        return;
      }
      if (storage.set("request-" + id, data)) {
        document.querySelector("#contact-modal").close();
        toast("Запрос сохранён в браузере. Владельцу не отправлен.");
        renderDetail();
      }
    });
}
function toggleSave(id) {
  const next = saved.includes(id)
    ? saved.filter((x) => x !== id)
    : [...saved, id];
  if (storage.set("saved", next)) {
    saved = next;
    syncSaved();
    toast(
      saved.includes(id)
        ? "Квартира добавлена в избранное"
        : "Квартира убрана из избранного",
    );
    renderFavorites();
  }
}
const guides = {
  deposit: [
    [
      "Соберите договорённости",
      "Найдите условия о депозите, подтверждение оплаты и фотографии состояния квартиры.",
    ],
    [
      "Уточните расхождения",
      "Попросите перечислить спорные суммы и основания удержаний. Сопоставьте позиции сторон.",
    ],
    [
      "Предложите следующий шаг",
      "Обсудите совместный осмотр, сумму и удобную дату возврата. Зафиксируйте результат письменно.",
    ],
  ],
  repair: [
    [
      "Опишите неисправность",
      "Укажите, что не работает, когда это обнаружено. При необходимости сделайте фото.",
    ],
    [
      "Согласуйте действия",
      "Обсудите мастера, время доступа и предполагаемые расходы до начала работ.",
    ],
    [
      "Зафиксируйте решение",
      "Запишите, кто организует ремонт, в какие сроки и как согласуется оплата.",
    ],
  ],
  payment: [
    [
      "Сверьте расчёты",
      "Сопоставьте период оплаты, согласованную сумму и подтверждения переводов.",
    ],
    [
      "Объясните ситуацию",
      "Опишите расхождение или причину задержки без обвинений.",
    ],
    [
      "Предложите график",
      "Обсудите реалистичные даты и суммы. Сохраните письменное подтверждение договорённости.",
    ],
  ],
  leave: [
    [
      "Сверьте условия",
      "Посмотрите, что согласовано о сроках уведомления и передаче квартиры.",
    ],
    [
      "Подготовьте осмотр",
      "Предложите дату, составьте список вещей, зафиксируйте показания счётчиков.",
    ],
    [
      "Обсудите расчёты",
      "Согласуйте передачу ключей, оставшиеся платежи и депозит. Запишите результат.",
    ],
  ],
  other: [
    [
      "Отделите факты от эмоций",
      "Кратко опишите конкретную ситуацию, даты и прежние договорённости.",
    ],
    [
      "Сформулируйте ожидания",
      "Укажите, что именно вы хотели бы изменить и почему.",
    ],
    [
      "Оставьте место для диалога",
      "Предложите удобный способ обсудить вопрос и выслушайте другую сторону.",
    ],
  ],
};
function renderGuidance() {
  const issue = $("#help-form [name=issue]").val();
  $("#guidance").html(
    guides[issue]
      .map(
        ([title, body], i) =>
          `<article class="guide-step"><span>${i + 1}</span><div><h3>${title}</h3><p>${body}</p></div></article>`,
      )
      .join(""),
  );
}
$(function () {
  const current = location.pathname.split("/").pop() || "index.html";
  $(`nav a[href="${current}"]`).addClass("active").attr("aria-current", "page");
  syncSaved();
  $(".theme-toggle").on("click", () => {
    const theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("kepil-theme", theme);
    } catch {
      toast("Тема изменена, но не сохранена.");
    }
  });
  $(document).on("click", ".save-btn", function () {
    toggleSave(Number(this.dataset.id));
  });
  $(".dialog-close").on("click", () =>
    document.querySelector("#contact-modal").close(),
  );
  $("#contact-modal").on("click", function (e) {
    if (e.target === this) {
      const r = this.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        this.close();
    }
  });
  if ($("#filters").length) {
    const params = new URLSearchParams(location.search);
    for (const key of ["q", "city", "rooms", "max"])
      if (params.has(key)) $(`#filters [name=${key}]`).val(params.get(key));
    $("#filters [name=pets]").prop("checked", params.has("pets"));
    $("#filters")
      .on("submit", (e) => e.preventDefault())
      .on("input change", renderCatalog);
    $("#sort").on("change", renderCatalog);
    $("#reset-filters").on("click", () => {
      document.querySelector("#filters").reset();
      $("#sort").val("default");
      renderCatalog();
    });
  }
  if ($("#help-form").length) {
    const issue = new URLSearchParams(location.search).get("issue");
    if (guides[issue]) $("#help-form [name=issue]").val(issue);
    renderGuidance();
    $("#help-form [name=issue]").on("change", renderGuidance);
    const previous = storage.get("draft", null);
    if (previous) {
      $("#draft-text").val(previous);
      $("#draft-panel").prop("hidden", false);
    }
    $("#help-form").on("submit", function (e) {
      e.preventDefault();
      if (!this.reportValidity()) return;
      const f = Object.fromEntries(new FormData(this));
      if (
        f.name.trim().length < 2 ||
        f.details.trim().length < 15 ||
        f.solution.trim().length < 10
      ) {
        toast("Заполните поля содержательным текстом.");
        return;
      }
      const issueText = this.elements.issue.selectedOptions[0].textContent;
      const text = `Здравствуйте!\n\nМеня зовут ${f.name.trim()}, я ${f.role === "owner" ? "арендодатель" : "арендатор"}. Хочу спокойно обсудить вопрос: ${issueText.toLowerCase()}.\n\nСитуация:\n${f.details.trim()}\n\nПредлагаю следующее решение:\n${f.solution.trim()}\n\nПожалуйста, поделитесь вашей позицией и удобным временем для обсуждения. Давайте согласуем дальнейшие действия и зафиксируем договорённости письменно.\n\nСпасибо,\n${f.name.trim()}`;
      $("#draft-text").val(text);
      storage.set("draft", text);
      $("#draft-panel")
        .prop("hidden", false)[0]
        .scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "center",
        });
      toast("Обращение готово. Проверьте текст перед отправкой.");
    });
    $("#draft-text").on("input", function () {
      storage.set("draft", this.value);
    });
    $("#copy-draft").on("click", async () => {
      try {
        await navigator.clipboard.writeText($("#draft-text").val());
        toast("Текст скопирован");
      } catch {
        $("#draft-text")[0].select();
        toast("Выделили текст. Нажмите Ctrl+C или ⌘C.");
      }
    });
    $("#download-draft").on("click", () => {
      const url = URL.createObjectURL(
          new Blob([$("#draft-text").val()], {
            type: "text/plain;charset=utf-8",
          }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "KEPIL-обращение.txt";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    $("#clear-draft").on("click", () => {
      if (storage.set("draft", null)) {
        $("#draft-panel").prop("hidden", true);
        $("#draft-text").val("");
        document.querySelector("#help-form").reset();
        renderGuidance();
        toast("Черновик удалён");
      }
    });
  }
  if ($("#featured,#catalog-grid,#favorites-grid,#property-detail").length) {
    $.getJSON("data/apartments.json")
      .done((data) => {
        apartments = data;
        $("#featured").html(
          data
            .slice(0, 3)
            .map((a) => card(a))
            .join(""),
        );
        renderCatalog();
        renderFavorites();
        renderDetail();
        syncSaved();
      })
      .fail(() => {
        $("#featured,#catalog-grid,#favorites-grid,#property-detail").html(
          '<div class="empty"><h2>Не удалось загрузить квартиры</h2><p>Проверьте соединение и обновите страницу. Локально сайт нужно запускать через HTTP-сервер.</p><button class="btn btn-primary" onclick="location.reload()">Повторить</button></div>',
        );
      });
  }
});
