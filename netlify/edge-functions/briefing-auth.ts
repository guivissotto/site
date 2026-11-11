// Protege tudo em /briefing com senha.
// A senha NÃO fica no código (o repositório é público): ela vem da
// variável de ambiente BRIEFING_PASSWORD, configurada no painel da Netlify.

const COOKIE = "vs_briefing";

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function page(error = false, next = "/briefing/"): Response {
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Briefing — Vissotto Studio & Co</title>
<link rel="icon" href="/favicon.svg">
<link rel="stylesheet" href="/briefing/assets/briefing.css">
</head><body class="gate">
<header class="bar"><a href="/">VISSOTTO STUDIO &amp; CO</a><span>ÁREA DO CLIENTE</span></header>
<main class="gate-main">
  <h1>BRIEFING<br>COM ACESSO<br>RESTRITO ©</h1>
  <form method="POST" class="gate-form">
    <input type="hidden" name="next" value="${next.replace(/"/g, "")}">
    <label for="pw">Digite a senha que você recebeu do studio</label>
    <div class="gate-row">
      <input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
      <button type="submit">ENTRAR →</button>
    </div>
    ${error ? '<p class="gate-error">Senha incorreta. Tente novamente.</p>' : ""}
  </form>
</main>
</body></html>`;
  return new Response(html, {
    status: error ? 401 : 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export default async (req: Request, context: any) => {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/briefing/assets/")) return context.next();

  const password = Netlify.env.get("BRIEFING_PASSWORD");
  if (!password) {
    return new Response("Briefing indisponível: senha ainda não configurada.", { status: 503 });
  }
  const token = await sha256("vissotto-briefing:" + password);

  // Já autenticado
  if (getCookie(req, COOKIE) === token) return context.next();

  // Envio da senha
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      const tried = String(form.get("password") || "");
      let next = String(form.get("next") || "/briefing/");
      if (!next.startsWith("/briefing")) next = "/briefing/";
      if (tried === password) {
        return new Response(null, {
          status: 303,
          headers: {
            location: next,
            "set-cookie": `${COOKIE}=${token}; Path=/briefing; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      }
      return page(true, next);
    }
  }

  return page(false, url.pathname);
};

export const config = { path: ["/briefing", "/briefing/*"] };
