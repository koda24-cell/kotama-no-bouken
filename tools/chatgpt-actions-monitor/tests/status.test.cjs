const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../status.js');

test('chat ids only from allowed origins', () => {
  assert.equal(S.conversationId('https://chatgpt.com/c/12345678-abcd'), '12345678-abcd');
  assert.equal(S.conversationId('https://chatgpt.com/g/g-123/c/12345678-abcd'), '12345678-abcd');
  assert.equal(S.conversationId('https://evil.test/c/12345678-abcd'), null);
});
test('repo validation', () => {
  assert.equal(S.validRepo('koda24-cell/kotama-no-bouken'), true);
  assert.equal(S.validRepo('bad/repo/extra'), false);
  assert.equal(S.validRepo('../repo'), false);
});
test('classification', () => {
  assert.equal(S.classify({name:'Candidate asset safety audit'}), 'safety');
  assert.equal(S.classify({name:'Shared 3D GLB Performance Audit'}), 'performance');
  assert.equal(S.classify({name:'B5 Blender Render'}), 'render');
});
test('latest workflow run wins over old failure', () => {
  const runs = [
    {id:1,path:'.github/workflows/render.yml',created_at:'2026-11-19T01:00:00Z',status:'completed',conclusion:'failure'},
    {id:2,path:'.github/workflows/render.yml',created_at:'2026-11-19T02:00:00Z',status:'completed',conclusion:'success'},
    {id:3,path:'.github/workflows/scan.yml',created_at:'2026-11-19T03:00:00Z',status:'in_progress'}
  ];
  const latest = S.newestPerWorkflow(runs);
  assert.deepEqual(latest.map(r => r.id), [3,2]);
  assert.deepEqual(S.summarize(latest).state, 'running');
  assert.equal(S.summarize(latest).active, 1);
});
test('error and missing runs are unknown', () => {
  assert.equal(S.summarize([],'rate limited').state, 'unknown');
  assert.equal(S.runState({status:'completed',conclusion:'skipped'}), 'unknown');
});
test('workflow/category filtering', () => {
  const run = {name:'Floor6 Blender Render',path:'.github/workflows/f6-render.yml'};
  assert.equal(S.matchRun(run,{workflow:'f6-render',category:'render'}), true);
  assert.equal(S.matchRun(run,{workflow:'f6-render',category:'safety'}), false);
});
