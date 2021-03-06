var jdb = require('../');
var DataSource = jdb.DataSource;
var path = require('path');
var fs = require('fs');
var assert = require('assert');
var async = require('async');
var should = require('./init.js');

describe('Memory connector', function () {
  var file = path.join(__dirname, 'memory.json');

  function readModels(done) {
    fs.readFile(file, function (err, data) {
      var json = JSON.parse(data.toString());
      assert(json.models);
      assert(json.ids.User);
      done(err, json);
    });
  }

  before(function (done) {
    fs.unlink(file, function (err) {
      if (!err || err.code === 'ENOENT') {
        done();
      }
    });
  });

  it('should save to a json file', function (done) {
    var ds = new DataSource({
      connector: 'memory',
      file: file
    });

    var User = ds.createModel('User', {
      name: String,
      bio: String,
      approved: Boolean,
      joinedAt: Date,
      age: Number
    });

    var count = 0;
    var ids = [];
    async.eachSeries(['John1', 'John2', 'John3'], function (item, cb) {
      User.create({name: item}, function (err, result) {
        ids.push(result.id);
        count++;
        readModels(function (err, json) {
          assert.equal(Object.keys(json.models.User).length, count);
          cb(err);
        });
      });
    }, function (err, results) {
      // Now try to delete one
      User.deleteById(ids[0], function (err) {
        readModels(function (err, json) {
          assert.equal(Object.keys(json.models.User).length, 2);
          User.upsert({id: ids[1], name: 'John'}, function(err, result) {
            readModels(function (err, json) {
              assert.equal(Object.keys(json.models.User).length, 2);
              var user = JSON.parse(json.models.User[ids[1]]);
              assert.equal(user.name, 'John');
              done();
            });
          });
        });
      });
    });

  });

  // The saved memory.json from previous test should be loaded
  it('should load from the json file', function (done) {
    var ds = new DataSource({
      connector: 'memory',
      file: file
    });

    var User = ds.createModel('User', {
      name: String,
      bio: String,
      approved: Boolean,
      joinedAt: Date,
      age: Number
    });

    User.find(function (err, users) {
      // There should be 2 records
      assert.equal(users.length, 2);
      done(err);
    });

  });

  describe('Query for memory connector', function () {
    var ds = new DataSource({
      connector: 'memory'
    });

    var User = ds.define('User', {
      seq: {type: Number, index: true},
      name: {type: String, index: true, sort: true},
      email: {type: String, index: true},
      birthday: {type: Date, index: true},
      role: {type: String, index: true},
      order: {type: Number, index: true, sort: true},
      vip: {type: Boolean}
    });

    before(seed);
    it('should allow to find using like', function (done) {
      User.find({where: {name: {like: '%St%'}}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 2);
        done();
      });
    });

    it('should support like for no match', function (done) {
      User.find({where: {name: {like: 'M%XY'}}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 0);
        done();
      });
    });

    it('should allow to find using nlike', function (done) {
      User.find({where: {name: {nlike: '%St%'}}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 4);
        done();
      });
    });

    it('should support nlike for no match', function (done) {
      User.find({where: {name: {nlike: 'M%XY'}}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 6);
        done();
      });
    });

    it('should throw if the like value is not string or regexp', function (done) {
      User.find({where: {name: {like: 123}}}, function (err, posts) {
        should.exist(err);
        done();
      });
    });

    it('should throw if the nlike value is not string or regexp', function (done) {
      User.find({where: {name: {nlike: 123}}}, function (err, posts) {
        should.exist(err);
        done();
      });
    });

    it('should throw if the inq value is not an array', function (done) {
      User.find({where: {name: {inq: '12'}}}, function (err, posts) {
        should.exist(err);
        done();
      });
    });

    it('should throw if the nin value is not an array', function (done) {
      User.find({where: {name: {nin: '12'}}}, function (err, posts) {
        should.exist(err);
        done();
      });
    });

    it('should throw if the between value is not an array', function (done) {
      User.find({where: {name: {between: '12'}}}, function (err, posts) {
        should.exist(err);
        done();
      });
    });

    it('should throw if the between value is not an array of length 2', function (done) {
      User.find({where: {name: {between: ['12']}}}, function (err, posts) {
        should.exist(err);
        done();
      });
    });

    it('support order with multiple fields', function (done) {
      User.find({order: 'vip ASC, seq DESC'}, function (err, posts) {
        should.not.exist(err);
        posts[0].seq.should.be.eql(4);
        posts[1].seq.should.be.eql(3);
        done();
      });
    });

    it('should throw if order has wrong direction', function (done) {
      User.find({order: 'seq ABC'}, function (err, posts) {
        should.exist(err);
        done();
      });
    });

    function seed(done) {
      var beatles = [
        {
          seq: 0,
          name: 'John Lennon',
          email: 'john@b3atl3s.co.uk',
          role: 'lead',
          birthday: new Date('1980-12-08'),
          order: 2,
          vip: true
        },
        {
          seq: 1,
          name: 'Paul McCartney',
          email: 'paul@b3atl3s.co.uk',
          role: 'lead',
          birthday: new Date('1942-06-18'),
          order: 1,
          vip: true
        },
        {seq: 2, name: 'George Harrison', order: 5, vip: false},
        {seq: 3, name: 'Ringo Starr', order: 6, vip: false},
        {seq: 4, name: 'Pete Best', order: 4},
        {seq: 5, name: 'Stuart Sutcliffe', order: 3, vip: true}
      ];

      async.series([
        User.destroyAll.bind(User),
        function(cb) {
          async.each(beatles, User.create.bind(User), cb);
        }
      ], done);
    }

  });

});



