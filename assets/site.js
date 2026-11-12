(function () {
  "use strict";

  // ===== Cấu hình =====
  // Dán URL Web App của Google Apps Script vào đây để nhận thông tin khách hàng về Google Sheet.
  // Để trống: form sẽ cho khách gửi qua email hoặc Zalo.
  var LEAD_ENDPOINT = "";
  var EMAIL = "phamviethoang.com.vn@gmail.com";
  var ZALO = "https://zalo.me/0967372915";
  var PHONE_TEXT = "096 737 2915";

  // ===== Chuyển ngữ VI / EN =====
  var EN = window.I18N_EN || {};
  var store = {
    get: function () { try { return localStorage.getItem("sa-lang"); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem("sa-lang", v); } catch (e) {} }
  };
  var cache = new WeakMap();
  var current = "vi";

  function remember(el, key, value) {
    var c = cache.get(el) || {};
    if (!(key in c)) c[key] = value;
    cache.set(el, c);
    return c[key];
  }

  function applyLang(lang) {
    current = lang === "en" ? "en" : "vi";
    var en = current === "en";
    document.documentElement.lang = current;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var vi = remember(el, "html", el.innerHTML);
      var k = el.getAttribute("data-i18n");
      el.innerHTML = en && EN[k] != null ? EN[k] : vi;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var vi = remember(el, "ph", el.getAttribute("placeholder") || "");
      var k = el.getAttribute("data-i18n-ph");
      el.setAttribute("placeholder", en && EN[k] != null ? EN[k] : vi);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var vi = remember(el, "aria", el.getAttribute("aria-label") || "");
      var k = el.getAttribute("data-i18n-aria");
      el.setAttribute("aria-label", en && EN[k] != null ? EN[k] : vi);
    });
    var t = remember(document.documentElement, "title", document.title);
    document.title = en && EN.__title ? EN.__title : t;

    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-lang") === current ? "true" : "false");
    });
  }

  function tr(vi, en) { return current === "en" ? en : vi; }

  document.querySelectorAll(".lang button").forEach(function (b) {
    b.addEventListener("click", function () {
      var l = b.getAttribute("data-lang");
      store.set(l);
      applyLang(l);
    });
  });
  if (store.get() === "en") applyLang("en");

  // ===== Menu điện thoại =====
  var menuBtn = document.getElementById("menu-btn");
  var menu = document.getElementById("mobile-menu");
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () {
      var open = menu.hidden;
      menu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) { menu.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
    });
  }

  // ===== Năm hiện tại =====
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text) n.textContent = text;
    return n;
  }

  // ===== Bảng minh họa: duyệt gợi ý =====
  var actions = document.getElementById("suggest-actions");
  var approve = document.getElementById("approve-btn");
  var later = document.getElementById("later-btn");
  if (actions && approve && later) {
    approve.addEventListener("click", function () {
      var ok = el("span", { "class": "approved" });
      ok.innerHTML = '<svg class="ic-svg" aria-hidden="true"><use href="#i-check"/></svg>';
      ok.append(tr("Đã duyệt. Ngân sách được điều chỉnh từ hôm nay.", "Approved. Budget updated from today."));
      actions.replaceChildren(ok);
    });
    later.addEventListener("click", function () {
      actions.replaceChildren(el("span", { "class": "approved muted" }, tr("Đã lưu lại, nhắc bạn vào cuối tuần.", "Saved. We will remind you at the end of the week.")));
    });
  }

  // ===== Bộ lọc blog =====
  var filters = document.querySelectorAll(".filter");
  if (filters.length) {
    filters.forEach(function (f) {
      f.addEventListener("click", function () {
        var cat = f.getAttribute("data-filter");
        filters.forEach(function (x) { x.setAttribute("aria-pressed", x === f ? "true" : "false"); });
        document.querySelectorAll(".posts .post-card").forEach(function (c) {
          c.hidden = !(cat === "all" || c.getAttribute("data-cat") === cat);
        });
      });
    });
  }

  // ===== Form đăng ký tư vấn =====
  var form = document.getElementById("lead-form");
  if (!form) return;
  var select = document.getElementById("lead-service");
  var result = document.getElementById("form-result");
  var submitBtn = document.getElementById("lead-submit");

  function setErr(field, msg) {
    document.getElementById("err-" + field).textContent = msg;
    form.elements[field].setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function summary(d) {
    return "Đăng ký tư vấn từ website Star Agency\n" +
      "Họ tên: " + d.name + "\n" +
      "Số điện thoại: " + d.phone + "\n" +
      "Lĩnh vực: " + (d.business || "-") + "\n" +
      "Cần hỗ trợ: " + d.service + "\n" +
      "Lời nhắn: " + (d.message || "-");
  }

  function showSent(name) {
    result.replaceChildren(
      el("strong", {}, tr("Cảm ơn " + name + "!", "Thank you, " + name + "!")),
      el("p", {}, tr("Star Agency đã nhận thông tin và sẽ gọi lại cho bạn sớm. Cần gấp, bạn gọi ngay " + PHONE_TEXT + ".",
                     "Star Agency has received your details and will call you back soon. For anything urgent, call " + PHONE_TEXT + "."))
    );
    result.hidden = false;
  }

  function showManual(d, failed) {
    var text = summary(d);
    var mail = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Đăng ký tư vấn - " + d.name) + "&body=" + encodeURIComponent(text);
    var row = el("div", { "class": "result-actions" });
    row.append(
      el("a", { "class": "btn btn-primary", href: mail }, tr("Gửi qua email", "Send by email")),
      el("a", { "class": "btn btn-dark", href: ZALO, target: "_blank", rel: "noopener" }, tr("Nhắn Zalo", "Message on Zalo"))
    );
    var copy = el("button", { "class": "btn btn-ghost", type: "button" }, tr("Sao chép nội dung", "Copy details"));
    copy.addEventListener("click", function () {
      var fail = tr("Không sao chép được", "Could not copy");
      if (!navigator.clipboard) { copy.textContent = fail; return; }
      navigator.clipboard.writeText(text).then(function () { copy.textContent = tr("Đã sao chép", "Copied"); }, function () { copy.textContent = fail; });
    });
    row.append(copy);
    result.replaceChildren(
      el("strong", {}, failed ? tr("Chưa gửi được tự động", "Could not send automatically") : tr("Còn một bước nữa", "One more step")),
      el("p", {}, tr("Bấm Gửi qua email hoặc Nhắn Zalo để chuyển thông tin cho Star Agency. Bạn cũng có thể gọi thẳng " + PHONE_TEXT + ".",
                     "Tap Send by email or Message on Zalo to pass your details to Star Agency, or call " + PHONE_TEXT + ".")),
      row
    );
    result.hidden = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      business: form.elements.business.value.trim(),
      service: select.options[select.selectedIndex].getAttribute("data-vi") || select.value,
      message: form.elements.message.value.trim()
    };
    var digits = d.phone.replace(/[\s.\-()]/g, "");
    var nameOk = d.name.length > 0;
    var phoneOk = /^(\+?84|0)\d{9,10}$/.test(digits);
    setErr("name", nameOk ? "" : tr("Vui lòng nhập họ và tên.", "Please enter your name."));
    setErr("phone", phoneOk ? "" : tr("Số điện thoại chưa đúng, ví dụ: 0967 372 915.", "Please check the phone number, e.g. 0967 372 915."));
    if (!nameOk) { form.elements.name.focus(); return; }
    if (!phoneOk) { form.elements.phone.focus(); return; }

    if (!LEAD_ENDPOINT) { showManual(d, false); return; }

    submitBtn.disabled = true;
    submitBtn.setAttribute("aria-busy", "true");
    d.page = location.href;
    fetch(LEAD_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(d)
    }).then(function () {
      showSent(d.name);
      form.reset();
    }).catch(function () {
      showManual(d, true);
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.removeAttribute("aria-busy");
    });
  });
})();
