"""VotoCheck — narração com Azure Speech (01/11/2026), padrão ValoraCheck (PROMPT_NARRACAO.md).

Vozes: Leila (+16%, didática), Yara (+26%, ritmo de rede social), Ava multilíngue (+8%, apresentadora).
A velocidade vai no SSML (nunca atempo depois). Cache por hash de (voz + velocidade + texto).
Chave: Adm/API_Token/azure_speech.txt (1ª linha). Região: brazilsouth (2ª linha opcional).
Uso:
  from tts_azure import falar, voz_por_tema
  mp3 = falar('Texto da cena.', 'yara')
"""
import hashlib, os, subprocess, urllib.request
from xml.sax.saxutils import escape

CHAVE_ARQ = os.environ.get('AZURE_SPEECH_FILE', '/mnt/user-data/uploads/VotoCheck/Adm/API_Token/azure_speech.txt')
CACHE = os.environ.get('TTS_CACHE', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio', 'azure'))
VOZES = {
    'leila': ('pt-BR-LeilaNeural', '+16%', False),
    'yara': ('pt-BR-YaraNeural', '+26%', False),
    'ava': ('en-US-AvaMultilingualNeural', '+8%', True),
}


def _cred():
    """Aceita o arquivo com a chave sozinha ou com rótulos/endpoint (pega a 1ª chave e a região, se houver)."""
    import re
    txt = open(CHAVE_ARQ, encoding='utf-8-sig').read()
    chaves = re.findall(r'\b[A-Za-z0-9]{32}\b|\b[A-Za-z0-9]{84}\b', txt)
    reg = re.search(r'https://([a-z0-9]+)\.(?:api\.cognitive|tts\.speech)', txt) or re.search(r'\b(brazilsouth|eastus2?|westeurope|southcentralus)\b', txt)
    return chaves[0], (reg.group(1) if reg else 'brazilsouth')


def voz_por_tema(titulo):
    """Mesma voz para o mesmo tema, alternando entre as 3 ao longo da série."""
    return ['leila', 'yara', 'ava'][int(hashlib.md5(titulo.encode()).hexdigest(), 16) % 3]


def ssml(texto, voz):
    nome, rate, multi = VOZES[voz]
    corpo = f'<prosody rate="{rate}">{escape(texto)}</prosody>'
    if multi:
        corpo = f'<lang xml:lang="pt-BR">{corpo}</lang>'
    return f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="pt-BR"><voice name="{nome}">{corpo}</voice></speak>'


def falar(texto, voz='yara'):
    """Devolve um WAV 48 kHz mono, sem silêncio nas pontas, da fala sintetizada (com cache)."""
    nome, rate, _ = VOZES[voz]
    os.makedirs(CACHE, exist_ok=True)
    h = hashlib.sha1(f'{nome}|{rate}|{texto}'.encode()).hexdigest()[:20]
    mp3, wav = os.path.join(CACHE, f'{h}.mp3'), os.path.join(CACHE, f'{h}.wav')
    if not os.path.exists(mp3):
        chave, regiao = _cred()
        req = urllib.request.Request(f'https://{regiao}.tts.speech.microsoft.com/cognitiveservices/v1', data=ssml(texto, voz).encode('utf-8'), headers={
            'Ocp-Apim-Subscription-Key': chave, 'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3', 'User-Agent': 'VotoCheck'})
        open(mp3, 'wb').write(urllib.request.urlopen(req, timeout=60).read())
    if not os.path.exists(wav):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-af',
                        'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,aresample=48000',
                        '-ar', '48000', '-ac', '1', wav], check=True)
    return wav


def duracao(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).strip())


def mixar(video_mudo, falas, inicios, musica_wav, saida, dur):
    """Voz (cada fala em `inicios` + 0,15 s) + trilha -20 LUFS com sidechain, final -14 LUFS, AAC 160k 48 kHz."""
    entradas, filtros = [], []
    for i, (f, t) in enumerate(zip(falas, inicios)):
        entradas += ['-i', f]
        ms = int((t + 0.15) * 1000)
        filtros.append(f'[{i + 2}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[f{i}]')
    filtros.append(''.join(f'[f{i}]' for i in range(len(falas))) + f'amix=inputs={len(falas)}:normalize=0,apad=whole_dur={dur}[voz]')
    filtros.append(f'[1:a]atrim=start=4,asetpts=PTS-STARTPTS,aloop=loop=-1:size=2147483647,atrim=0:{dur},aresample=48000,aformat=channel_layouts=stereo,'
                   f'loudnorm=I=-20:TP=-4:LRA=7,aresample=48000,afade=t=in:d=0.8,afade=t=out:st={max(dur - 1.8, 0):.2f}:d=1.8[m]')
    filtros.append('[voz]asplit=2[v][sc]')
    filtros.append('[m][sc]sidechaincompress=threshold=0.03:ratio=2.5:attack=30:release=600[md]')
    filtros.append('[v][md]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', video_mudo, '-i', musica_wav, *entradas, '-filter_complex', ';'.join(filtros),
                    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-t', f'{dur:.2f}', '-movflags', '+faststart', saida], check=True)
    return saida
