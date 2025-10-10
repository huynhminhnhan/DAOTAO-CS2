// Simple test for calculateTBMH
import { calculateTBMH, calculateTBKT, GRADE_WEIGHTS } from './gradeCalculation.js';

console.log('=== Test calculateTBMH ===');
console.log('GRADE_WEIGHTS:', GRADE_WEIGHTS);

// Test case 1: Normal values
const tbkt1 = 7.5;
const final1 = 8.0;
const result1 = calculateTBMH(tbkt1, final1);
console.log(`Test 1: TBKT=${tbkt1}, Final=${final1} => TBMH=${result1}`);
console.log(`Expected: (${final1} * 0.6) + (${tbkt1} * 0.4) = ${final1 * 0.6} + ${tbkt1 * 0.4} = ${final1 * 0.6 + tbkt1 * 0.4}`);

// Test case 2: Zero values
const tbkt2 = 0;
const final2 = 5.0;
const result2 = calculateTBMH(tbkt2, final2);
console.log(`Test 2: TBKT=${tbkt2}, Final=${final2} => TBMH=${result2}`);

// Test case 3: String numbers
const tbkt3 = '8.5';
const final3 = '7.0';
const result3 = calculateTBMH(tbkt3, final3);
console.log(`Test 3: TBKT="${tbkt3}", Final="${final3}" => TBMH=${result3}`);

// Test case 4: Empty values
const tbkt4 = '';
const final4 = 8.0;
const result4 = calculateTBMH(tbkt4, final4);
console.log(`Test 4: TBKT="${tbkt4}", Final=${final4} => TBMH=${result4}`);
