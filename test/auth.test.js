'use strict';

const app = require('../server');
const chai = require('chai'); 
const chaiHttp = require('chai-http'); 
const jwt = require('jsonwebtoken'); 
const mongoose = require('mongoose'); 

//const { app, runServer, closeServer } = require('../server'); 
const { JWT_SECRET, TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect; 

chai.use(chaiHttp); 

describe.only('Auth endpoints', function () { 

  const username = 'testUser'; 
  const password = 'testPass'; 
  const fullname = 'Test Test'; 

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
        fullname
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
          expect(res.body.name).to.eql('AuthenticationError'); 
          expect(res.body.message).to.eql('Bad Request'); 
          expect(res).to.have.status(400);  
        });
    });
    
    it('Should reject requests with incorrect usernames', () => { 
      return chai
        .request(app)
        .post('/api/login')
        .send({ username : 'fakename', fullname, password})
        .then((res) => {
          expect(res.body.name).to.eql('AuthenticationError'); 
          expect(res.body.message).to.eql('Unauthorized'); 
          expect(res).to.have.status(401);  
        });
    }); 

    it('Should reject requests with incorrect passwords', () => { 
      return chai
        .request(app)
        .post('/api/login')
        .send({ username, fullname, password : 'fakepassword'})
        .then((res) => {
          expect(res.body.name).to.eql('AuthenticationError'); 
          expect(res.body.message).to.eql('Unauthorized'); 
          expect(res).to.have.status(401);  
        });
    });

    it('Should return a valid auth token', () => { 
      return chai
        .request(app)
        .post('/api/login')
        .send({ username, fullname, password})
        .then((res) => { 
          expect(res).to.have.status(200); 
          expect(res).to.be.an('object'); 
          expect(res.body).to.have.key('authToken'); 
          expect(res.body.authToken).to.be.a('string'); 
          const payload = jwt.verify(res.body.authToken, JWT_SECRET, { 
            algorithm: ['HS256']
          }); 
          expect(payload.user).to.include({ 
            username, 
            fullname
          });
          expect(payload.user).to.have.key(
            'id', 
            'fullname', 
            'username');  
        }); 
    }); 
  });
  
  describe('/api/auth/refresh', function () {
    it('Should reject requests with no credentials'); 
    it('Should reject requests with an invalid token'); 
    it('Should reject requests with an expired token'); 
    it('Should return a valid auth token with a newer expiry date'); 
  }); 

});