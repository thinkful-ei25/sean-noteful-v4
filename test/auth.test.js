'use strict';

const app = require('../server');
const chai = require('chai'); 
const chaiHttp = require('chai-http'); 
const jwt = require('jsonwebtoken'); 
const mongoose = require('mongoose'); 

//const { app, runServer, closeServer } = require('../server'); 
const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect; 

chai.use(chaiHttp); 

describe.only('Auth endpoints', function () { 

  const username = 'testUser'; 
  const password = 'testPass'; 
  const firstName = 'Test';  
  const lastName = 'TestTest'; 

  before(() => {
    return mongoose
      .connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(() => {
    return User.createIndexes();
  });
 
  beforeEach(() => { 
    return User.hashPassword(password).then(password =>
      User.create({
        username,
        password,
        firstName,
        lastName
      })
    );
  }); 

  afterEach(() => {
    return mongoose.connection.db.dropDatabase();
  });

  after(() => {
    return mongoose.disconnect();
  });

  describe('/api/login', () => {
    it('Should reject requests with no credentials', () =>{ 
      return chai
        .request(app)
        .post('/api/login')
        //NOT SENDING ANYTHIN{G TO THE POST REQUEST
        .then((res) => {
          expect(res.body.message).to.eql('Bad Request'); 
          expect(res).to.have.status(400);  
        });
    });  
  }); 

});