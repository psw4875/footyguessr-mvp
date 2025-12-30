import { io } from 'socket.io-client';

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

/**
 * Test 1: INTERNATIONAL + INTERNATIONAL => should match from waitingInternational
 */
async function testIntlMatch(serverUrl) {
  console.log('\n=== Test 1: INTERNATIONAL + INTERNATIONAL ===');
  const s1 = io(serverUrl, { transports: ['websocket'], reconnection: false });
  const s2 = io(serverUrl, { transports: ['websocket'], reconnection: false });

  await new Promise((res) => {
    s1.once('connect', () => { s1.emit('HELLO', { name: 'IntlA' }); s1.emit('JOIN_QUEUE', { mode: 'INTERNATIONAL' }); });
    s2.once('connect', () => { s2.emit('HELLO', { name: 'IntlB' }); s2.emit('JOIN_QUEUE', { mode: 'INTERNATIONAL' }); });
    s1.once('MATCH_FOUND', (m) => { console.log('✅ MATCH_FOUND: mode should be INTERNATIONAL'); res(); });
    setTimeout(res, 5000);
  });

  s1.close(); s2.close();
  await wait(200);
}

/**
 * Test 2: CLUB + CLUB => should match from waitingClub
 */
async function testClubMatch(serverUrl) {
  console.log('\n=== Test 2: CLUB + CLUB ===');
  const s1 = io(serverUrl, { transports: ['websocket'], reconnection: false });
  const s2 = io(serverUrl, { transports: ['websocket'], reconnection: false });

  await new Promise((res) => {
    s1.once('connect', () => { s1.emit('HELLO', { name: 'ClubA' }); s1.emit('JOIN_QUEUE', { mode: 'CLUB' }); });
    s2.once('connect', () => { s2.emit('HELLO', { name: 'ClubB' }); s2.emit('JOIN_QUEUE', { mode: 'CLUB' }); });
    s1.once('MATCH_FOUND', (m) => { console.log('✅ MATCH_FOUND: mode should be CLUB'); res(); });
    setTimeout(res, 5000);
  });

  s1.close(); s2.close();
  await wait(200);
}

/**
 * Test 3: ALL + INTERNATIONAL => should match from waitingInternational with mode INTERNATIONAL
 */
async function testAllMatchesIntl(serverUrl) {
  console.log('\n=== Test 3: ALL + INTERNATIONAL => mode INTERNATIONAL ===');
  const s1 = io(serverUrl, { transports: ['websocket'], reconnection: false });
  const s2 = io(serverUrl, { transports: ['websocket'], reconnection: false });

  let matchMode = null;
  await new Promise((res) => {
    s1.once('connect', () => { s1.emit('HELLO', { name: 'AllA' }); s1.emit('JOIN_QUEUE', { mode: 'ALL' }); });
    s2.once('connect', () => { s2.emit('HELLO', { name: 'IntlB' }); s2.emit('JOIN_QUEUE', { mode: 'INTERNATIONAL' }); });
    s1.once('MATCH_FOUND', () => {
      s1.once('ROOM_STATE', (rs) => { matchMode = rs.mode; console.log('✅ MATCH_FOUND, mode:', matchMode); res(); });
    });
    setTimeout(res, 5000);
  });

  s1.close(); s2.close();
  await wait(200);
}

/**
 * Test 4: ALL + CLUB => should match from waitingClub with mode CLUB
 */
async function testAllMatchesClub(serverUrl) {
  console.log('\n=== Test 4: ALL + CLUB => mode CLUB ===');
  const s1 = io(serverUrl, { transports: ['websocket'], reconnection: false });
  const s2 = io(serverUrl, { transports: ['websocket'], reconnection: false });

  let matchMode = null;
  await new Promise((res) => {
    s1.once('connect', () => { s1.emit('HELLO', { name: 'AllA' }); s1.emit('JOIN_QUEUE', { mode: 'ALL' }); });
    s2.once('connect', () => { s2.emit('HELLO', { name: 'ClubB' }); s2.emit('JOIN_QUEUE', { mode: 'CLUB' }); });
    s1.once('MATCH_FOUND', () => {
      s1.once('ROOM_STATE', (rs) => { matchMode = rs.mode; console.log('✅ MATCH_FOUND, mode:', matchMode); res(); });
    });
    setTimeout(res, 5000);
  });

  s1.close(); s2.close();
  await wait(200);
}

/**
 * Test 5: ALL + ALL => should match from waitingAll with mode ALL
 */
async function testAllMatchesAll(serverUrl) {
  console.log('\n=== Test 5: ALL + ALL => mode ALL ===');
  const s1 = io(serverUrl, { transports: ['websocket'], reconnection: false });
  const s2 = io(serverUrl, { transports: ['websocket'], reconnection: false });

  let matchMode = null;
  await new Promise((res) => {
    s1.once('connect', () => { s1.emit('HELLO', { name: 'AllA' }); s1.emit('JOIN_QUEUE', { mode: 'ALL' }); });
    s2.once('connect', () => { s2.emit('HELLO', { name: 'AllB' }); s2.emit('JOIN_QUEUE', { mode: 'ALL' }); });
    s1.once('MATCH_FOUND', () => {
      s1.once('ROOM_STATE', (rs) => { matchMode = rs.mode; console.log('✅ MATCH_FOUND, mode:', matchMode); res(); });
    });
    setTimeout(res, 5000);
  });

  s1.close(); s2.close();
  await wait(200);
}

async function main() {
  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:4001';
  try {
    await testIntlMatch(serverUrl);
    await testClubMatch(serverUrl);
    await testAllMatchesIntl(serverUrl);
    await testAllMatchesClub(serverUrl);
    await testAllMatchesAll(serverUrl);
    console.log('\n✅ All queue preference tests complete');
  } catch (e) {
    console.error('Test error', e);
    process.exitCode = 2;
  }
}

main();
