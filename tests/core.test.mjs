import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateInput,MAX_PHOTO_SIZE,filterResults,summarize,makeExport,createRunGate} from '../docs/assets/core.js';
const data=JSON.parse(await readFile(new URL('../docs/data/demo.json',import.meta.url)));
test('international phone accepts formatting and rejects missing prefix, letters, invalid length',()=>{
  assert.equal(validateInput('phone','+1 (202) 555-0142'),'');
  for(const value of ['', '2025550142', '+0123456789', '+123', '+1234567890123456', '+1234abc567']) assert.notEqual(validateInput('phone',value),'');
});
test('email validates structure without claiming mailbox existence',()=>{
  assert.equal(validateInput('email',' example@example.org '),'');
  for(const value of ['', 'name', 'a@b', 'a b@example.org','a@@example.org']) assert.notEqual(validateInput('email',value),'');
});
test('photo rejects unsupported, empty, oversized and missing files',()=>{
  assert.equal(validateInput('photo','',{type:'image/png',size:100}),'');
  assert.equal(validateInput('photo','',{demo:true}),'');
  for(const file of [null,{type:'image/svg+xml',size:10},{type:'image/png',size:0},{type:'image/png',size:MAX_PHOTO_SIZE+1}]) assert.notEqual(validateInput('photo','',file),'');
});
test('filters and summary keep verified and unverified separate',()=>{
  assert.deepEqual(summarize(data.phone),{total:3,verified:2,unverified:1});
  assert.equal(filterResults(data.phone,'unverified').length,1);
  assert.equal(filterResults(data.phone,'verified').length,2);
  assert.equal(filterResults([],'all').length,0);
});
test('exports are marked synthetic and do not include the entered query or file',()=>{
  const exported=makeExport('photo',data.photo);
  assert.equal(exported.mode,'demo');assert.equal(exported.containsRealFindings,false);
  assert.ok(!('query' in exported));assert.ok(!('file' in exported));
  assert.deepEqual(exported.results,data.photo);assert.notEqual(exported.results[0],data.photo[0]);
});
test('stale response is cancelled by a newer query or tab change',()=>{
  const gate=createRunGate(),first=gate.next(),second=gate.next();
  assert.equal(gate.isCurrent(first),false);assert.equal(gate.isCurrent(second),true);
  gate.cancel();assert.equal(gate.isCurrent(second),false);
});

