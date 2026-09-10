import {env} from 'cloudflare:workers';
import {authenticated} from '@/lib/vita-auth';
import {initial,RecordItem} from '@/lib/vita-data';
function db(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
async function list(){const result=await db().prepare('SELECT data FROM records').all<{data:string}>();const map=new Map(initial.map(r=>[r.id,r]));for(const row of result.results){const r=JSON.parse(row.data);map.set(r.id,r)}return [...map.values()];}
const allowed=['client','entry','request','message','account','closing','statement'];
function stmt(r:RecordItem){return db().prepare('INSERT INTO records (id,kind,client,data,updated) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(r.id,r.kind,r.client,JSON.stringify(r),new Date().toISOString());}
async function save(r:RecordItem){await stmt(r).run();return r;}
const fail=(error:string,status=400)=>Response.json({error},{status});
const validDate=(s:any)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00Z').getTime())&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export async function GET(request:Request){try{
 if(!await authenticated())return fail('Sua sessão não está conectada. Entre para acessar os registros.',401);
 const file=new URL(request.url).searchParams.get('file');if(file){const record=(await list()).find(r=>r.id===file&&r.kind==='document');if(!record?.key)return new Response('Arquivo não encontrado',{status:404});const obj=await (env as any).BUCKET.get(record.key);if(!obj)return new Response('Arquivo não encontrado',{status:404});return new Response(obj.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(record.name)}`,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}})}
 return Response.json({records:await list()},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return fail('Não foi possível carregar os dados. Tente novamente.',503)}}
export async function POST(request:Request){try{
 if(!await authenticated())return fail('Sua sessão não está conectada. Entre para salvar os registros.',401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return fail('Origem não permitida.',403);
 const existing=await list();
 if(request.headers.get('content-type')?.includes('multipart/form-data')){
 const length=Number(request.headers.get('content-length'));if(length>11*1024*1024)return fail('O arquivo deve ter no máximo 10 MB.',413);
 const f=await request.formData(),file=f.get('file'),client=String(f.get('client')||'');if(!(file instanceof File)||file.size===0||file.size>10*1024*1024)return fail('Selecione um arquivo de até 10 MB.');if(!existing.some(r=>r.kind==='client'&&r.id===client))return fail('Cliente inválido.');const category=String(f.get('category')||'Outros');if(!['Extrato','Nota fiscal','Comprovante','Documentação','Contrato','Outros'].includes(category))return fail('Categoria inválida.');const id=crypto.randomUUID(),key='documents/'+id;await (env as any).BUCKET.put(key,file.stream());try{return Response.json({record:await save({id,kind:'document',client,name:file.name,size:file.size,key,category,date:new Date().toISOString().slice(0,10),status:'Recebido'})})}catch(e){await (env as any).BUCKET.delete(key);throw e}}
 const body=await request.json() as any,r=body.record as RecordItem;if(!r||!allowed.includes(r.kind)||typeof r.client!=='string'||JSON.stringify(r).length>30000)return fail('Dados inválidos.');r.id=r.id||crypto.randomUUID();if(typeof r.id!=='string'||r.id.length>180)return fail('Identificador inválido.');const old=existing.find(x=>x.id===r.id);if(old&&(old.kind!==r.kind||old.client!==r.client))return fail('Registro incompatível.');if(r.kind==='client')r.client=r.id;else if(r.kind==='account')r.client='all';else if(!existing.some(x=>x.kind==='client'&&x.id===r.client))return fail('Cliente inválido.');
 if(['entry','statement'].includes(r.kind)){
 if(!Number.isFinite(r.amount)||r.amount<=0||r.amount>1e12||!validDate(r.date))return fail('Informe valor positivo e data válida.');
 if(r.kind==='entry'&&(!['Receita','Despesa','Imposto','Distribuição de lucros'].includes(r.type)||!existing.some(x=>x.kind==='account'&&x.code===r.debit)||!existing.some(x=>x.kind==='account'&&x.code===r.credit)||r.debit===r.credit||!['Pago','Pendente'].includes(r.status)))return fail('Confira tipo, situação, débito e crédito.');
 if(existing.some(x=>x.kind==='closing'&&x.client===r.client&&[r.date.slice(0,7),old?.date?.slice(0,7)].includes(x.month)&&x.status==='Fechado'))return fail('Competência fechada. Reabra o mês antes de alterar lançamentos.',409);
 if(r.kind==='statement'&&r.matched){const match=existing.find(x=>x.kind==='entry'&&x.id===r.matched&&x.client===r.client&&x.amount===r.amount&&x.type===r.type);if(!match||existing.some(x=>x.kind==='statement'&&x.id!==r.id&&x.matched===r.matched))return fail('Lançamento incompatível ou já conciliado.');}
 }
 if(r.kind==='message'&&(!r.text?.trim()||r.text.length>4000||!['Contador','Profissional'].includes(r.sender)))return fail('Escreva uma mensagem de até 4.000 caracteres.');
 if(r.kind==='message')r.date=new Date().toISOString();
 if(['client','request','entry','account'].includes(r.kind)&&(!r.name?.trim()||r.name.length>250))return fail('Informe um nome ou descrição de até 250 caracteres.');
 if(r.kind==='request'&&(!validDate(r.due)||!['Pendente','Concluído'].includes(r.status)))return fail('Confira prazo e situação.');
 if(r.kind==='closing'&&(!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)||!['Aberto','Fechado'].includes(r.status)))return fail('Competência inválida.');
 if(r.kind==='closing')r.id='closing-'+r.client+'-'+r.month;
 if(r.kind==='client'&&(!['PF','PJ'].includes(r.type)||!['Ativo','Inativo'].includes(r.status)))return fail('Confira o tipo e a situação do cliente.');
 if(r.kind==='account'){if(!r.code||!['Ativo','Passivo','Patrimônio líquido','Receita','Despesa'].includes(r.group)||existing.some(x=>x.kind==='account'&&x.id!==r.id&&x.code===r.code))return fail('Código de conta inválido ou já cadastrado.');if(old&&r.code!==old.code&&existing.some(x=>x.kind==='entry'&&(x.debit===old.code||x.credit===old.code)))return fail('Uma conta utilizada não pode ter seu código alterado.');}
 return Response.json({record:await save(r)});
 }catch(e){console.error(e);return fail('Não foi possível salvar. Seus dados foram mantidos no formulário.',503)}}

