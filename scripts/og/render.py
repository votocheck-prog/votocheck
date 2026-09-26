import asyncio, json, os, sys
from playwright.async_api import async_playwright
cands=json.load(open('cands.json'))
lim=int(sys.argv[1]) if len(sys.argv)>1 else len(cands)
os.makedirs('out',exist_ok=True)
todo=[c for c in cands[:lim] if not os.path.exists(f"out/{c['id']}.jpg")]
async def worker(b, fila):
    pg=await b.new_page(viewport={'width':1200,'height':630})
    await pg.goto('file:///home/claude/og/tpl.html'); await pg.wait_for_load_state('networkidle'); await pg.evaluate('document.fonts.ready')
    while fila:
        c=fila.pop()
        await pg.evaluate('c=>window.set(c)', c)
        await pg.screenshot(path=f"out/{c['id']}.jpg", type='jpeg', quality=72)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        fila=list(todo)
        await asyncio.gather(*[worker(b,fila) for _ in range(6)])
        await b.close()
asyncio.run(main()); print('feito', len(todo))
