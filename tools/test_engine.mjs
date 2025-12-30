import { scoreAnswer } from '../web/engine/scoring.js';
import { pickAdaptiveQuestion } from '../web/engine/adaptivePick.js';
import { shuffle } from '../web/engine/shuffle.js';

console.log('--- scoring tests ---');
const correct = { teamA: 'Alpha', teamB: 'Beta', score: '2-1' };
console.log('exact correct ->', scoreAnswer({ teamA: 'Alpha', teamB: 'Beta', score: '2-1' }, correct));
console.log('teams swapped correct ->', scoreAnswer({ teamA: 'Beta', teamB: 'Alpha', score: '1-2' }, correct));
console.log('teams correct wrong score ->', scoreAnswer({ teamA: 'Alpha', teamB: 'Beta', score: '1-0' }, correct));
console.log('teams wrong ->', scoreAnswer({ teamA: 'X', teamB: 'Y', score: '2-1' }, correct));

console.log('\n--- adaptivePick tests ---');
const qs = [
  { id: 'q1', difficulty: 1 },
  { id: 'q2', difficulty: 2 },
  { id: 'q3', difficulty: 3 },
  { id: 'q4', difficulty: 4 },
  { id: 'q5', difficulty: 5 },
];
console.log('pick target 3 ->', pickAdaptiveQuestion(qs, new Set(), 3));
console.log('pick target 5 ->', pickAdaptiveQuestion(qs, new Set(['q5']), 5));

console.log('\n--- shuffle test ---');
console.log('shuffle [1,2,3,4,5] ->', shuffle([1,2,3,4,5]));
