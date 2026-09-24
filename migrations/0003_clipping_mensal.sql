-- VotoCheck — Rastreio do clipping mensal (seção 33, 24/09/2026).
--
-- Guarda o último mês ('YYYY-MM') em que o clipping mensal foi CHECADO pra este acompanhamento —
-- não necessariamente enviado: um mês sem dado real (ver clipping_mensal.js) também marca esta
-- coluna, pra não ficar tentando de novo em todo disparo do cron nem mandar, meses depois, um
-- clipping de um mês antigo se o dado chegar atrasado.
--
-- Aplicar do mesmo jeito manual usado nas migrations anteriores (API REST do D1 — sem wrangler).

ALTER TABLE acompanhamento ADD COLUMN ultimo_clipping_checado TEXT;
