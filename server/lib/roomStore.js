// Minimal room store abstraction (in-memory implementation)
// Exposes Map-like API so existing code can keep using `rooms.get/set/delete` etc.

const map = new Map();

const roomStore = {
  get(id) { return map.get(id); },
  set(id, value) { map.set(id, value); return value; },
  delete(id) { return map.delete(id); },
  has(id) { return map.has(id); },
  entries() { return map.entries(); },
  keys() { return map.keys(); },
  values() { return map.values(); },
  forEach(fn) { return map.forEach(fn); },
  get size() { return map.size; },
  // Make the store iterable: `for (const [k,v] of rooms)` continues to work
  [Symbol.iterator]() { return map[Symbol.iterator](); },
};

export default roomStore;
