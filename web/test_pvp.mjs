import { io } from 'socket.io-client';

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

async function runMatchmakeTest(serverUrl, mode){
  console.log(`\n== Matchmaking (queue) test, mode=${mode} ==`);
  const s1 = io(serverUrl, { transports: ['websocket'], reconnection: false });
  const s2 = io(serverUrl, { transports: ['websocket'], reconnection: false });

  const events = [];
  function hook(s, name){ s.onAny((e,p)=>{ events.push({who:name,event:e,payload:p}); console.log(name,'<-',e, JSON.stringify(p)); }); }
  hook(s1,'S1'); hook(s2,'S2');

  await new Promise((res)=>{ s1.once('connect', ()=>{ s1.emit('HELLO',{name:'Alice'}); s1.emit('JOIN_QUEUE',{mode}); if(s1.connected) console.log('S1 connected'); }); s2.once('connect', ()=>{ s2.emit('HELLO',{name:'Bob'}); s2.emit('JOIN_QUEUE',{mode}); if(s2.connected) console.log('S2 connected'); }); s1.once('MATCH_FOUND', ()=>res()); setTimeout(res,5000);
  });

  await wait(500);
  const mf = events.find(e=>e.event==='MATCH_FOUND');
  const roomId = mf?.payload?.roomId;
  s1.emit('READY',{roomId});
  s2.emit('READY',{roomId});

  s1.on('ROUND_START', (msg)=>{
    console.log('S1 ROUND_START');
    setTimeout(()=>{ s1.emit('SUBMIT_ANSWER',{ roomId: msg.roomId, answer: { teamA: msg.round?.correct?.teamA || 'X', teamB: msg.round?.correct?.teamB || 'Y', score: (msg.round?.correct?.score || '1-0') } }); }, 500);
  });
  s2.on('ROUND_START', (msg)=>{
    console.log('S2 ROUND_START');
    setTimeout(()=>{ s2.emit('SUBMIT_ANSWER',{ roomId: msg.roomId, answer: { teamA: 'Wrong', teamB: 'Team', score: '0-0' } }); }, 800);
  });

  await new Promise((res)=>{ s1.once('GAME_END', (m)=>{ console.log('GAME_END received'); res(); }); setTimeout(res,20000); });

  s1.close(); s2.close();
}

async function runInviteRoomTest(serverUrl, mode){
  console.log(`\n== Create/Join room (invite) test, mode=${mode} ==`);
  const host = io(serverUrl, { transports:['websocket'], reconnection:false });
  await new Promise(r=>host.once('connect', r));
  host.emit('HELLO',{name:'Host'});

  let created = null;
  host.on('ROOM_CREATED',(m)=>{ created = m; console.log('ROOM_CREATED', m); });
  host.emit('CREATE_ROOM', {mode});
  await wait(500);
  if(!created){ console.warn('No ROOM_CREATED event'); }
  const code = created?.code;

  const guest = io(serverUrl, { transports:['websocket'], reconnection:false });
  await new Promise(r=>guest.once('connect', r));
  guest.emit('HELLO',{name:'Guest'});
  await wait(200);
  if(code) guest.emit('JOIN_ROOM',{ code });

  await new Promise((res)=>{ guest.once('MATCH_FOUND', (m)=>{ console.log('Guest MATCH_FOUND', m); res(); }); setTimeout(res,5000); });

  // request room state and ready
  host.once('ROOM_STATE',(rs)=>{ console.log('HOST ROOM_STATE', rs); if(rs.roomId){ host.emit('READY',{roomId: rs.roomId}); guest.emit('READY',{roomId: rs.roomId}); } });
  host.emit('GET_ROOM_STATE',{ roomId: created?.roomId });

  await wait(5000);
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
