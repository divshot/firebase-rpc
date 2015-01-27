var FirebaseRPC = function(ref) {
  this.ref = ref;
}

FirebaseRPC.Service = require('./service');
FirebaseRPC.Client = require('./client');

FirebaseRPC.prototype.provide = function(serviceName, callback) {
  callback(new FirebaseRPC.Service(this.ref, serviceName));
}

FirebaseRPC.prototype.service = function(serviceName) {
  return new FirebaseRPC.Client(this.ref, serviceName);
}

module.exports = FirebaseRPC;