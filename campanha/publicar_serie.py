"""VotoCheck — publica a série "Eleitos 2026 · [UF]" (08/10/2026).

1. Confere se /eleitos/<uf> está no ar (sem isso o link do post cai em 404: aborta).
2. Sobe os PNGs para o KV (chave s:<data>/<arquivo>, servidos em /midia/<data>/<arquivo>).
3. Confere cada URL pública (GET 200 image/png).
4. Agenda no Buffer: Instagram (carrossel) + TikTok (carrossel de fotos).

Uso: CF_TOKEN=... BUFFER_API_KEY=... python publicar_serie.py serie_eleitos.json "sp=2026-10-08T12:00" "mg=2026-10-08T18:00" ...
Horários em Brasília. Pasta das imagens: a do JSON (png/...).
ATENÇÃO: cada execução cria posts novos no Buffer. Rodar duas vezes = post duplicado.
"""
import base64, datetime, json, os, sys, time, urllib.error, urllib.request

ACC = '22688effbd9ab181498d04ccd2cc8d2e'
KV = '58aea9d36a9c4055bbcff72f7c08c3bd'
TOK = os.environ['CF_TOKEN'].strip()
BUF = os.environ['BUFFER_API_KEY'].strip()
SITE = 'https://votocheck.com.br'
UA = {'User-Agent': 'VotoCheck-serie/1.0'}
NOMES = {'sp': 'São Paulo', 'mg': 'Minas Gerais', 'rj': 'Rio de Janeiro'}


def http(url, data=None, method=None, headers=None, timeout=120):
    req = urllib.request.Request(url, data=data, method=method, headers={**UA, **(headers or {})})
    return urllib.request.urlopen(req, timeout=timeout)


def buffer_gql(q, v=None):
    r = json.load(http('https://api.buffer.com', json.dumps({'query': q, 'variables': v or {}}).encode(), headers={'Authorization': 'Bearer ' + BUF, 'Content-Type': 'application/json'}))
    if r.get('errors'):
        raise RuntimeError(json.dumps(r['errors'])[:400])
    return r['data']


def canais():
    out = {}
    for o in buffer_gql('query { account { organizations { id } } }')['account']['organizations']:
        for c in buffer_gql('query C($o: OrganizationId!) { channels(input: { organizationId: $o }) { id service } }', {'o': o['id']})['channels']:
            out.setdefault(c['service'].lower(), c['id'])
    return out


def main():
    serie = json.load(open(sys.argv[1], encoding='utf-8'))  # no Windows o padrão é cp1252: quebrava acentos
    base = os.path.dirname(os.path.abspath(sys.argv[1]))
    agenda = dict(a.split('=', 1) for a in sys.argv[2:])
    cs = canais()
    for uf, quando in agenda.items():
        destino = f'{SITE}/eleitos/{uf}' if len(uf) == 2 else SITE + serie[uf].get('link', '/')
        st = http(destino).status
        if st != 200:
            raise SystemExit(f'{destino} respondeu {st}: faça o deploy antes de publicar.')
        dia = quando[:10]
        arqs = serie[uf]['arquivos']
        itens = [{'key': f's:{dia}/{os.path.basename(a)}', 'value': base64.b64encode(open(os.path.join(base, a), 'rb').read()).decode(), 'base64': True, 'expiration_ttl': 60 * 60 * 24 * 30} for a in arqs]
        r = json.load(http(f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{KV}/bulk', json.dumps(itens).encode(), 'PUT', {'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'}, 300))
        assert r.get('success'), r
        urls = [f'{SITE}/midia/{dia}/{os.path.basename(a)}' for a in arqs]
        # 08/10: o KV leva alguns segundos para propagar; a 1ª leitura logo após gravar pode dar 404.
        for u in urls:
            for tentativa in range(12):
                try:
                    resp = http(u)
                    if resp.status == 200 and resp.headers.get('Content-Type') == 'image/png':
                        break
                except urllib.error.HTTPError:
                    pass
                time.sleep(10)
            else:
                raise SystemExit(f'Mídia não ficou pública a tempo: {u}')
        due = (datetime.datetime.fromisoformat(quando) + datetime.timedelta(hours=3)).strftime('%Y-%m-%dT%H:%M:00.000Z')
        titulo = serie[uf].get('titulo') or f'Eleitos 2026 · {NOMES.get(uf, uf.upper())}'
        for rede in ('instagram', 'tiktok'):
            entrada = {'text': serie[uf]['legenda'], 'channelId': cs[rede], 'schedulingType': 'automatic', 'mode': 'customScheduled', 'dueAt': due,
                       'assets': [{'image': {'url': u}} for u in urls]}
            entrada['metadata'] = {'instagram': {'type': 'post', 'shouldShareToFeed': True}} if rede == 'instagram' else {'tiktok': {'title': titulo[:90]}}
            d = buffer_gql('mutation P($i: CreatePostInput!) { createPost(input: $i) { ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }', {'i': entrada})['createPost']
            print(uf, rede, d)


if __name__ == '__main__':
    main()
