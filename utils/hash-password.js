'use strict';

const bcrypt = require('bcryptjs'); 
const password = 'password123'; 

bcrypt.hash(password, 10)
  .then(digest => { 
    console.log('digest = ', digest);
    return digest; 
  })
  .catch(err => { 
    console.log('error', err);
  }); 