import { DB, getTotalQueries } from './d1_shim.mjs';
import { coletarDeputados } from '../src/collectors/camara.js';
import { coletarSenadores } from '../src/collectors/senado.js';

const env = { DB };

const acao = process.argv[2];

async function main() {
  if (acao === 'deputados') {
    console.log('[run] coletarDeputados(57)...');
    const r = await coletarDeputados(env, 57);
    console.log('[run] resultado:', JSON.stringify(r));
  } else if (acao === 'senadores') {
    console.log('[run] coletarSenadores()...');
    const r = await coletarSenadores(env);
    console.log('[run] resultado:', JSON.stringify(r));
  } else {
    console.error('uso: node run_camara_senado.mjs deputados|senadores');
    process.exit(1);
  }
  console.log('[run] total de queries D1:', getTotalQueries());
}

main().catch((e) => {
  console.error('[run] erro fatal:', e);
  process.exit(1);
});
