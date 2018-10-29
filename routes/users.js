'use strict';

const express = require('express');
const User = require('../models/user'); 

const router = express.Router(); 

router.post('/', (req, res, next) => { 
  const {firstName, lastName, userName, password} = req.body; 
  const newUser = {firstName, lastName, userName, password}; 
  
  User
    .create({newUser})
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