import re,json,urllib.request,base64,sys,wave
txt=open('/mnt/user-data/uploads/VotoCheck/Adm/gemini_key.txt').read()
KEY=[l.strip() for l in txt.splitlines() if l.strip()][-1]
def tts(texto, saida, voz='Kore', modelo='gemini-2.5-flash-preview-tts', estilo=None):
    prompt=(estilo+': ' if estilo else '')+texto
    body={"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":voz}}}}}
    req=urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent',data=json.dumps(body).encode(),headers={'x-goog-api-key':KEY,'Content-Type':'application/json'})
    try: r=json.load(urllib.request.urlopen(req,timeout=120))
    except urllib.error.HTTPError as e: return 'ERRO '+str(e.code)+' '+e.read().decode()[:400]
    part=r['candidates'][0]['content']['parts'][0]['inlineData']
    raw=base64.b64decode(part['data'])
    if 'wav' in (part.get('mimeType') or ''):
        open(saida,'wb').write(raw)
    else:
        with wave.open(saida,'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw)
    return part.get('mimeType')
if __name__=='__main__':
    print(tts(sys.argv[1], sys.argv[2], modelo=sys.argv[3] if len(sys.argv)>3 else 'gemini-2.5-flash-preview-tts'))
