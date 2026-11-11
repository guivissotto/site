/* Gerador de PDF minimalista (sem bibliotecas), no visual do studio:
   barra preta no topo, títulos em caixa-alta, preto e branco. */
(function () {
  var W = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];

  function clean(s) {
    return String(s || "")
      .replace(/[‘’´]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-").replace(/…/g, "...").replace(/ /g, " ")
      .replace(/\r/g, "")
      .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "?");
  }
  function charW(c, bold) {
    var code = c.charCodeAt(0), w;
    if (code >= 32 && code <= 126) w = W[code - 32];
    else if ("ÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇÑ".indexOf(c) >= 0) w = 700;
    else w = 556;
    return bold ? w * 1.06 : w;
  }
  function textW(s, size, bold) { var t = 0; for (var i = 0; i < s.length; i++) t += charW(s[i], bold); return t * size / 1000; }
  function wrap(s, size, bold, max) {
    var out = [];
    clean(s).split("\n").forEach(function (para) {
      var words = para.split(/ +/), line = "";
      words.forEach(function (w) {
        var test = line ? line + " " + w : w;
        if (textW(test, size, bold) <= max) { line = test; return; }
        if (line) out.push(line);
        while (textW(w, size, bold) > max) { // palavra gigante
          var k = w.length; while (k > 1 && textW(w.slice(0, k), size, bold) > max) k--;
          out.push(w.slice(0, k)); w = w.slice(k);
        }
        line = w;
      });
      out.push(line);
    });
    return out;
  }
  function esc(s) { return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }

  window.buildBriefingPDF = function (doc) {
    var PW = 595.28, PH = 841.89, M = 50, CW = PW - M * 2;
    var pages = [], cur = null, y = 0;

    function newPage() {
      cur = [];
      pages.push(cur);
      // barra preta
      cur.push("0 0 0 rg " + M + " " + (PH - 64) + " " + CW + " 34 re f");
      text(M + 14, PH - 51.5, "VISSOTTO STUDIO & CO", 8, true, "1 1 1");
      var r = clean(doc.label);
      text(M + CW - 14 - textW(r, 8, true), PH - 51.5, r, 8, true, "0.64 0.64 0.64");
      y = PH - 100;
    }
    function text(x, yy, s, size, bold, color) {
      cur.push("BT " + (color || "0 0 0") + " rg /" + (bold ? "F2" : "F1") + " " + size + " Tf " + x.toFixed(2) + " " + yy.toFixed(2) + " Td (" + esc(s) + ") Tj ET");
    }
    function ensure(h) { if (y - h < 60) newPage(); }

    newPage();
    // capa
    y -= 20;
    wrap(doc.title.toUpperCase(), 34, true, CW).forEach(function (l) { ensure(40); text(M, y, l, 34, true); y -= 36; });
    y -= 6;
    wrap(doc.subtitle, 10, false, CW).forEach(function (l) { text(M, y, l, 10, false, "0.5 0.5 0.5"); y -= 14; });
    y -= 22;

    doc.sections.forEach(function (sec, i) {
      ensure(80);
      cur.push("0.85 0.85 0.85 RG 0.75 w " + M + " " + (y + 8) + " m " + (M + CW) + " " + (y + 8) + " l S");
      y -= 14;
      text(M, y, (i < 9 ? "0" : "") + (i + 1), 22, true);
      text(M + 44, y + 1, clean(sec.title).toUpperCase(), 10, true);
      y -= 26;
      sec.items.forEach(function (it) {
        var ql = wrap(it.q, 9.5, true, CW), al = wrap(it.a || "-", 10.5, false, CW);
        ensure(ql.length * 13 + Math.min(al.length, 3) * 15 + 10);
        ql.forEach(function (l) { text(M, y, l, 9.5, true, "0.35 0.35 0.35"); y -= 13; });
        y -= 2;
        al.forEach(function (l) { ensure(16); text(M, y, l, 10.5, false); y -= 15; });
        y -= 12;
      });
      y -= 10;
    });

    // monta o arquivo
    var objs = [], n = pages.length;
    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    var kids = []; for (var i = 0; i < n; i++) kids.push((5 + i * 2) + " 0 R");
    objs[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + n + " >>";
    objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    pages.forEach(function (ops, i) {
      ops.push("BT 0.6 0.6 0.6 rg /F1 8 Tf " + M + " 30 Td (" + esc(clean(doc.footer)) + ") Tj ET");
      var pn = (i + 1) + " / " + n;
      ops.push("BT 0.6 0.6 0.6 rg /F1 8 Tf " + (M + CW - textW(pn, 8)).toFixed(2) + " 30 Td (" + pn + ") Tj ET");
      var stream = ops.join("\n");
      objs[5 + i * 2] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PW + " " + PH + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + (6 + i * 2) + " 0 R >>";
      objs[6 + i * 2] = "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
    });
    var out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", offs = [];
    for (var k = 1; k < objs.length; k++) { offs[k] = out.length; out += k + " 0 obj\n" + objs[k] + "\nendobj\n"; }
    var xref = out.length;
    out += "xref\n0 " + objs.length + "\n0000000000 65535 f \n";
    for (k = 1; k < objs.length; k++) out += ("0000000000" + offs[k]).slice(-10) + " 00000 n \n";
    out += "trailer\n<< /Size " + objs.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
    var bytes = new Uint8Array(out.length);
    for (k = 0; k < out.length; k++) bytes[k] = out.charCodeAt(k) & 255;
    return new Blob([bytes], { type: "application/pdf" });
  };
})();
