'use strict';

const mongoose = require('mongoose'); 

const userSchema = mongoose.Schema( 
  { fullname : { type : String} }, 
  { username : { type : String, required : true, unique : true }},  
  { password : { type: String, required : true}}
); 

userSchema.set('toJSON', { 
  virtuals : true, 
  transform: (doc, ret) => { 
    delete ret._id; 
    delete ret.__v;   
    delete ret.password; 
  }
}); 

module.exports = mongoose.model('User', userSchema); 