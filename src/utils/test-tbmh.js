/**
 * Test file để kiểm tra hàm calculateTBMH
 */
import { calculateTBMH, calculateTBKT } from './gradeCalculation.js';

// Test cases
console.log('=== Test calculateTBMH ===');

// Test case 1: Normal values
const tbkt1 = 7.5;
const final1 = 8.0;
const result1 = calculateTBMH(tbkt1, final1);
console.log(`Test 1: TBKT=${tbkt1}, Final=${final1} => TBMH=${result1}`);
// Expected: (8.0 * 0.6) + (7.5 * 0.4) = 4.8 + 3.0 = 7.8

// Test case 2: Zero values
const tbkt2 = 0;
const final2 = 5.0;
const result2 = calculateTBMH(tbkt2, final2);
console.log(`Test 2: TBKT=${tbkt2}, Final=${final2} => TBMH=${result2}`);
// Expected: (5.0 * 0.6) + (0 * 0.4) = 3.0 + 0 = 3.0

// Test case 3: String numbers
const tbkt3 = '8.5';
const final3 = '7.0';
const result3 = calculateTBMH(tbkt3, final3);
console.log(`Test 3: TBKT="${tbkt3}", Final="${final3}" => TBMH=${result3}`);
// Expected: (7.0 * 0.6) + (8.5 * 0.4) = 4.2 + 3.4 = 7.6

// Test case 4: Empty values
const tbkt4 = '';
const final4 = 8.0;
const result4 = calculateTBMH(tbkt4, final4);
console.log(`Test 4: TBKT="${tbkt4}", Final=${final4} => TBMH=${result4}`);
// Expected: '' (empty string)

// Test case 5: Full test with TBKT calculation
console.log('\n=== Test full flow ===');
const txScore = { tx1: 8.0, tx2: 7.0 };
const dkScore = { dk1: 8.5, dk2: 7.5 };
const finalScore = 8.0;

const tbktCalculated = calculateTBKT(txScore, dkScore);
const tbmhCalculated = calculateTBMH(tbktCalculated, finalScore);

console.log(`TX Scores: ${JSON.stringify(txScore)}`);
console.log(`DK Scores: ${JSON.stringify(dkScore)}`);
console.log(`Final Score: ${finalScore}`);
console.log(`TBKT Calculated: ${tbktCalculated}`);
console.log(`TBMH Calculated: ${tbmhCalculated}`);

export { calculateTBMH, calculateTBKT };
