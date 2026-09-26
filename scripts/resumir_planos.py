"""Resume as propostas de governo 2026 (presidente e governador) registradas no TSE.

Entrada: pasta com proposta_governo_2026_<UF>.zip (Portal de Dados Abertos do TSE). Cada PDF se chama
2026<UF><SQ_CANDIDATO>_<NN>.pdf. Para cada candidatura: extrai o texto (pdftotext) ou, se o PDF for
escaneado, manda o próprio PDF ao Gemini; pede um resumo neutro com as principais propostas por tema;
grava em plano_governo (migração 0010) e sobe os PDFs originais ao KV (plano:<arquivo>) para o link.
Uso: CF_TOKEN=... GEMINI_API_KEY=... python3 scripts/resumir_planos.py /pasta/propostas saida.json
"""
import os, sys, re, json, zipfile, subprocess, base64, time, tempfile, urllib.request, urllib.error
PASTA, SAIDA = sys.argv[1], sys.argv[2]
K = os.environ['GEMINI_API_KEY']; MODELO = 'gemini-3.8-flash'
INSTR = '''Você resume planos de governo de candidatos para eleitores leigos, com neutralidade total.
Leia o documento oficial registrado no TSE e responda SÓ um JSON:
{"resumo": "2 frases, no máximo 45 palavras, dizendo o foco geral do plano, sem adjetivos de valor",
 "propostas": [{"tema": "Saúde|Educação|Segurança|Economia e emprego|Impostos e contas públicas|Infraestrutura e transporte|Meio ambiente|Assistência social|Habitação|Agro|Cultura e esporte|Gestão pública|Direitos e cidadania|Outros", "texto": "1 frase curta com uma proposta concreta do documento"}],
 "concreto": "alto|medio|baixo"}
Regras: de 4 a 7 propostas, as mais concretas e mais destacadas no próprio documento; parafraseie sem inventar e sem avaliar; não use o nome do candidato nem do partido; se o documento for genérico, diga isso no resumo e marque "concreto": "baixo". "concreto" mede se há metas, números ou ações específicas.'''
def gemini(partes):
    body = {'contents': [{'role': 'user', 'parts': partes}], 'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.2}}
    for t in range(5):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent', data=json.dumps(body).encode(), headers={'x-goog-api-key': K, 'Content-Type': 'application/json'}), timeout=240))
            return json.loads(r['candidates'][0]['content']['parts'][0]['text'])
        except urllib.error.HTTPError as e:
            print('  http', e.code, e.read()[:200]); time.sleep(65 if e.code in (429, 503) else 8)
        except Exception as e:
            print('  erro', e); time.sleep(8)
    return None
saida = json.load(open(SAIDA)) if os.path.exists(SAIDA) else {}
grupos = {}
for nome in sorted(os.listdir(PASTA)):
    if not nome.endswith('.zip'): continue
    z = zipfile.ZipFile(os.path.join(PASTA, nome))
    for arq in z.namelist():
        m = re.search(r'2026([A-Z]{2})(\d+)_(\d+)\.pdf$', arq, re.I)
        if m: grupos.setdefault(m.group(2), []).append((nome, arq, m.group(1)))
print('candidaturas com plano:', len(grupos))
for sq, arqs in grupos.items():
    if sq in saida: continue
    textos, pdfs = [], []
    for zipnome, arq, uf in sorted(arqs, key=lambda x: x[1]):
        dados = zipfile.ZipFile(os.path.join(PASTA, zipnome)).read(arq)
        with tempfile.NamedTemporaryFile(suffix='.pdf') as f:
            f.write(dados); f.flush()
            txt = subprocess.run(['pdftotext', '-layout', f.name, '-'], capture_output=True, text=True).stdout
        textos.append(txt); pdfs.append(dados)
    texto = '\n'.join(textos)
    if len(texto.strip()) > 1500:
        partes = [{'text': INSTR + '\n\nDOCUMENTO:\n' + texto[:180000]}]
    else:
        pequenos = [p for p in pdfs if len(p) < 18_000_000][:2]
        if not pequenos: print(sq, 'sem texto e PDF grande demais'); continue
        partes = [{'text': INSTR}] + [{'inline_data': {'mime_type': 'application/pdf', 'data': base64.b64encode(p).decode()}} for p in pequenos]
    j = gemini(partes)
    if not j: print(sq, 'falhou'); continue
    j['uf'] = arqs[0][2]; j['arquivos'] = [a[1].split('/')[-1] for a in sorted(arqs, key=lambda x: x[1])]; j['chars'] = len(texto)
    saida[sq] = j; json.dump(saida, open(SAIDA, 'w'), ensure_ascii=False, indent=1)
    print(sq, j['uf'], j.get('concreto'), len(j.get('propostas', [])))
    time.sleep(2)
print('ok', len(saida))
