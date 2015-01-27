/**
 * Calculates the sum of random values and outputs to the console.
 */

var FirebaseRPC = require('../');
var Firebase = require('firebase');

var base = new Firebase(process.env.FIREBASE_URL);
var rpc = new FirebaseRPC(base);

rpc.provide('calc', function(service) {
  service.on('add', function(a, b, done) {
    done(a + b);
  });

  service.on('subtract', function(a, b, done) {
    done(a - b);
  });
});

var calc = rpc.service('calc')

var randomNumber = function(){ return Math.round(Math.random() * 100) }

setInterval(function() {
  var a = randomNumber();
  var b = randomNumber();

  calc.call('add', a, b).then(function(result) {
    console.log(a + " + " + b + " = " + result);
  }).catch(function(err) {
    console.log(err);
  });
}, 1000);