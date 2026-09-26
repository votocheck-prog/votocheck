"""VotoCheck — fábrica diária de peças (esteira D21).

Roda todo dia (GitHub Actions, .github/workflows/pauta.yml) e:
 1. escolhe os estados do dia (rodízio, maiores primeiro);
 2. consulta o D1 (dados agregados do TSE: candidatos por vaga, mulheres, idade, patrimônio, reeleição);
 3. gera 1 carrossel (1080x1350) por estado + 1 reel narrado (voz IA rotulada) do 1º estado;
 4. sobe os arquivos para o KV (s:<data>/...) e grava o manifesto pauta:<data>;
 5. manda e-mail ao Rodrigo com o link da página de aprovação.

Regras de conteúdo (doc, seção 5.6): só agregados, nunca candidato nominal; fonte na peça;
partidos nunca em ranking; véspera e dia de eleição = só utilidade (a fábrica não gera nada nesses dias).

Variáveis de ambiente: CF_TOKEN, ADMIN_TOKEN, RESEND_API_KEY, GEMINI_API_KEY (opcional: sem ela, o reel sai sem narração),
DATA (AAAA-MM-DD, opcional), UFS_POR_DIA (padrão 3), EMAIL_PARA (padrão votocheck@gmail.com).
"""
import os, sys, json, base64, time, wave, subprocess, statistics, urllib.request, datetime, asyncio, shutil

ACC = '22688effbd9ab181498d04ccd2cc8d2e'
DB = '1de4bbee-3c8c-4043-91f9-fafd527c2f1f'
KV = os.environ.get('CF_KV_OG', '58aea9d36a9c4055bbcff72f7c08c3bd')
TOK = os.environ['CF_TOKEN']
AQUI = os.path.dirname(os.path.abspath(__file__))
HOJE = os.environ.get('DATA') or (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).strftime('%Y-%m-%d')
SEM_PECAS = {'2026-10-03', '2026-10-04', '2026-10-24', '2026-10-25'}  # véspera e dia de votação: só utilidade (feito à mão)

UF_NOMES = {'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina', 'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'}
VAGAS_FED = {'SP': 70, 'MG': 53, 'RJ': 46, 'BA': 39, 'RS': 31, 'PR': 30, 'PE': 25, 'CE': 22, 'MA': 18, 'GO': 17, 'PA': 17, 'SC': 16, 'PB': 12, 'ES': 10, 'PI': 10, 'AL': 9, 'AC': 8, 'AM': 8, 'AP': 8, 'DF': 8, 'MT': 8, 'MS': 8, 'RN': 8, 'RO': 8, 'RR': 8, 'SE': 8, 'TO': 8}
ORDEM = sorted(VAGAS_FED, key=lambda u: (-VAGAS_FED[u], u))
PREP = {'AC': 'no', 'AL': 'em', 'AP': 'no', 'AM': 'no', 'BA': 'na', 'CE': 'no', 'DF': 'no', 'ES': 'no', 'GO': 'em', 'MA': 'no', 'MT': 'em', 'MS': 'em', 'MG': 'em', 'PA': 'no', 'PB': 'na', 'PR': 'no', 'PE': 'em', 'PI': 'no', 'RJ': 'no', 'RN': 'no', 'RS': 'no', 'RO': 'em', 'RR': 'em', 'SC': 'em', 'SP': 'em', 'SE': 'em', 'TO': 'no'}


def d1(sql, params=None):
    body = {'sql': sql}
    if params is not None:
        body['params'] = params
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database/{DB}/query', data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=120))
    return r['result'][0]['results']


def ufs_do_dia():
    n = int(os.environ.get('UFS_POR_DIA', '3'))
    inicio = datetime.date(2026, 9, 27)
    dia = (datetime.date.fromisoformat(HOJE) - inicio).days
    return [ORDEM[(dia * n + i) % len(ORDEM)] for i in range(n)]


def idade(dn):
    try:
        d, m, a = [int(x) for x in dn[:10].split('/')] if '/' in dn else [int(x) for x in reversed(dn[:10].split('-'))]
    except Exception:
        return None
    hoje = datetime.date.fromisoformat(HOJE)
    return hoje.year - a - ((hoje.month, hoje.day) < (m, d))


def dados_uf(uf):
    rows = d1("""SELECT p.genero, p.data_nascimento, c.bens_declarados_total bens,
                 EXISTS(SELECT 1 FROM mandato m WHERE m.pessoa_id=c.pessoa_id AND m.data_fim IS NULL AND m.cargo_id=4) dep_atual
                 FROM candidatura c JOIN pessoa p ON p.id=c.pessoa_id WHERE c.ano_eleicao=2026 AND c.cargo_id=4 AND c.sg_uf=?""", [uf])
    n = len(rows)
    mulheres = sum(1 for r in rows if (r['genero'] or '').startswith('F'))
    idades = [i for i in (idade(r['data_nascimento'] or '') for r in rows) if i]
    bens = sorted((r['bens'] or 0) for r in rows)
    reel = sum(1 for r in rows if r['dep_atual'])
    est = d1("SELECT count(*) n FROM candidatura WHERE ano_eleicao=2026 AND sg_uf=? AND cargo_id IN (5,6)", [uf])[0]['n']
    sen = d1("SELECT count(*) n FROM candidatura WHERE ano_eleicao=2026 AND sg_uf=? AND cargo_id=3", [uf])[0]['n']
    gov = d1("SELECT count(*) n FROM candidatura WHERE ano_eleicao=2026 AND sg_uf=? AND cargo_id=2", [uf])[0]['n']
    f = VAGAS_FED[uf]
    vagas_est = 3 * f if f <= 12 else 36 + (f - 12)
    return {
        'uf': uf, 'nome': UF_NOMES[uf], 'prep': PREP[uf], 'fed': n, 'vagas_fed': f, 'por_vaga': round(n / f, 1) if f else 0,
        'mulheres_pct': round(100 * mulheres / n) if n else 0, 'idade_media': round(statistics.mean(idades)) if idades else None,
        'bens_mediana': statistics.median(bens) if bens else 0, 'reeleicao': reel, 'est': est, 'vagas_est': vagas_est, 'sen': sen, 'gov': gov,
    }


def brl(v):
    if v >= 1e6:
        return f"R$ {v/1e6:.1f} mi".replace('.', ',')
    if v >= 1e3:
        return f"R$ {round(v/1e3):,} mil".replace(',', '.')
    return f"R$ {round(v):,}".replace(',', '.')


def num(n):
    return f"{n:,}".replace(',', '.')


# ---------- peças ----------
def rod(fonte):
    return f'<div class="rod"><div class="fonte">{fonte}</div><img src="logo_h_branco.png"></div>'


def page(body):
    return f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"></head><body><div class="s">{body}</div></body></html>'


FONTE = f'Fonte: TSE, candidaturas registradas (dados de {HOJE[8:10]}/{HOJE[5:7]}/{HOJE[:4]})'


def slides_uf(x):
    t = 6
    s = []
    s.append(page(f'''<div class="eyebrow">Raio-X da eleição · 1º turno 4/out</div><h1 style="font-size:100px">Quem disputa<br>{x['prep']} <em>{x['nome']}?</em></h1>
<p class="lead" style="margin-top:36px">Os números oficiais dos candidatos a deputado federal {x['prep']} {x['nome']}. Arrasta →</p>{rod('@votocheck · informação oficial, com fonte')}'''))
    s.append(page(f'''<div class="pag">2/{t}</div><div class="eyebrow">Deputado Federal · {x['uf']}</div><div class="big"><em>{num(x['fed'])}</em></div>
<h2 style="margin-top:24px">candidatos para {x['vagas_fed']} vagas</h2><p class="lead">Cerca de {str(x['por_vaga']).replace('.', ',')} por vaga. E ainda tem {num(x['est'])} disputando {x['vagas_est']} vagas de deputado {'distrital' if x['uf']=='DF' else 'estadual'}.</p>{rod(FONTE)}'''))
    s.append(page(f'''<div class="pag">3/{t}</div><div class="eyebrow">Quem são</div><div class="big"><em>{x['mulheres_pct']}%</em></div>
<h2 style="margin-top:24px">das candidaturas a deputado federal são de mulheres</h2><p class="lead">A lei exige que cada partido reserve pelo menos 30% das candidaturas para cada gênero.</p>{rod(FONTE + ' · Lei 9.504/97, art. 10')}'''))
    s.append(page(f'''<div class="pag">4/{t}</div><div class="eyebrow">Perfil</div><div class="big"><em>{x['idade_media']} anos</em></div>
<h2 style="margin-top:24px">é a idade média</h2><p class="lead">E metade dos candidatos declarou ao TSE patrimônio de até <b style="color:#fff">{brl(x['bens_mediana'])}</b>.</p>{rod(FONTE + ' · bens declarados')}'''))
    s.append(page(f'''<div class="pag">5/{t}</div><div class="eyebrow">Quem já está lá</div><div class="big"><em>{x['reeleicao']}</em></div>
<h2 style="margin-top:24px">deputados federais {x['prep']} {x['nome']} tentam a reeleição</h2><p class="lead">No VotoCheck, a ficha de quem já tem mandato mostra como a pessoa votou nas votações do Plenário.</p>{rod('Fonte: Câmara dos Deputados e TSE')}'''))
    s.append(page(f'''<div class="pag">6/{t}</div><div class="eyebrow">VotoCheck</div><h2>Veja todos os<br>candidatos {x['prep']}<br><em>{x['nome']}.</em></h2>
<p class="lead">Nome, número, partido, patrimônio declarado e com quem o voto soma. Monte sua cola e leve impressa.</p>
<div style="margin-top:44px"><span class="btn">votocheck.com.br</span></div>{rod('@votocheck no Instagram, TikTok e YouTube')}'''))
    return s


def legenda_uf(x):
    return (f"Raio-X da eleição {x['prep']} {x['nome']}: {num(x['fed'])} candidatos a deputado federal para {x['vagas_fed']} vagas, "
            f"{x['mulheres_pct']}% de mulheres, idade média de {x['idade_media']} anos.\n\n"
            f"Arrasta para ver os números oficiais e marca alguém {x['prep']} {x['nome']} que ainda não decidiu o voto para deputado.\n\n"
            f"No VotoCheck você vê todos os candidatos do estado, com número, partido, patrimônio declarado e fonte oficial. Link na bio.\n\n"
            f"#eleicoes2026 #{x['nome'].replace(' ', '').lower()} #deputadofederal #voto #votoconsciente")


def roteiro_uf(x):
    return [
        f"Quem disputa a eleição {x['prep']} {x['nome']}?",
        f"São {x['fed']} candidatos a deputado federal para {x['vagas_fed']} vagas.",
        f"{x['mulheres_pct']} por cento das candidaturas são de mulheres.",
        f"A idade média é de {x['idade_media']} anos.",
        f"{x['reeleicao']} deputados federais do estado tentam a reeleição.",
        "Veja todos os candidatos e monte sua cola em votocheck ponto com ponto bê erre.",
    ]


async def render(htmls, pasta, prefixo):
    from playwright.async_api import async_playwright
    os.makedirs(pasta, exist_ok=True)
    for f in ('base.css', 'logo_h_branco.png'):
        shutil.copy(os.path.join(AQUI, f), pasta)
    saidas = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1080, 'height': 1350})
        for i, h in enumerate(htmls, 1):
            hp = os.path.join(pasta, f'{prefixo}_{i:02d}.html')
            open(hp, 'w').write(h)
            await pg.goto('file://' + hp)
            await pg.wait_for_load_state('networkidle')
            await pg.wait_for_timeout(250)
            out = os.path.join(pasta, f'{prefixo}_{i:02d}.png')
            await pg.screenshot(path=out)
            saidas.append(out)
        await b.close()
    return saidas


def tts(texto, saida):
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        return False
    body = {"contents": [{"parts": [{"text": texto}]}], "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Charon"}}}}}
    for tent in range(6):
        req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent', data=json.dumps(body).encode(), headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
        try:
            r = json.load(urllib.request.urlopen(req, timeout=120))
            part = r['candidates'][0]['content']['parts'][0]['inlineData']
            raw = base64.b64decode(part['data'])
            if 'wav' in part.get('mimeType', ''):
                open(saida, 'wb').write(raw)
            else:
                with wave.open(saida, 'wb') as w:
                    w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw)
            time.sleep(7)
            return True
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(65); continue
            print('TTS erro', e.code, e.read()[:200]); return False
    return False


def dur(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).strip())


def montar_reel(pngs, roteiro, pasta, nome):
    from PIL import Image, ImageDraw, ImageFont
    frames = []
    try:
        ft = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 30)
        ftb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40)
    except Exception:
        ft = ftb = ImageFont.load_default()
    logo = Image.open(os.path.join(AQUI, 'logo_h_branco.png')).convert('RGBA')
    logo = logo.resize((int(logo.width * 80 / logo.height), 80))
    narrado = bool(os.environ.get('GEMINI_API_KEY'))
    for f in pngs:
        c = Image.new('RGB', (1080, 1920), (10, 20, 64))
        c.paste(Image.open(f).convert('RGB'), (0, 285))
        c.paste(logo, ((1080 - logo.width) // 2, 120), logo)
        d = ImageDraw.Draw(c)
        t = 'votocheck.com.br · @votocheck'
        d.text(((1080 - d.textlength(t, font=ftb)) / 2, 1720), t, fill=(158, 192, 255), font=ftb)
        if narrado:
            t2 = 'Narração gerada por IA'
            d.text(((1080 - d.textlength(t2, font=ft)) / 2, 1800), t2, fill=(111, 125, 181), font=ft)
        fr = f.replace('.png', '_v.png'); c.save(fr); frames.append(fr)
    audios = []
    if narrado:
        for i, linha in enumerate(roteiro):
            a = os.path.join(pasta, f'{nome}_a{i:02d}.wav')
            if tts(linha, a):
                audios.append(a)
            else:
                audios = []; break
    X = 0.4
    duracoes = [max(3.0, dur(a) + 0.6) for a in audios] if len(audios) == len(frames) else [3.2] * len(frames)
    inp = []
    for fr, dd in zip(frames, duracoes):
        inp += ['-loop', '1', '-t', f'{dd + X:.2f}', '-i', fr]
    fc, prev, off, starts = [], '[0:v]', 0, [0]
    for i in range(1, len(frames)):
        off += duracoes[i - 1]
        fc.append(f'{prev}[{i}:v]xfade=transition=slideleft:duration={X}:offset={off:.2f}[v{i}]')
        prev = f'[v{i}]'; starts.append(off)
    saida = os.path.join(pasta, f'{nome}_reel.mp4')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error'] + inp
    if audios and len(audios) == len(frames):
        for a in audios:
            cmd += ['-i', a]
        n = len(frames); mix = []
        for i in range(n):
            ms = int((starts[i] + 0.25) * 1000)
            fc.append(f'[{n + i}:a]adelay={ms}|{ms},apad[a{i}]'); mix.append(f'[a{i}]')
        fc.append(''.join(mix) + f'amix=inputs={n}:normalize=0,atrim=0:{sum(duracoes) + X:.2f},loudnorm=I=-16:TP=-1.5[aout]')
        cmd += ['-filter_complex', ';'.join(fc), '-map', prev, '-map', '[aout]', '-c:a', 'aac', '-b:a', '160k', '-shortest']
    else:
        cmd += ['-filter_complex', ';'.join(fc), '-map', prev]
    cmd += ['-r', '30', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '21', '-movflags', '+faststart', saida]
    subprocess.run(cmd, check=True)
    return saida


def kv_put_bulk(itens):
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{KV}/bulk', method='PUT', data=json.dumps(itens).encode(), headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=300))
    assert r.get('success'), r


def email(pauta):
    key = os.environ.get('RESEND_API_KEY'); tok = os.environ.get('ADMIN_TOKEN')
    if not key or not tok:
        print('sem RESEND_API_KEY/ADMIN_TOKEN: e-mail não enviado'); return
    link = f'https://votocheck.com.br/admin/pauta?d={HOJE}&t={tok}'
    itens = ''.join(f"<li>{i['titulo']} <small>({i['tipo']})</small></li>" for i in pauta['itens'])
    html = f"""<div style="font-family:Arial,sans-serif;max-width:560px">
<h2 style="color:#0A1440">Pauta do dia {HOJE[8:10]}/{HOJE[5:7]}: {len(pauta['itens'])} peças para aprovar</h2>
<ul>{itens}</ul>
<p><a href="{link}" style="display:inline-block;background:#0059F5;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Abrir e aprovar</a></p>
<p style="color:#5B6478;font-size:13px">Cada peça tem os arquivos para baixar e a legenda pronta. Nada é publicado sem aprovação.</p></div>"""
    body = {'from': 'VotoCheck <naoresponda@updates.votocheck.com.br>', 'to': [os.environ.get('EMAIL_PARA', 'votocheck@gmail.com')], 'subject': f'VotoCheck · pauta de {HOJE[8:10]}/{HOJE[5:7]} ({len(pauta["itens"])} peças)', 'html': html}
    req = urllib.request.Request('https://api.resend.com/emails', data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    print('e-mail:', urllib.request.urlopen(req, timeout=60).status)


def main():
    if HOJE in SEM_PECAS:
        print('Véspera/dia de votação: nenhuma peça automática.'); return
    pasta = os.path.join(AQUI, 'saida', HOJE)
    os.makedirs(pasta, exist_ok=True)
    pauta = {'data': HOJE, 'gerado_em': datetime.datetime.utcnow().isoformat() + 'Z', 'itens': []}
    uploads = []
    for k, uf in enumerate(ufs_do_dia()):
        x = dados_uf(uf)
        pngs = asyncio.run(render(slides_uf(x), pasta, f'raiox_{uf}'))
        arquivos = [os.path.basename(p) for p in pngs]
        if k == 0:
            reel = montar_reel(pngs, roteiro_uf(x), pasta, f'raiox_{uf}')
            arquivos.append(os.path.basename(reel))
        for a in arquivos:
            uploads.append({'key': f's:{HOJE}/{a}', 'value': base64.b64encode(open(os.path.join(pasta, a), 'rb').read()).decode(), 'base64': True, 'expiration_ttl': 60 * 60 * 24 * 21})
        pauta['itens'].append({
            'id': f'raiox_{uf}', 'tipo': 'carrossel' + (' + reel' if k == 0 else ''), 'titulo': f"Raio-X da eleição {x['prep']} {x['nome']}",
            'redes': ['Instagram', 'TikTok'] + (['YouTube Shorts'] if k == 0 else []), 'horario': ['12h', '18h', '20h'][k % 3],
            'arquivos': arquivos, 'legenda': legenda_uf(x), 'dados': x, 'status': 'pendente',
        })
    for i in range(0, len(uploads), 50):
        kv_put_bulk(uploads[i:i + 50])
    kv_put_bulk([{'key': f'pauta:{HOJE}', 'value': json.dumps(pauta, ensure_ascii=False), 'expiration_ttl': 60 * 60 * 24 * 60}])
    print(json.dumps({'data': HOJE, 'itens': [i['id'] for i in pauta['itens']]}))
    email(pauta)


if __name__ == '__main__':
    main()
