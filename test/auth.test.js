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

describe('Auth endpoints', function() {
  const username = 'testUser';
  const password = 'testPass';
  const fullname = 'Test Test';

  before(() => {
    return mongoose
      .connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(() => {
    return User.hashPassword(password)
      .then(password => {
        return User.create({
          username,
          password,
          fullname
        });
      })
      .then(() => {
        return User.createIndexes();
      });
  });

  afterEach(() => {
    return mongoose.connection.db.dropDatabase();
  });

  after(() => {
    return mongoose.disconnect();
  });

  describe('/api/login', () => {
    it('Should reject requests with no credentials', () => {
      return (
        chai
          .request(app)
          .post('/api/login')
          //NOT SENDING ANYTHIN{G TO THE POST REQUEST
          .then(res => {
            expect(res.body.name).to.eql('AuthenticationError');
            expect(res.body.message).to.eql('Bad Request');
            expect(res).to.have.status(400);
          })
      );
    });

    it('Should reject requests with incorrect usernames', () => {
      return chai
        .request(app)
        .post('/api/login')
        .send({ username: 'fakename', fullname, password })
        .then(res => {
          expect(res.body.name).to.eql('AuthenticationError');
          expect(res.body.message).to.eql('Unauthorized');
          expect(res).to.have.status(401);
        });
    });

    it('Should reject requests with incorrect passwords', () => {
      return chai
        .request(app)
        .post('/api/login')
        .send({ username, fullname, password: 'fakepassword' })
        .then(res => {
          expect(res.body.name).to.eql('AuthenticationError');
          expect(res.body.message).to.eql('Unauthorized');
          expect(res).to.have.status(401);
        });
    });

    it('Should return a valid auth token', () => {
      return chai
        .request(app)
        .post('/api/login')
        .send({ username, fullname, password })
        .then(res => {
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
          expect(payload.user).to.have.key('id', 'fullname', 'username');
        });
    });
  });

  describe('/api/auth/refresh', function() {
    it('Should reject requests with no credentials', () => {
      return chai
        .request(app)
        .post('/login/refresh')
        .then(res => {
          expect(res).to.have.status(404);
          expect(res.body.message).to.eql('Not Found');
        });
    });
    it('Should reject requests with an invalid token', () => {
      const token = jwt.sign(
        {
          user: {
            username,
            fullname
          }
        },
        'wrongSecret',
        {
          algorithm: 'HS256',
          expiresIn: '7d'
        }
      );

      return chai
        .request(app)
        .post('/api/login/refresh')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.name).to.eql('AuthenticationError');
          expect(res.body.message).to.eql('Unauthorized');
        });
    });

    it('Should reject an expired token', () => {
      const token = jwt.sign(
        {
          user: {
            username
          }
        },
        JWT_SECRET,
        {
          algorithm: 'HS256',
          subject: username,
          expiresIn : '-10s'
        }
      );
      //If you want to print out the token
      //console.log(token);
      return chai
        .request(app)
        .post('/api/login/refresh')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(401);
        });
    });

    it('Should return a valid auth token with a newer expiry date', () => {
      return chai
        .request(app)
        .post('/api/login')
        .send({ username, password })
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          expect(res.body.authToken).to.be.a('string');
          const payload = jwt.verify(res.body.authToken, JWT_SECRET);
          expect(payload.user).to.not.have.property('password');
          return res;
        })
        .then(res => {
          return chai
            .request(app)
            .post('/api/login/refresh')
            .set('Authorization', `Bearer ${res.body.authToken}`)
            .then(res => {
              expect(res).to.have.status(200);
              expect(res.body).to.be.an('object');
              expect(res.body.authToken).to.be.a('string');
              const payload = jwt.verify(res.body.authToken, JWT_SECRET, {
                algorithm: ['HS256']
              });
              expect(payload.user).to.include({
                username,
                fullname
              });
              expect(payload.user).to.have.keys('fullname', 'username', 'id');
            });
        });
    });
  });
});
