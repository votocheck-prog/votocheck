/**
 * VotoCheck — Design System v2 (27/09/2026).
 *
 * Camada visual nova, aplicada DEPOIS do ESTILO_BASE antigo (estilo_html.js): redefine tokens,
 * tipografia, cabeçalho e rodapé, e acrescenta componentes com prefixo `vc-` usados pela home
 * nova, ficha, cola e quiz. As classes antigas continuam existindo (partidos, cargos, judiciário
 * etc.) e herdam a tipografia/cores novas sem precisar de reescrita.
 *
 * Regras de marca que este arquivo implementa (ver doc "Diagnóstico e Plano", seção 3.4):
 *  - Paleta: marinho #0A1440, azul #0059F5, verde-água #00B495 (só gráfico, nunca texto pequeno).
 *  - Nunca verde/vermelho como "bom/ruim". Sim/Não em votações = forma + rótulo, não cor de juízo.
 *  - Tipografia: Plus Jakarta Sans (títulos) + Inter (texto e números tabulares).
 *  - Nada de pop-up, autoplay ou barra fixa de anúncio.
 */

export const FONTES_HEAD = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />`;

export const ESTILO_DS = `
  :root {
    --navy: #0A1440;
    --navy-2: #121E57;
    --navy-3: #1B2A70;
    --blue: #0059F5;
    --blue-600: #0047C8;
    --blue-50: #EEF3FF;
    --teal: #00B495;
    --teal-50: #E6F7F3;
    --ink: #0A1440;
    --ink-2: #3A4461;
    --muted: #5B6478;
    --line: #E3E7EE;
    --line-2: #D3D9E3;
    --paper: #F6F8FB;
    --white: #FFFFFF;
    --amber: #B7791F;
    --radius: 14px;
    --radius-sm: 10px;
    --shadow-sm: 0 1px 2px rgba(10,20,64,.06);
    --shadow: 0 1px 2px rgba(10,20,64,.05), 0 8px 24px -12px rgba(10,20,64,.18);
    --font-display: "Plus Jakarta Sans", "Inter", system-ui, sans-serif;
    --font-body: "Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
    --maxw: 1120px;
    /* tokens antigos apontando pros novos */
    --text: var(--ink);
    --text-muted: var(--muted);
    --border: var(--line);
    --primary: var(--blue);
    --primary-soft: var(--blue-50);
    --accent: var(--teal);
    --accent-soft: var(--teal-50);
    --bg: var(--paper);
  }
  html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
  body { font-family: var(--font-body); font-size: 16px; line-height: 1.6; color: var(--ink); background: var(--paper); -webkit-font-smoothing: antialiased; }
  h1, h2, h3, h4 { font-family: var(--font-display); letter-spacing: -0.02em; line-height: 1.15; color: var(--ink); }
  a { color: var(--blue); text-underline-offset: 3px; }
  a:hover { color: var(--blue-600); }
  :focus-visible { outline: 3px solid rgba(0,89,245,.45); outline-offset: 2px; border-radius: 6px; }
  .card { border-radius: var(--radius); border-color: var(--line); box-shadow: var(--shadow-sm); }
  .tabnum { font-variant-numeric: tabular-nums; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }

  /* ===== Faixa de contagem regressiva ===== */
  .vc-faixa { background: var(--navy); color: #DCE3FF; font-size: 13.5px; text-align: center; padding: 8px 16px; }
  .vc-faixa strong { color: #fff; font-weight: 600; }
  .vc-faixa a { color: #9EC0FF; font-weight: 600; text-decoration: none; margin-left: 8px; white-space: nowrap; }
  .vc-faixa a:hover { color: #fff; }

  /* ===== Cabeçalho ===== */
  header.topo { position: sticky; top: 0; z-index: 50; padding: 10px 24px; background: rgba(255,255,255,.92); backdrop-filter: saturate(1.4) blur(10px); -webkit-backdrop-filter: saturate(1.4) blur(10px); border-bottom: 1px solid var(--line); }
  header.topo .logo img { height: 36px; width: auto; }
  header.topo .nav { gap: 4px; }
  header.topo .nav a.link-sobre, header.topo .nav a.nav-link { color: var(--ink-2); font-size: 14.5px; font-weight: 500; text-decoration: none; padding: 8px 12px; border-radius: 999px; }
  header.topo .nav a.nav-link:hover, header.topo .nav a.link-sobre:hover { background: var(--blue-50); color: var(--blue); }
  header.topo .nav a.nav-cta { background: var(--blue); color: #fff !important; font-weight: 600; margin-left: 6px; }
  header.topo .nav a.nav-cta:hover { background: var(--blue-600); }
  header.topo .nav .nav-social { display: inline-flex; color: var(--muted); padding: 8px; border-radius: 999px; }
  header.topo .nav .nav-social:hover { color: var(--blue); background: var(--blue-50); }
  .nav-mobile { display: none; }
  @media (max-width: 860px) {
    header.topo { padding: 10px 16px; }
    header.topo .logo img { height: 30px; }
    header.topo .nav .nav-link, header.topo .nav .nav-social { display: none; }
    .nav-mobile { display: block; position: relative; }
    .nav-mobile summary { list-style: none; cursor: pointer; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--line-2); font-size: 14px; font-weight: 600; color: var(--ink); }
    .nav-mobile summary::-webkit-details-marker { display: none; }
    .nav-mobile[open] summary { background: var(--blue-50); border-color: var(--blue); color: var(--blue); }
    .nav-mobile-painel { position: absolute; right: 0; top: calc(100% + 8px); width: min(300px, 86vw); background: #fff; border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); padding: 8px; display: grid; }
    .nav-mobile-painel a { padding: 12px 14px; border-radius: 10px; color: var(--ink); text-decoration: none; font-weight: 500; }
    .nav-mobile-painel a:hover { background: var(--blue-50); }
  }

  main.container { max-width: 920px; }
  main.container.vc-full { max-width: none; padding: 0; }

  /* ===== Blocos de layout ===== */
  .vc-wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
  .vc-sec { padding: 72px 0; }
  .vc-sec--branca { background: #fff; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .vc-sec--navy { background: var(--navy); color: #E6EBFF; }
  .vc-sec--navy h2, .vc-sec--navy h3 { color: #fff; }
  .vc-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--blue); margin-bottom: 12px; }
  .vc-sec--navy .vc-eyebrow { color: #7FB0FF; }
  .vc-h2 { font-size: clamp(26px, 3.4vw, 38px); margin: 0 0 12px; }
  .vc-lead { font-size: 17.5px; color: var(--muted); max-width: 680px; margin: 0 0 32px; }
  .vc-sec--navy .vc-lead { color: #B9C4EA; }
  .vc-center { text-align: center; }
  .vc-center .vc-lead { margin-left: auto; margin-right: auto; }
  @media (max-width: 720px) { .vc-sec { padding: 52px 0; } .vc-wrap { padding: 0 16px; } }

  /* ===== Botões ===== */
  .vc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: var(--font-body); font-weight: 600; font-size: 15.5px; line-height: 1; padding: 14px 22px; border-radius: 999px; border: 1.5px solid transparent; text-decoration: none; cursor: pointer; transition: transform .12s ease, background .12s ease, box-shadow .12s ease; white-space: nowrap; }
  .vc-btn:active { transform: translateY(1px); }
  .vc-btn--pri { background: var(--blue); color: #fff; box-shadow: 0 6px 18px -8px rgba(0,89,245,.7); }
  .vc-btn--pri:hover { background: var(--blue-600); color: #fff; }
  .vc-btn--sec { background: #fff; color: var(--ink); border-color: var(--line-2); }
  .vc-btn--sec:hover { border-color: var(--blue); color: var(--blue); }
  .vc-btn--claro { background: rgba(255,255,255,.1); color: #fff; border-color: rgba(255,255,255,.28); }
  .vc-btn--claro:hover { background: rgba(255,255,255,.18); color: #fff; }
  .vc-btn--sm { padding: 10px 16px; font-size: 14px; }

  /* ===== Hero ===== */
  .vc-hero { position: relative; overflow: hidden; background: radial-gradient(1200px 500px at 85% -10%, #1C3FA8 0%, rgba(28,63,168,0) 60%), radial-gradient(700px 400px at -10% 110%, rgba(0,180,149,.28) 0%, rgba(0,180,149,0) 60%), var(--navy); color: #fff; padding: 64px 0 56px; }
  .vc-hero::after { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px); background-size: 40px 40px; mask-image: linear-gradient(to bottom, #000 30%, transparent); pointer-events: none; }
  .vc-hero > * { position: relative; z-index: 1; }
  .vc-hero-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 48px; align-items: center; }
  .vc-hero h1 { color: #fff; font-size: clamp(34px, 5.2vw, 60px); font-weight: 800; margin: 0 0 18px; letter-spacing: -0.03em; }
  .vc-hero h1 em { font-style: normal; background: linear-gradient(90deg, #5B9BFF, #3FE0C0); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .vc-hero-sub { font-size: 18.5px; color: #C3CDF0; max-width: 560px; margin: 0 0 28px; }
  .vc-hero-acoes { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 18px; }
  .vc-selo-fontes { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 26px; font-size: 13px; color: #9AA7D6; }
  .vc-selo-fontes b { color: #DCE3FF; font-weight: 600; }
  .vc-selo-fontes .ponto { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 0 4px rgba(0,180,149,.2); }
  @media (max-width: 900px) { .vc-hero-grid { grid-template-columns: 1fr; gap: 32px; } .vc-hero { padding: 44px 0 40px; } .vc-hero-sub { font-size: 17px; } }

  /* ===== Busca ===== */
  .vc-busca { display: flex; gap: 8px; background: #fff; border-radius: 999px; padding: 6px; box-shadow: 0 20px 40px -20px rgba(0,0,0,.5); max-width: 620px; }
  .vc-busca-ico { display: flex; align-items: center; padding-left: 14px; color: var(--muted); }
  .vc-busca input[type=text], .vc-busca input[type=search] { flex: 1; min-width: 0; border: 0; outline: 0; font-size: 16.5px; padding: 12px 6px; background: transparent; color: var(--ink); }
  .vc-busca select { border: 0; background: var(--paper); border-radius: 999px; padding: 0 12px; font-weight: 600; color: var(--ink); font-size: 14px; }
  .vc-busca button { flex: none; }
  .vc-busca-dica { font-size: 13px; color: #9AA7D6; margin: 10px 0 0 18px; }
  .vc-busca--clara { box-shadow: var(--shadow); border: 1px solid var(--line); }
  @media (max-width: 560px) { .vc-busca { border-radius: 18px; flex-wrap: wrap; } .vc-busca input[type=text], .vc-busca input[type=search] { flex-basis: calc(100% - 50px); } .vc-busca select { height: 44px; flex: 1; } .vc-busca button { flex: 1; } }

  /* ===== Urna: os 6 votos ===== */
  .vc-urna { background: linear-gradient(180deg, #1A2560, #111A4B); border: 1px solid rgba(255,255,255,.12); border-radius: 22px; padding: 22px; box-shadow: 0 30px 60px -30px rgba(0,0,0,.7); }
  .vc-urna-topo { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; letter-spacing: .06em; text-transform: uppercase; color: #93A2D8; margin-bottom: 14px; }
  .vc-urna-topo strong { color: #fff; letter-spacing: 0; text-transform: none; font-size: 14px; }
  .vc-voto { display: grid; grid-template-columns: 30px 1fr auto; align-items: center; gap: 12px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 11px 12px; margin-bottom: 8px; text-decoration: none; color: #fff; transition: background .15s ease, border-color .15s ease, transform .15s ease; }
  .vc-voto:hover { background: rgba(91,155,255,.16); border-color: rgba(91,155,255,.5); transform: translateX(2px); color: #fff; }
  .vc-voto-n { width: 30px; height: 30px; border-radius: 9px; background: rgba(255,255,255,.1); display: grid; place-items: center; font-weight: 700; font-size: 13px; color: #BFD2FF; }
  .vc-voto-cargo { font-weight: 600; font-size: 15px; line-height: 1.2; }
  .vc-voto-cargo small { display: block; font-weight: 400; font-size: 12.5px; color: #93A2D8; margin-top: 2px; }
  .vc-digitos { display: flex; gap: 3px; }
  .vc-digitos span { width: 18px; height: 26px; border-radius: 5px; background: #0B1238; border: 1px solid rgba(255,255,255,.14); }
  .vc-urna-rodape { font-size: 12.5px; color: #93A2D8; margin-top: 12px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .vc-urna-rodape a { color: #9EC0FF; font-weight: 600; text-decoration: none; }

  /* ===== Cards e grades ===== */
  .vc-grid { display: grid; gap: 16px; }
  .vc-grid-2 { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .vc-grid-3 { grid-template-columns: repeat(3, minmax(0,1fr)); }
  .vc-grid-4 { grid-template-columns: repeat(4, minmax(0,1fr)); }
  @media (max-width: 900px) { .vc-grid-3, .vc-grid-4 { grid-template-columns: repeat(2, minmax(0,1fr)); } }
  @media (max-width: 620px) { .vc-grid-2, .vc-grid-3, .vc-grid-4 { grid-template-columns: 1fr; } }
  .vc-card { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 22px; box-shadow: var(--shadow-sm); }
  .vc-card h3 { font-size: 18px; margin: 0 0 8px; }
  .vc-card p { margin: 0; color: var(--muted); font-size: 15px; }
  a.vc-card { display: block; text-decoration: none; color: inherit; transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease; }
  a.vc-card:hover { border-color: var(--blue); box-shadow: var(--shadow); transform: translateY(-2px); color: inherit; }
  .vc-ico { width: 44px; height: 44px; border-radius: 12px; background: var(--blue-50); color: var(--blue); display: grid; place-items: center; margin-bottom: 14px; }
  .vc-ico--teal { background: var(--teal-50); color: #00806A; }
  .vc-mais { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; font-weight: 600; font-size: 14.5px; color: var(--blue); }

  /* ===== Cards navy/dourado (home: R$ público em campanha, 2022, perderam o mandato) — 27/09/2026.
     Título em dourado sobre fundo navy, como pedido pro bloco "R$ público" — e replicado nos
     outros 2 cards da mesma fileira pra criar um padrão visual único (como se fossem notícias). */
  .vc-card--navy { background: var(--navy); border-color: rgba(255,255,255,.12); }
  .vc-card--navy h3 { color: #FFB067; }
  .vc-card--navy p { color: #C3CDF0; }
  .vc-card--navy .vc-card-num { font-family: var(--font-display); font-weight: 800; font-size: 26px; color: #FFB067; line-height: 1; margin-bottom: 8px; }
  .vc-card--navy .vc-mais { color: #7FB0FF; }
  a.vc-card--navy:hover { border-color: #5B9BFF; box-shadow: 0 8px 24px -12px rgba(0,0,0,.4); }
  a.vc-card--navy:hover .vc-mais { color: #fff; }

  /* ===== Mapa (home) ===== */
  .vc-mapa-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 40px; align-items: center; }
  .vc-mapa-grid .mapa-brasil-wrap { max-width: 520px; margin: 0 auto; }
  .vc-ufs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 18px; }
  .vc-ufs a { font-size: 13px; font-weight: 600; text-decoration: none; color: var(--ink-2); border: 1px solid var(--line-2); border-radius: 8px; padding: 6px 0; width: 44px; text-align: center; background: #fff; }
  .vc-ufs a:hover, .vc-ufs a.ativo { border-color: var(--blue); color: #fff; background: var(--blue); }
  @media (max-width: 900px) { .vc-mapa-grid { grid-template-columns: 1fr; } }

  .vc-mapa-grid .uf-path { fill: #DCE6FF; stroke: #fff; stroke-width: 1.2; transition: fill .15s ease; }
  .vc-mapa-grid .uf-link:hover .uf-path, .vc-mapa-grid .uf-link:focus .uf-path { fill: var(--blue); }
  .vc-mapa-grid .mapa-brasil-wrap { max-width: 460px; }
  .vc-lista-check li em { font-style: italic; }

  /* ===== Quociente (passos) ===== */
  .vc-passos { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; counter-reset: passo; }
  .vc-passo { position: relative; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: var(--radius); padding: 22px 18px 20px; }
  .vc-passo::before { counter-increment: passo; content: counter(passo); display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--blue); color: #fff; font-weight: 700; margin-bottom: 14px; }
  .vc-passo h3 { font-size: 16.5px; margin: 0 0 6px; }
  .vc-passo p { font-size: 14.5px; color: #B9C4EA; margin: 0; }
  .vc-passo:not(:last-child)::after { content: ""; position: absolute; right: -12px; top: 38px; width: 10px; height: 10px; border-top: 2px solid #5B9BFF; border-right: 2px solid #5B9BFF; transform: rotate(45deg); }
  @media (max-width: 900px) { .vc-passos { grid-template-columns: 1fr 1fr; } .vc-passo::after { display: none; } }
  @media (max-width: 560px) { .vc-passos { grid-template-columns: 1fr; } }
  .vc-exemplo { margin-top: 22px; display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center; background: rgba(0,180,149,.1); border: 1px solid rgba(0,180,149,.35); border-radius: var(--radius); padding: 18px 20px; }
  .vc-exemplo-num { font-family: var(--font-display); font-size: 34px; font-weight: 800; color: #3FE0C0; line-height: 1; }
  .vc-exemplo p { margin: 0; font-size: 15px; color: #D5DCF5; }
  .vc-exemplo-titulo { color: #fff; }
  @media (max-width: 560px) { .vc-exemplo { grid-template-columns: 1fr; } }
  /* 27/09/2026: "Voto para deputado" e "Meu VotoCheck" agora trocam de fundo (navy ⇄ branco)
     dependendo de qual seção está em destaque na home — ver renderHomeV2. Como .vc-passo/.vc-exemplo
     nasceram desenhados só pra fundo escuro, e .vc-pergunta-demo/.vc-opcoes/.vc-lista-check só pra
     fundo claro, esses componentes agora reagem ao modificador da seção-mãe (.vc-sec--navy ou
     .vc-sec--branca) em vez de ter a cor fixa no próprio componente. */
  .vc-sec--branca .vc-passo { background: var(--paper); border-color: var(--line); }
  .vc-sec--branca .vc-passo p { color: var(--muted); }
  .vc-sec--branca .vc-passo::after { border-color: var(--blue); }
  .vc-sec--branca .vc-exemplo { background: var(--teal-50); border-color: rgba(0,180,149,.35); }
  .vc-sec--branca .vc-exemplo p { color: var(--ink-2); }
  .vc-sec--branca .vc-exemplo-titulo { color: var(--ink); }

  /* ===== Quiz teaser ===== */
  .vc-quiz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
  .vc-pergunta-demo { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 18px 18px 14px; box-shadow: var(--shadow); margin-bottom: 12px; }
  .vc-pergunta-demo small { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
  .vc-pergunta-demo strong { display: block; font-family: var(--font-display); font-size: 16.5px; margin: 6px 0 12px; }
  .vc-opcoes { display: flex; gap: 8px; flex-wrap: wrap; }
  .vc-opcoes a { font-size: 14px; font-weight: 600; padding: 9px 14px; border-radius: 999px; border: 1px solid var(--line-2); text-decoration: none; color: var(--ink); background: #fff; }
  .vc-opcoes a:hover { border-color: var(--blue); color: var(--blue); background: var(--blue-50); }
  .vc-lista-check { list-style: none; padding: 0; margin: 0 0 26px; display: grid; gap: 10px; }
  .vc-lista-check li { display: flex; gap: 10px; align-items: flex-start; font-size: 15.5px; color: var(--ink-2); }
  .vc-lista-check li svg { flex: none; color: #00806A; margin-top: 2px; }
  @media (max-width: 900px) { .vc-quiz-grid { grid-template-columns: 1fr; } }
  /* 27/09/2026: variante escura de .vc-pergunta-demo/.vc-opcoes/.vc-lista-check, pro "Meu
     VotoCheck" quando cai numa seção navy (ver nota acima sobre a troca de fundo). */
  .vc-sec--navy .vc-pergunta-demo { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); box-shadow: none; }
  .vc-sec--navy .vc-pergunta-demo small { color: #93A2D8; }
  .vc-sec--navy .vc-pergunta-demo strong { color: #fff; }
  .vc-sec--navy .vc-opcoes a { color: #fff; border-color: rgba(255,255,255,.25); background: rgba(255,255,255,.05); }
  .vc-sec--navy .vc-opcoes a:hover { border-color: #5B9BFF; color: #fff; background: rgba(91,155,255,.16); }
  .vc-sec--navy .vc-lista-check li { color: #D5DCF5; }
  .vc-sec--navy .vc-lista-check li svg { color: #3FE0C0; }

  /* ===== Método (como verificamos) ===== */
  .vc-fluxo { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 0; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; background: #fff; }
  .vc-fluxo > div { padding: 20px; border-right: 1px solid var(--line); }
  .vc-fluxo > div:last-child { border-right: 0; }
  .vc-fluxo small { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--blue); }
  .vc-fluxo strong { display: block; font-family: var(--font-display); font-size: 17px; margin: 6px 0 4px; }
  .vc-fluxo span { font-size: 14px; color: var(--muted); }
  @media (max-width: 800px) { .vc-fluxo { grid-template-columns: 1fr 1fr; } .vc-fluxo > div:nth-child(2) { border-right: 0; } .vc-fluxo > div:nth-child(-n+2) { border-bottom: 1px solid var(--line); } }
  .vc-passaporte { margin-top: 18px; background: #fff; border: 1px dashed var(--line-2); border-radius: var(--radius); padding: 16px 18px; font-size: 14px; color: var(--ink-2); display: grid; grid-template-columns: repeat(4, auto); gap: 6px 22px; justify-content: start; }
  .vc-passaporte b { display: block; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
  @media (max-width: 700px) { .vc-passaporte { grid-template-columns: 1fr 1fr; } }
  .vc-nao-fazemos { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
  .vc-nao-fazemos span { font-size: 14px; font-weight: 600; color: var(--ink-2); background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 8px 14px; display: inline-flex; gap: 8px; align-items: center; }
  .vc-nao-fazemos span svg { color: var(--muted); }

  /* ===== Números ===== */
  .vc-stats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; }
  .vc-stat { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 22px; }
  .vc-stat b { display: block; font-family: var(--font-display); font-size: clamp(28px, 3.6vw, 40px); font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .vc-stat span { font-size: 14px; color: var(--muted); }
  @media (max-width: 800px) { .vc-stats { grid-template-columns: 1fr 1fr; } }
  /* 27/09/2026: gráfico "A base" modernizado (skill dataviz — magnitude/série única): barra fina
     com ponta arredondada e base quadrada (cresce da esquerda), linha inteira reage ao
     hover/foco (destaca + mostra o % do total num tooltip), e o mesmo % vai no aria-label pra
     quem usa leitor de tela não depender do hover. Segue o mesmo padrão de "modernizar depois de
     aprovado" pras outras páginas — combinado com o Rodrigo. */
  .vc-barras { margin-top: 18px; background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 22px 24px 14px; }
  .vc-barra { position: relative; display: grid; grid-template-columns: 170px 1fr 76px; gap: 14px; align-items: center; font-size: 14px; padding: 9px 4px; border-radius: 8px; transition: background .15s ease; cursor: default; }
  .vc-barra:hover, .vc-barra:focus-visible { background: var(--blue-50); outline: none; }
  .vc-barra-rotulo { color: var(--ink-2); font-weight: 500; }
  .vc-barra-trilho { position: relative; height: 14px; border-radius: 3px; background: var(--paper); overflow: visible; }
  .vc-barra-trilho i { display: block; height: 100%; border-radius: 0 4px 4px 0; background: var(--blue); transition: filter .15s ease; }
  .vc-barra:hover .vc-barra-trilho i, .vc-barra:focus-visible .vc-barra-trilho i { filter: brightness(1.1); }
  .vc-barra b { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: var(--ink); }
  .vc-barra-tip { position: absolute; left: 0; top: -32px; background: var(--navy); color: #fff; font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 7px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .12s ease, transform .12s ease; transform: translateY(4px); z-index: 2; }
  .vc-barra-tip::after { content: ""; position: absolute; left: 14px; top: 100%; border: 5px solid transparent; border-top-color: var(--navy); }
  .vc-barra:hover .vc-barra-tip, .vc-barra:focus-visible .vc-barra-tip { opacity: 1; transform: translateY(0); }
  @media (max-width: 560px) { .vc-barra { grid-template-columns: 110px 1fr 60px; font-size: 13px; } }

  /* ===== Publicidade (espaços A1–A5) ===== */
  .vc-pub { position: relative; display: grid; grid-template-columns: auto 1fr auto; gap: 18px; align-items: center; background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 18px 20px; text-decoration: none; color: var(--ink); }
  .vc-pub:hover { border-color: var(--line-2); box-shadow: var(--shadow-sm); color: var(--ink); }
  .vc-pub-rotulo { position: absolute; top: -9px; left: 16px; font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; background: var(--paper); color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; }
  .vc-pub-logo { width: 72px; height: 72px; border-radius: 50%; box-shadow: 0 0 0 1px var(--line), 0 4px 12px rgba(10,20,64,.10); object-fit: cover; flex: none; }
  @media (max-width: 560px) { .vc-pub-logo { width: 56px; height: 56px; } }
  .vc-apoiadores img { width: 60px; height: 60px; border-radius: 50%; display: block; opacity: .92; box-shadow: 0 0 0 2px rgba(255,255,255,.14); transition: opacity .15s, transform .15s; }
  .vc-apoiadores a:hover img { transform: translateY(-2px); }
  .vc-apoiadores a:hover img { opacity: 1; }
  .vc-pub-marca { width: 52px; height: 52px; border-radius: 12px; display: grid; place-items: center; font-family: var(--font-display); font-weight: 800; font-size: 17px; color: #fff; }
  .vc-pub-texto strong { display: block; font-size: 16px; }
  .vc-pub-texto span { font-size: 14px; color: var(--muted); }
  .vc-pub-cta { font-size: 14px; font-weight: 600; color: var(--blue); white-space: nowrap; }
  @media (max-width: 560px) { .vc-pub { grid-template-columns: auto 1fr; } .vc-pub-cta { grid-column: 1 / -1; } }
  .vc-apoiadores { display: flex; flex-wrap: wrap; gap: 8px 18px; justify-content: center; align-items: center; }
  .vc-apoiadores a { font-size: 13px; font-weight: 600; color: #9AA7D6; text-decoration: none; }
  .vc-apoiadores a:hover { color: #fff; }

  /* ===== Siga / compartilhe / apoie ===== */
  .vc-cta3 .vc-card { display: flex; flex-direction: column; }
  .vc-cta3 .vc-card .vc-acoes { margin-top: auto; padding-top: 18px; display: flex; gap: 8px; flex-wrap: wrap; }
  .vc-pix { display: grid; grid-template-columns: 96px minmax(0,1fr); gap: 14px; align-items: center; margin-top: 14px; min-width: 0; }
  .vc-pix img { width: 96px; height: 96px; border-radius: 8px; border: 1px solid var(--line); }
  .vc-pix > div { min-width: 0; }
  .vc-pix code { font-size: 13.5px; background: var(--paper); padding: 3px 8px; border-radius: 6px; overflow-wrap: anywhere; word-break: break-word; display: inline-block; max-width: 100%; }
  .vc-pix div[style*="color:#9AA3B5"] { overflow-wrap: anywhere; }

  .vc-captura { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
  .vc-captura input { flex: 1; min-width: 200px; padding: 13px 16px; border: 1px solid var(--line-2); border-radius: 999px; font-size: 15px; }

  /* ===== Rodapé ===== */
  footer.rodape { text-align: left; background: var(--navy); color: #9AA7D6; border-top: 0; margin-top: 0; padding: 56px 0 28px; font-size: 14px; }
  footer.rodape a { color: #C8D2F5; text-decoration: none; }
  footer.rodape a:hover { color: #fff; }
  /* 27/09/2026: rodapé ganhou uma 4ª coluna de links ("O valor do seu voto") — ver rodape() em
     estilo_html.js. 5 colunas no desktop (marca + 4 listas), 3 num meio-termo, 2 no tablet. */
  .rod-grid { display: grid; grid-template-columns: 1.15fr 1fr 1fr 1fr 1fr; gap: 26px; }
  .rod-grid h4 { font-family: var(--font-body); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #6F7DB5; margin: 0 0 12px; }
  .rod-grid ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
  .rod-marca img { height: 34px; width: auto; margin-bottom: 14px; }
  .rod-marca p { margin: 0 0 14px; max-width: 320px; line-height: 1.55; }
  .rod-redes { display: flex; gap: 8px; }
  .rod-redes a { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: rgba(255,255,255,.07); color: #DCE3FF; }
  .rod-redes a:hover { background: var(--blue); }
  .rod-apoio { border-top: 1px solid rgba(255,255,255,.08); margin-top: 36px; padding-top: 22px; display: grid; gap: 10px; justify-items: center; }
  .rod-apoio small { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #6F7DB5; }
  .rod-base { border-top: 1px solid rgba(255,255,255,.08); margin-top: 22px; padding-top: 18px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 12.5px; color: #6F7DB5; }
  @media (max-width: 1020px) { .rod-grid { grid-template-columns: 1fr 1fr 1fr; } .rod-marca { grid-column: 1 / -1; } }
  @media (max-width: 620px) { .rod-grid { grid-template-columns: 1fr 1fr; } }

  /* ===== Utilitários ===== */
  .vc-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: var(--blue-50); color: var(--blue); }
  .vc-chip--cinza { background: var(--paper); color: var(--ink-2); border: 1px solid var(--line); }
  .vc-chip--teal { background: var(--teal-50); color: #00735F; }
  .vc-fonte { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
  .vc-fonte a { color: var(--muted); }
  .vc-aviso { background: #FFF8EB; border: 1px solid #F1DDB4; color: #6B4A0E; border-radius: var(--radius-sm); padding: 12px 14px; font-size: 14px; }
  .vc-reveal { animation: vcsobe .5s ease both; }
  @keyframes vcsobe { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
`;
