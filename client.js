var Firebase = require('firebase');
var Q = require('q');

var Client = function(ref, service) {
  this.top = ref;
  this.ref = ref.child(service);
}

Client.prototype.call = function(method) {
  var args = Array.prototype.slice.call(arguments, 1);
  if (typeof args[args.length - 1] === 'function') var callback = args.pop();

  var job = this.ref.child(method).push({
    createdAt: Firebase.ServerValue.TIMESTAMP,
    arguments: args,
    complete: false
  });

  var deferred = Q.defer();
  job.on('value', function(snap) {
    var data = snap.val();
    if (data.complete) {
      job.transaction(function(data) {
        if (data.complete && data.error) {
          deferred.reject(new Error(data.error));
        } else {
          deferred.resolve(data.result);
        }
        data.status = 'accepted';
        data.statusChangedAt = Firebase.ServerValue.TIMESTAMP;
        job.off('value');

        return data;
      }, function(err, committed, snap) {
        if (err) {
          deferred.reject(err);
        }
      }.bind(this));
    }
  }.bind(this));

  return deferred.promise.nodeify(callback);
}

module.exports = Client;