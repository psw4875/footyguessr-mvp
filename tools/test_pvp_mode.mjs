import { io } from 'socket.io-client';

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

function hookAll(s, label){
  const events = [];
  s.onAny((e,p)=>{ events.push({ who: label, event: e, payload: p }); console.log(label,'<-',e, JSON.stringify(p)); });
  return events;
}

async function runMatchmakeTest(serverUrl, mode){
  console.log(`\n== Matchmaking (queue) test, mode=${mode} ==`);
  const s1 = io(serverUrl, { transports: ['websocket'], reconnection: false });
  const s2 = io(serverUrl, { transports: ['websocket'], reconnection: false });

  const events = [];
  function hook(s, name){ s.onAny((e,p)=>{ events.push({who:name,event:e,payload:p}); console.log(name,'<-',e, JSON.stringify(p)); }); }
  hook(s1,'S1'); hook(s2,'S2');

  await new Promise((res)=>{
    s1.once('connect', ()=>{ s1.emit('HELLO',{name:'Alice'}); s1.emit('JOIN_QUEUE',{ mode }); if(s1.connected) console.log('S1 connected'); });
    s2.once('connect', ()=>{ s2.emit('HELLO',{name:'Bob'}); s2.emit('JOIN_QUEUE',{ mode }); if(s2.connected) console.log('S2 connected'); });
    s1.once('MATCH_FOUND', ()=>res());
    setTimeout(res,5000);
  });

  // READY after brief delay once MATCH_FOUND and ROOM_STATE flow
  await wait(500);
  const roomId = events.find(e=>e.event==='MATCH_FOUND')?.payload?.roomId;
  s1.emit('READY',{roomId});
  s2.emit('READY',{roomId});

  s1.on('ROUND_START', (msg)=>{
    setTimeout(()=>{ s1.emit('SUBMIT_ANSWER',{ roomId: msg.roomId, answer: { teamA: msg.round?.correct?.teamA || 'X', teamB: msg.round?.correct?.teamB || 'Y', score: (msg.round?.correct?.score || '1-0') } }); }, (msg.round?.durationMs?500:1000));
  });
  s2.on('ROUND_START', (msg)=>{
    setTimeout(()=>{ s2.emit('SUBMIT_ANSWER',{ roomId: msg.roomId, answer: { teamA: 'Wrong', teamB: 'Team', score: '0-0' } }); }, (msg.round?.durationMs?800:1200));
  });

  await new Promise((res)=>{ s1.once('GAME_END', ()=>res()); setTimeout(res,20000); });
  s1.close(); s2.close();
}

async function runInviteRoomTest(serverUrl, mode){
  console.log(`\n== Invite room test, mode=${mode} ==`);
  const host = io(serverUrl, { transports:['websocket'], reconnection:false });
  await new Promise(r=>host.once('connect', r));
  host.emit('HELLO',{name:'Host'});

  let roomMeta = null;
  host.once('ROOM_CREATED', (m)=>{ console.log('ROOM_CREATED', m); roomMeta = m; });
  host.emit('CREATE_ROOM', { mode });
  await wait(500);
  const code = roomMeta?.code;

  const guest = io(serverUrl, { transports:['websocket'], reconnection:false });
  await new Promise(r=>guest.once('connect', r));
  guest.emit('HELLO',{name:'Guest'});
  if(code){ guest.emit('JOIN_ROOM',{ code }); }

  let roomId = null;
  await new Promise((res)=>{
    guest.once('MATCH_FOUND', (m)=>{ console.log('Guest MATCH_FOUND', m); roomId = m.roomId; res(); });
    setTimeout(res,5000);
  });

  host.emit('READY',{roomId});
  guest.emit('READY',{roomId});

  host.on('ROUND_START', (msg)=>{
    setTimeout(()=>{ host.emit('SUBMIT_ANSWER',{ roomId: msg.roomId, answer: { teamA: msg.round?.correct?.teamA || 'X', teamB: msg.round?.correct?.teamB || 'Y', score: (msg.round?.correct?.score || '1-0') } }); }, (msg.round?.durationMs?500:1000));
  });
  guest.on('ROUND_START', (msg)=>{
    setTimeout(()=>{ guest.emit('SUBMIT_ANSWER',{ roomId: msg.roomId, answer: { teamA: 'Wrong', teamB: 'Team', score: '0-0' } }); }, (msg.round?.durationMs?800:1200));
  });

  await new Promise((res)=>{ host.once('GAME_END', ()=>res()); setTimeout(res,20000); });
  host.close(); guest.close();
}

async function main(){
  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:4001';
  const mode = (process.env.TEST_MODE || 'ALL').toUpperCase();
  try{
    await runMatchmakeTest(serverUrl, mode);
    await wait(500);
    await runInviteRoomTest(serverUrl, mode);
    console.log('\nAll tests done');
  }catch(e){ console.error('Test error', e); process.exitCode = 2; }
}

main();
