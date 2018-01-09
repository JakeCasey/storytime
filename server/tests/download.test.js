var submit = require('../routes/downloadRoute.js');
var app = require('../index.js');
var fs = require('fs');

var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();
var expect = chai.expect;
chai.use(chaiHttp);

describe('download', () => {

  describe('/GET id', () => {

    it('should get an id when one is sent to it', (done) => {
      chai.request(app)
      .get('/download/abc')
      .end((err, res) => {
        res.body.id.should.equal('abc');
        done();

      });
    })

  });

});

