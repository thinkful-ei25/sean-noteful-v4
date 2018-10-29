'use strict';

const mongoose = require('mongoose'); 
const bcrypt = require('bcryptjs'); 

const userSchema = mongoose.Schema({ 
  fullname : { type : String}, 
  username : { type : String, required : true, unique : true },  
  password : { type: String, required : true}
}); 

userSchema.set('toJSON', { 
  virtuals : true, 
  transform: (doc, ret) => { 
    delete ret._id; 
    delete ret.__v;   
    delete ret.password; 
  }
});

userSchema.methods.validatePassword = function (incomingPassword) {
  return bcrypt.compare(incomingPassword, this.password);
};

userSchema.statics.hashPassword = function (incomingPassword) {
  const digest = bcrypt.hash(incomingPassword, 10);
  return digest;
};

module.exports = mongoose.model('User', userSchema); 