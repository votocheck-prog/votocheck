"""VotoCheck — Reels narrado (12/10/2026): falas alternando voz feminina e masculina (Gemini TTS, chave sem
faturamento), trilha de fundo que abaixa quando entra a narração (sidechain) e zoom lento em cada tela.

Cada fala = 1 tela 1080x1920 (HTML renderizado) + 1 áudio. O áudio é gerado por fala (cache em audio/tts/)
para a tela trocar exatamente quando a frase muda. Narração por IA: a legenda leva "Narração gerada por IA".
Uso: python reel_narrado.py custo_voto cota
"""
import asyncio, hashlib, json, os, subprocess, sys, time, urllib.request, base64, wave
from playwright.async_api import async_playwright

KEY = [l.strip() for l in open('/mnt/user-data/uploads/VotoCheck/Adm/gemini_key.txt').read().splitlines() if l.strip()][-1]
MODELO = 'gemini-2.5-flash-preview-tts'
VOZ = {'F': 'Leda', 'M': 'Puck'}
ESTILO = {'F': 'Fale em português do Brasil, animada e direta, ritmo de vídeo curto de rede social:',
          'M': 'Fale em português do Brasil, com energia e confiança, ritmo de vídeo curto de rede social:'}
SONS = '/tmp/claude-0/sons'


def tts(texto, voz):
    os.makedirs('audio/tts', exist_ok=True)
    h = hashlib.sha1(f'{MODELO}|{VOZ[voz]}|{ESTILO[voz]}|{texto}'.encode()).hexdigest()[:16]
    saida = f'audio/tts/{h}.wav'
    if os.path.exists(saida):
        return saida
    body = {"contents": [{"parts": [{"text": f'{ESTILO[voz]} {texto}'}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOZ[voz]}}}}}
    for tent in range(6):
        req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent', data=json.dumps(body).encode(),
                                     headers={'x-goog-api-key': KEY, 'Content-Type': 'application/json'})
        try:
            r = json.load(urllib.request.urlopen(req, timeout=120))
            break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(65); continue
            raise SystemExit(f'TTS erro {e.code}: {e.read().decode()[:300]}')
    raw = base64.b64decode(r['candidates'][0]['content']['parts'][0]['inlineData']['data'])
    with wave.open(saida, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw)
    time.sleep(4)
    return saida


def ritmo(f, tempo=1.12):
    """Corta o silêncio das pontas e acelera a fala 12% sem mudar o tom (ritmo de Reels)."""
    saida = f.replace('.wav', f'_r{int(tempo*100)}.wav')
    if not os.path.exists(saida):
        sh('ffmpeg', '-y', '-loglevel', 'error', '-i', f, '-af',
           f'silenceremove=start_periods=1:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_threshold=-40dB,areverse,atempo={tempo}', saida)
    return saida


def dur(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).strip())


def sh(*a):
    subprocess.run(list(a), check=True)


async def render_telas(nome, htmls):
    os.makedirs('png', exist_ok=True)
    arqs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME'))
        pg = await b.new_page(viewport={'width': 1080, 'height': 1920})
        for i, h in enumerate(htmls, 1):
            n = f'reel_{nome}_{i:02d}'
            open(f'{n}.html', 'w', encoding='utf-8').write(h)
            await pg.goto('file://' + os.path.abspath(f'{n}.html')); await pg.wait_for_load_state('networkidle'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'png/{n}.png'); arqs.append(f'png/{n}.png')
        await b.close()
    return arqs


def montar(nome, falas, musica, folga=0.22):
    """falas: [{'voz': 'F'|'M', 'texto': str, 'html': str}]. Gera video/reel_<nome>.mp4."""
    os.makedirs('video', exist_ok=True)
    telas = asyncio.run(render_telas(nome, [f['html'] for f in falas]))
    auds = [ritmo(tts(f['texto'], f['voz'])) for f in falas]
    durs = [dur(a) + folga for a in auds]
    durs[-1] += 1.2  # respiro no fim, com a trilha subindo
    total = sum(durs)
    tmp = f'video/_tmp_{nome}'
    os.makedirs(tmp, exist_ok=True)
    # 1) cada tela vira um clipe com zoom lento (1.00 → 1.06)
    clipes = []
    for i, (t, d) in enumerate(zip(telas, durs)):
        c = f'{tmp}/c{i:02d}.mp4'; fr = int(round(d * 30))
        sh('ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-i', t, '-vf',
           f"scale=2160:-1,zoompan=z='min(1+0.06*on/{fr},1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s=1080x1920:fps=30,format=yuv420p",
           '-frames:v', str(fr), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', c)
        clipes.append(c)
    with open(f'{tmp}/lista.txt', 'w') as f:
        f.writelines(f"file '{os.path.basename(c)}'\n" for c in clipes)
    sh('ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', f'{tmp}/lista.txt', '-c', 'copy', f'{tmp}/video.mp4')
    # 2) narração: cada fala no início da sua tela
    entradas, filtros = [], []
    for i, (a, d) in enumerate(zip(auds, durs)):
        entradas += ['-i', a]
        inicio = int(sum(durs[:i]) * 1000)
        filtros.append(f'[{i}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={inicio}|{inicio}[n{i}]')
    filtros.append(''.join(f'[n{i}]' for i in range(len(auds))) + f'amix=inputs={len(auds)}:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=7[voz]')
    sh('ffmpeg', '-y', '-loglevel', 'error', *entradas, '-filter_complex', ';'.join(filtros), '-map', '[voz]', '-t', f'{total:.2f}', f'{tmp}/voz.wav')
    # 3) trilha: começa em 6 s (pula a introdução), volume base baixo, abaixa mais quando a voz entra, fades
    sh('ffmpeg', '-y', '-loglevel', 'error', '-ss', '6', '-t', f'{total:.2f}', '-i', f'{SONS}/{musica}.wav', '-i', f'{tmp}/voz.wav', '-filter_complex',
       f"[0:a]volume=0.32,afade=t=in:d=0.6,afade=t=out:st={total-1.2:.2f}:d=1.2[m];[1:a]asplit=2[v1][v2];"
       f"[m][v1]sidechaincompress=threshold=0.03:ratio=9:attack=15:release=350:makeup=1[md];"
       f"[md][v2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=9[mix]", '-map', '[mix]', '-ar', '44100', f'{tmp}/mix.wav')
    saida = f'video/reel_{nome}.mp4'
    sh('ffmpeg', '-y', '-loglevel', 'error', '-i', f'{tmp}/video.mp4', '-i', f'{tmp}/mix.wav', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', saida)
    print(nome, f'{total:.1f}s', saida, [round(x, 2) for x in durs])
    return saida, telas[0], total


if __name__ == '__main__':
    import reels_lote1
    for chave in sys.argv[1:]:
        r = reels_lote1.REELS[chave]
        montar(chave, r['falas'], r['musica'])
