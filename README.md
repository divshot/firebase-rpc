# firebase-rpc

This library is an attempt to create a flexible RPC system using Firebase as a
centralized transport. It can be used to coordinate microservices or any other
kind of distributed system.

## Usage

### RPC Service

```javascript
var Firebase = require('firebase');
var RPC = require('firebase-rpc');

var ref = new Firebase('https://YOURBASE.firebase.io/rpc');
ref.authWithCustomToken(process.env.FIREBASE_TOKEN);

var rpc = new RPC(ref);

rpc.provide('calc', function(service) {
  service.on('add', function(a, b, done) {
    done(a + b);
  });

  service.on('subtract', function(a, b, done) {
    done(a - b);
  });
});
```

### RPC Client

```javascript
var Firebase = require('firebase');
var RPC = require('firebase-rpc');

var ref = new Firebase('https://YOURBASE.firebase.io/rpc');
ref.authWithCustomToken(process.env.FIREBASE_TOKEN);

var rpc = new RPC(ref);
var calc = rpc.client('calc');

calc.call('add', 2, 3).then(function(result) {
  console.log(result); // 5
}, function(err) {
  console.log("ERR: ", err);
});

calc.apply('subtract', [5, 2]).then(function(result) {
  console.log(result); // 3
}, function(err) {
  console.log("ERR: ", err);
});
```