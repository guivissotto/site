(function () {
  var form = document.getElementById("briefing");
  if (!form) return;
  var KEY = "vs-draft-" + form.getAttribute("name");
  var MAX_FILES = 6 * 1024 * 1024;

  /* ---------- "3 mais fortes" a partir dos atributos ---------- */
  var attrBox = document.getElementById("atributos");
  var fortesBox = document.getElementById("fortes");
  var fortesHint = document.getElementById("fortes-hint");
  var fortesCount = document.getElementById("fortes-count");
  var fortesSel = [];
  function renderFortes() {
    if (!attrBox) return;
    var chosen = [].slice.call(attrBox.querySelectorAll("input:checked")).map(function (i) { return i.value; });
    fortesSel = fortesSel.filter(function (v) { return chosen.indexOf(v) >= 0; });
    fortesBox.innerHTML = "";
    chosen.forEach(function (v) {
      var l = document.createElement("label"); l.className = "chip";
      var i = document.createElement("input"); i.type = "checkbox"; i.value = v; i.checked = fortesSel.indexOf(v) >= 0;
      var s = document.createElement("span"); s.textContent = v;
      i.addEventListener("change", function () {
        if (i.checked) fortesSel.push(v); else fortesSel = fortesSel.filter(function (x) { return x !== v; });
        renderFortes(); save();
      });
      l.appendChild(i); l.appendChild(s); fortesBox.appendChild(l);
    });
    var full = fortesSel.length >= 3;
    [].forEach.call(fortesBox.querySelectorAll("input"), function (i) { i.disabled = full && !i.checked; });
    fortesHint.textContent = chosen.length ? "Toque em até 3." : "Escolha primeiro as palavras acima.";
    fortesCount.textContent = chosen.length ? fortesSel.length + " de 3" : "";
  }
  if (attrBox) attrBox.addEventListener("change", function () { renderFortes(); });

  /* ---------- arquivos ---------- */
  function filesTotal() {
    var t = 0;
    [].forEach.call(form.querySelectorAll('.file input[type=file]'), function (i) { if (i.files[0]) t += i.files[0].size; });
    return t;
  }
  [].forEach.call(form.querySelectorAll(".file input[type=file]"), function (inp) {
    inp.addEventListener("change", function () {
      var box = inp.closest(".file"), f = inp.files[0];
      box.classList.toggle("has", !!f);
      box.querySelector(".name").textContent = f ? f.name + " · " + (f.size / 1048576).toFixed(1) + " MB" : "Nenhum arquivo";
      inp.closest(".q").classList.toggle("invalid", filesTotal() > MAX_FILES);
    });
  });

  /* ---------- rascunho ---------- */
  var savedEl = document.getElementById("saved"), t;
  function collect() {
    var data = {};
    [].forEach.call(form.querySelectorAll("input[name], textarea[name]"), function (el) {
      if (el.type === "hidden" || el.type === "file" || el.name === "empresa_site") return;
      data[el.name] = el.value;
    });
    [].forEach.call(form.querySelectorAll("[data-collect]"), function (q) {
      if (q.id === "q-fortes") return;
      data["_" + q.dataset.collect] = [].slice.call(q.querySelectorAll(".chips input:checked")).map(function (i) { return i.value; });
    });
    data._fortes = fortesSel.slice();
    return data;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(collect())); } catch (e) {}
    clearTimeout(t); savedEl.classList.add("show"); t = setTimeout(function () { savedEl.classList.remove("show"); }, 1200);
    progress();
  }
  function restore() {
    var data; try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (!data) return;
    Object.keys(data).forEach(function (k) {
      if (k[0] === "_") return;
      var el = form.querySelector('[name="' + k + '"]'); if (el) el.value = data[k];
    });
    [].forEach.call(form.querySelectorAll("[data-collect]"), function (q) {
      var vals = data["_" + q.dataset.collect] || [];
      [].forEach.call(q.querySelectorAll(".chips input"), function (i) { i.checked = vals.indexOf(i.value) >= 0; });
    });
    fortesSel = data._fortes || [];
  }
  var deb;
  form.addEventListener("input", function () { clearTimeout(deb); deb = setTimeout(save, 500); });
  form.addEventListener("change", function (e) { if (e.target.type === "checkbox") save(); });

  /* ---------- progresso ---------- */
  var bar = document.getElementById("progress");
  function progress() {
    var qs = form.querySelectorAll(".q"), done = 0;
    [].forEach.call(qs, function (q) {
      var filled = [].some.call(q.querySelectorAll("input[type=text],input[type=email],input[type=tel],textarea"), function (i) { return i.value.trim(); })
        || q.querySelector(".chips input:checked") || [].some.call(q.querySelectorAll("input[type=file]"), function (i) { return i.files.length; });
      if (filled) done++;
    });
    bar.style.width = (qs.length ? done / qs.length * 100 : 0) + "%";
  }

  /* ---------- validação ---------- */
  function validate() {
    var first = null;
    [].forEach.call(form.querySelectorAll(".q[data-required]"), function (q) {
      var i = q.querySelector("input,textarea"), v = i.value.trim();
      var ok = !!v && (q.dataset.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
      q.classList.toggle("invalid", !ok);
      if (!ok && !first) first = q;
    });
    var fe = document.getElementById("files-err");
    if (fe && filesTotal() > MAX_FILES) { var fq = fe.closest(".q"); fq.classList.add("invalid"); first = first || fq; }
    if (first) { first.scrollIntoView({ behavior: "smooth", block: "center" }); var f = first.querySelector("input,textarea"); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 400); }
    return !first;
  }
  form.addEventListener("input", function (e) { var q = e.target.closest(".q.invalid"); if (q) q.classList.remove("invalid"); });

  /* ---------- PDF ---------- */
  function questionText(q) {
    var t = q.querySelector(".title"); if (!t) return "";
    return t.textContent.replace(/\*/g, "").trim();
  }
  function answerText(q) {
    if (q.id === "q-fortes") return fortesSel.join(", ");
    var parts = [];
    var chips = [].slice.call(q.querySelectorAll(".chips input:checked")).map(function (i) { return i.value; });
    if (chips.length) parts.push(chips.join(", "));
    [].forEach.call(q.querySelectorAll("input[type=text],input[type=email],input[type=tel],textarea"), function (i) { if (i.value.trim()) parts.push(i.value.trim()); });
    var files = [].slice.call(q.querySelectorAll("input[type=file]")).filter(function (i) { return i.files[0]; }).map(function (i) { return i.files[0].name; });
    if (files.length) parts.push("Arquivos enviados: " + files.join(", "));
    return parts.join("\n");
  }
  function makePDF() {
    var marca = (form.querySelector('[name="nome_da_marca"]') || {}).value || "Briefing";
    var nome = (form.querySelector('[name="nome"]') || {}).value || "";
    var d = new Date();
    var data = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
    var sections = [].map.call(form.querySelectorAll("section.step"), function (s) {
      var items = [].map.call(s.querySelectorAll(".q"), function (q) {
        return { q: questionText(q), a: answerText(q) };
      });
      return { title: s.dataset.title, items: items };
    });
    var blob = window.buildBriefingPDF({
      label: document.querySelector("header.site .right").textContent,
      title: marca,
      subtitle: "Briefing respondido por " + nome + " em " + data,
      footer: "Vissotto Studio & Co · vissottostudio.com",
      sections: sections
    });
    var slug = marca.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "briefing";
    return { blob: blob, name: "briefing-" + form.getAttribute("name").replace("briefing-", "") + "-" + slug + ".pdf" };
  }

  /* ---------- envio ---------- */
  var btn = document.getElementById("send"), errEl = document.getElementById("form-error");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errEl.hidden = true;
    if (!validate()) return;

    // campos de múltipla escolha viram texto
    [].forEach.call(form.querySelectorAll("[data-collect]"), function (q) {
      var h = form.querySelector('input[type=hidden][name="' + q.dataset.collect + '"]');
      if (!h) return;
      h.value = q.id === "q-fortes" ? fortesSel.join(", ") :
        [].slice.call(q.querySelectorAll(".chips input:checked")).map(function (i) { return i.value; }).join(", ");
    });

    var pdf = makePDF();
    var fd = new FormData(form);
    fd.set("pdf_do_briefing", new File([pdf.blob], pdf.name, { type: "application/pdf" }));
    // remove arquivos vazios
    ["referencia_1", "referencia_2", "referencia_3"].forEach(function (n) { var f = fd.get(n); if (f && !f.size) fd.delete(n); });

    btn.disabled = true; btn.firstElementChild.textContent = "ENVIANDO...";
    fetch("/", { method: "POST", body: fd })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        var a = document.getElementById("download-pdf");
        a.href = URL.createObjectURL(pdf.blob); a.download = pdf.name;
        try { localStorage.removeItem(KEY); } catch (e) {}
        document.body.classList.add("done");
        bar.style.width = "100%";
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(function () {
        errEl.textContent = "Não conseguimos enviar agora. Suas respostas estão salvas: verifique sua conexão e tente de novo. Se persistir, fale com a gente em hello@vissottostudio.com.";
        errEl.hidden = false;
      })
      .finally(function () { btn.disabled = false; btn.firstElementChild.textContent = "ENVIAR BRIEFING"; });
  });

  restore(); renderFortes(); progress();
})();
