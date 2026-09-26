import json,subprocess,os,sys
from tts import tts
ESTILO='Leia em português do Brasil, com tom claro, confiante e acolhedor, ritmo dinâmico de vídeo curto, sem exagero'
ROTEIROS={
 '2709_6votos':[
  'São seis votos na urna. Você sabe os seis?',
  'A ordem é esta: deputado federal, deputado estadual, dois votos para senador, governador e presidente.',
  'Para deputado federal, são quase oito mil candidatos, para quinhentas e treze vagas.',
  'Para deputado estadual, mais de onze mil candidatos.',
  'E para o Senado, desta vez, são dois votos. Escolha dois nomes diferentes.',
  'Governador e presidente são só dois dos seus seis votos.',
  'Dica: leve a cola em papel. O celular não entra na cabine.',
  'Confira os candidatos do seu estado e monte sua cola em votocheck ponto com ponto bê erre.'],
 '2809_quociente':[
  'Seu voto em deputado pode eleger outra pessoa.',
  'Funciona assim: o voto soma primeiro para o partido ou federação. O partido ganha as vagas, e elas vão para os mais votados da lista.',
  'Em dois mil e dois, os votos de um só deputado levaram mais cinco colegas à Câmara.',
  'Hoje existe um piso de votos próprios. Mas o seu voto ainda ajuda a lista inteira.',
  'Antes de votar, veja quem está na lista do seu candidato.',
  'Confira em votocheck ponto com ponto bê erre.'],
}
def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]).strip())
for g,linhas in ROTEIROS.items():
    os.makedirs(f'audio/{g}',exist_ok=True)
    ds=[]
    for i,t in enumerate(linhas,1):
        f=f'audio/{g}/{i:02d}.wav'
        if not os.path.exists(f):
            import time
            for tent in range(6):
                r=tts(t,f,voz='Charon',modelo='gemini-3.8-flash-tts',estilo=None)
                if not str(r).startswith('ERRO 429'): break
                time.sleep(65)
            if str(r).startswith('ERRO'): print(g,i,r[:200]); sys.exit(1)
            time.sleep(7)
        ds.append(dur(f))
    json.dump(ds,open(f'audio/{g}/dur.json','w'))
    print(g,[round(x,2) for x in ds])
