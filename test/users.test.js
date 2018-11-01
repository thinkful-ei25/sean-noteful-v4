'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe.only('Noteful API - Users', () => {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';

  before(() => {
    return mongoose
      .connect(TEST_MONGODB_URI)
      .then(() =>  
        mongoose.connection.db.dropDatabase() 
      ); 
  });

  beforeEach(() => {
    return User.createIndexes();
  });

  afterEach(() => {
    return mongoose.connection.db.dropDatabase();
  });

  after(() => {
    return mongoose.disconnect();
  });

  describe('/api/users', () => {
    describe('POST', () => {
      it('Should create a new user', () => {
        const testUser = { username, password, fullname };

        let res;
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(_res => {
            res = _res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullname');

            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullname).to.equal(testUser.fullname);

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(res.body.id);
            expect(user.fullname).to.equal(testUser.fullname);
            return user.validatePassword(password);
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });

      it('Should reject users with missing username', function() {
        const testUser = { password, fullname };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eql(
              'Missing \'username\' in request body'
            );
          });
      });

      /**
       * COMPLETE ALL THE FOLLOWING TESTS
       */
      it('Should reject users with missing password', () => {
        const testUser = { username, fullname };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eql(
              'Missing \'password\' in request body'
            );
          });
      });

      it('Should reject users with non-string username', () => {
        const testUser = { username: 22, fullname, password };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eql(
              'Incorrect field type: expected string'
            );
            expect(res.body.location).to.eql('username');
          });
      });

      it('Should reject users with non-string password', () => {
        const testUser = { username, fullname, password: 22 };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eql(
              'Incorrect field type: expected string'
            );
            expect(res.body.location).to.eql('password');
          });
      });

      it('Should reject users with non-trimmed username', () => {
        const testUser = { username: '  user ', fullname, password };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eql(
              'Field: \'username\' cannot start or end with whitespace'
            );
          });
      });

      it('Should reject users with non-trimmed password', () => {
        const testUser = { username, fullname, password: ' password ' };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eql(
              'Field: \'password\' cannot start or end with whitespace'
            );
          });
      });

      it('Should reject users with empty username', () => {
        const testUser = { username: '', fullname, password };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).eql('Must be at least 1 characters long');
            expect(res.body.location).eql('username');
          });
      });

      it('Should reject users with password less than 8 characters', () => {
        const testUser = { username, fullname, password: 'nopass' };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).eql('Must be at least 8 characters long');
            expect(res.body.location).eql('password');
          });
      });

      it('Should reject users with password greater than 72 characters', () => {
        const testUser = {
          username,
          fullname,
          password:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).eql('Must be at most 72 characters long');
            expect(res.body.location).eql('password');
          });
      });

      it('Should reject users with duplicate username', () => {
        const testUser = { username, fullname, password };
        return User.create(testUser)
          .then(() => {
            return chai
              .request(app)
              .post('/api/users')
              .send(testUser); 
          })
          .then(res => {
            expect(res.body.message).eql('The username already exists');
          });
      });

      it('Should trim fullname', () => {
        const testUser = { username, fullname: ' Joe Shmoe ', password };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(201);
            expect(res.body.fullname).eql('Joe Shmoe');
          });
      });
    });
  });
});
