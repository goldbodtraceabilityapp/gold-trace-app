/* hashPassword.js
const bcrypt = require('bcrypt');

async function generateHash(plainTextPassword) {
  try {
    const saltRounds = 10;                // 10 is a good default for most apps
    const hash = await bcrypt.hash(plainTextPassword, saltRounds);
    console.log('Hashed password:', hash);
  } catch (err) {
    console.error('Error hashing password:', err);
  }
}

// Replace this with the dealer’s chosen password:
const dealerPlaintext = 'yourDealerPlaintextPassword';

generateHash(dealerPlaintext);

*/