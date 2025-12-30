import { io } from 'socket.io-client';

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

async function runMatchmakeTest(serverUrl){
  console.log('\n== Matchmaking (queue) test ==');
  const s1 = io(serverUrl, { transports: ['websocket'], reconnection: false });
  const s2 = io(serverUrl, { transports: ['websocket'], reconnection: false });

  const events = [];
  function hook(s, name){ s.onAny((e,p)=>{ events.push({who:name,event:e,payload:p}); console.log(name,'<-',e, JSON.stringify(p)); }); }
  hook(s1,'S1'); hook(s2,'S2');

  await new Promise((res)=>{ s1.once('connect', ()=>{ s1.emit('HELLO',{name:'Alice'}); s1.emit('JOIN_QUEUE'); if(s1.connected) console.log('S1 connected'); }); s2.once('connect', ()=>{ s2.emit('HELLO',{name:'Bob'}); s2.emit('JOIN_QUEUE'); if(s2.connected) console.log('S2 connected'); }); s1.once('MATCH_FOUND', ()=>res()); setTimeout(res,5000);
  });

  // wait for ROOM_STATE then READY
  await wait(500);
  s1.emit('READY',{roomId:events.find(e=>e.event==='MATCH_FOUND')?.payload?.roomId});
  s2.emit('READY',{roomId:events.find(e=>e.event==='MATCH_FOUND')?.payload?.roomId});

  // on ROUND_START, submit answers after countdown
  s1.on('ROUND_START', (msg)=>{
    console.log('S1 ROUND_START');
    setTimeout(()=>{ s1.emit('SUBMIT_ANSWER',{ roomId: msg.roomId, answer: { teamA: msg.round?.correct?.teamA || 'X', teamB: msg.round?.correct?.teamB || 'Y', score: (msg.round?.correct?.score || '1-0') } }); }, (msg.round?.durationMs?500:1000));
  });
  s2.on('ROUND_START', (msg)=>{
    console.log('S2 ROUND_START');
    setTimeout(()=>{ s2.emit('SUBMIT_ANSWER',{ roomId: msg.roomId, answer: { teamA: 'Wrong', teamB: 'Team', score: '0-0' } }); }, (msg.round?.durationMs?800:1200));
  });

  await new Promise((res)=>{ s1.once('GAME_END', (m)=>{ console.log('GAME_END received'); res(); }); setTimeout(res,20000); });

  s1.close(); s2.close();
}

async function runInviteRoomTest(serverUrl){
  console.log('\n== Create/Join room (invite) test ==');
  const host = io(serverUrl, { transports:['websocket'], reconnection:false });
  await new Promise(r=>host.once('connect', r));
  host.emit('HELLO',{name:'Host'});

  await new Promise((res)=>{ host.once('ROOM_CREATED', (m)=>{ console.log('ROOM_CREATED', m); res(m); }); host.emit('CREATE_ROOM'); setTimeout(()=>res(null),3000); });

  // get code via ROOM_CREATED event
  let code = null;
  host.on('ROOM_CREATED',(m)=>{ code = m.code; });
  await wait(200);
  if(!code){ console.warn('No code from host events; trying GET_ROOM_STATE flow'); }

  // guest joins
  const guest = io(serverUrl, { transports:['websocket'], reconnection:false });
  await new Promise(r=>guest.once('connect', r));
  guest.emit('HELLO',{name:'Guest'});
  await wait(200);
  if(code){ guest.emit('JOIN_ROOM',{ code }); }
  else { console.warn('Skipping guest join, no code'); guest.close(); host.close(); return; }

  await new Promise((res)=>{ guest.once('MATCH_FOUND', (m)=>{ console.log('Guest MATCH_FOUND', m); res(); }); setTimeout(res,5000); });

  // both ready
  host.emit('READY',{roomId: Array.from(new Set([])).values()});
  // Instead, request room state to find roomId
  await wait(200);
  // request GET_ROOM_STATE via host (server should send ROOM_STATE)
  // find room id from events captured earlier (none), so just call ROOM_STATE by querying server via event
  // simplistic: find rooms by listening on ROOM_STATE
  host.once('ROOM_STATE',(rs)=>{ console.log('HOST ROOM_STATE', rs); if(rs.roomId){ host.emit('READY',{roomId: rs.roomId}); guest.emit('READY',{roomId: rs.roomId}); }
  });
  host.emit('GET_ROOM_STATE',{ roomId: null });

  await wait(5000);
  host.close(); guest.close();
}

async function main(){
  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:4001';
  try{
    await runMatchmakeTest(serverUrl);
    await wait(500);
    await runInviteRoomTest(serverUrl);
    console.log('\nAll tests done');
  }catch(e){ console.error('Test error', e); process.exitCode = 2; }
}

main();
