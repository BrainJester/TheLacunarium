import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
registerHooks({load(url, context, next) {
  if(url.endsWith('.ts')) return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};
  return next(url,context);
}});
const {isOwner,requireOwner}=await import('../base44/shared/security.ts');
const {roleForAccount}=await import('../base44/shared/profiles.ts');
const {validateIsland,writeIsland}=await import('../base44/shared/islands.ts');
const {validateRecord,improveRecord}=await import('../base44/shared/records.ts');
const {createIslandSession}=await import('../src/lib/islandPersistence.js');
const {calcHandScore}=await import('../src/lib/redQueenEngine.js');
const {readAppParams}=await import('../src/lib/app-params.js');
const valid={schemaVersion:1,grid:{'0,0':{sides:[0,1,-1,0],elevation:0}},loosePieces:[],clouds:[]};
function database(){
 const rows={OwnerAccount:[],IslandSave:[{id:'save',user_id:'user',created_date:'2026',revision:0,data:{},has_save:false}],Profile:[{id:'profile',user_id:'user',mass_record:10}]};
 const entities=Object.fromEntries(Object.entries(rows).map(([name,list])=>[name,{
 filter:async query=>structuredClone(list.filter(r=>Object.entries(query).every(([k,v])=>r[k]===v))),
 create:async data=>{const row={id:'created',...data};list.push(row);return row;},
 get:async id=>structuredClone(list.find(r=>r.id===id)),
 updateMany:async(query,update)=>{let updated=0;for(const row of list) if(Object.entries(query).every(([k,v])=>row[k]===v)){Object.assign(row,update.$set);for(const [k,v]of Object.entries(update.$max||{})) row[k]=Math.max(row[k]||0,v);updated++;}return{updated};}
 }]));return {asServiceRole:{entities},rows};
}
test('Only the verified owner email can bind ownership; name and stale admin flags cannot',async()=>{
 const db=database();
 const impostor={id:'bad',email:'other@example.com',is_verified:true};
 assert.equal(await roleForAccount(db,impostor,{profile_name:'branz',site_role:'admin'}),'user');
 await assert.rejects(requireOwner(db,impostor),e=>e.status===403);
 assert.equal(await isOwner(db,{id:'owner',email:'brandonkimball5000@gmail.com',is_verified:false}),false);
 assert.equal(await isOwner(db,{id:'owner',email:'brandonkimball5000@gmail.com',is_verified:true}),true);
 assert.equal(await isOwner(db,{id:'owner',email:'changed@example.com',is_verified:true}),true);
 assert.equal(await isOwner(db,{id:'other',email:'brandonkimball5000@gmail.com',is_verified:true}),false);
});
test('All sensitive entities reject direct browser writes and reads',()=>{
 for(const name of ['Profile','IslandSave','OwnerAccount','Presence']) assert.deepEqual(JSON.parse(readFileSync(new URL(`../base44/entities/${name}.jsonc`,import.meta.url))).rls,{read:false,create:false,update:false,delete:false});
});
test('Island validation accepts flat edges, rejects malformed saves and invalid edges',()=>{
 assert.equal(validateIsland(valid),valid);
 for(const data of [{...valid,schemaVersion:0},{...valid,grid:{}},{...valid,grid:{'0,0':{sides:[2,0,0,0],elevation:1}}},{...valid,clouds:[{x:Infinity,y:0,sides:[0,0,0,0]}]}])assert.throws(()=>validateIsland(data),e=>e.status===400);
});
test('Two simultaneous writes cannot overwrite each other; reset invalidates old writes',async()=>{
 const db=database(); const body={save_id:'save',revision:0};
 const results=await Promise.allSettled([writeIsland(db,'user',body,valid),writeIsland(db,'user',body,valid)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 await assert.rejects(writeIsland(db,'other',{save_id:'save',revision:1},valid));
 await writeIsland(db,'user',{save_id:'save',revision:1},null);
 assert.equal(db.rows.IslandSave[0].has_save,false);
 await assert.rejects(writeIsland(db,'user',{save_id:'save',revision:1},valid),e=>e.status===409);
});
test('Lower concurrent record submissions never reduce a best; invalid values rejected',async()=>{
 const db=database(),profile=db.rows.Profile[0];
 await Promise.all([improveRecord(db,profile,'mass_record',100),improveRecord(db,profile,'mass_record',20)]);
 assert.equal(profile.mass_record,100);
 for(const value of [-1,NaN,Infinity,1.5,20001,'50'])assert.throws(()=>validateRecord('mass_record',value));
 assert.throws(()=>validateRecord('site_role',1));
});
test('Failed loads cannot save a blank island',async()=>{
 const calls=[]; const session=createIslandSession(async name=>{calls.push(name);throw Error('offline');});
 await assert.rejects(session.load());await assert.rejects(session.save(valid));assert.deepEqual(calls,['loadMyIsland']);
});
test('Save and reset queue sends increasing revisions and stops permanently on conflict',async()=>{
 const calls=[];let conflict=false;
 const session=createIslandSession(async(name,data)=>{calls.push({name,data});if(name==='loadMyIsland')return{data:{save_id:'save',revision:0,data:null}};if(conflict)throw{status:409};return{data:{save_id:'save',revision:data.revision+1}};});
 await session.load();await Promise.all([session.save(valid),session.reset(),session.save(valid)]);
 assert.deepEqual(calls.slice(1).map(c=>c.data.revision),[0,1,2]);
 conflict=true;await assert.rejects(session.save(valid));const count=calls.length;await assert.rejects(session.save(valid));assert.equal(calls.length,count);
});
test('Card scoring keeps face cards and soft aces unchanged',()=>{
 assert.equal(calcHandScore([{rank:'A'},{rank:'K'}]),21);assert.equal(calcHandScore([{rank:'A'},{rank:'A'},{rank:'9'}]),21);assert.equal(calcHandScore([{rank:'Q'},{rank:'K'},{rank:'2'}]),22);
});
test('Stale clear-login flags cannot remove a new token; URL cannot change backend',()=>{
 const storage=new Map([['base44_clear_access_token','true'],['base44_access_token','signed-in']]);
 let finalURL;
 const browser={location:{search:'?app_id=attacker&app_base_url=https://evil.test&returnTo=%2Fprofile',pathname:'/login',hash:''},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},history:{replaceState:(_a,_b,url)=>{finalURL=url;}}};
 const result=readAppParams(browser,{VITE_BASE44_APP_ID:'real-app'});
 assert.equal(result.appId,'real-app');assert.equal(result.token,'signed-in');assert.equal(result.appBaseUrl,undefined);assert.equal(storage.has('base44_clear_access_token'),false);assert.equal(finalURL,'/login?returnTo=%2Fprofile');
 browser.location.search='?clear_access_token=true';assert.equal(readAppParams(browser,{}).token,undefined);
});

