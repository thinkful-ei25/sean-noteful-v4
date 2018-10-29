'use strict';

const express = require('express');
const User = require('../models/user'); 

const router = express.Router(); 

router.post('/', (req, res, next) => { 
  const {fullname, username, password} = req.body; 
  const newUser = {fullname, username, password}; 
  console.log('username:', username);
  
  User
    .create(newUser)
    .then(result => { 
      res
        .status(201)
        .location(`/api/users/${result.id}`)
        .json(result); 
    })
    .catch(err => { 
      return next(err); 
    }); 
}); 

module.exports = router; 