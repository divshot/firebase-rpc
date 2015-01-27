var Firebase = require('firebase');

var Service = function(ref, name) {
  this.top = ref;
  this.ref = ref.child(name);
  this.name = name;
  this.methods = {};
  this.jobs = {};

  this.workerRef = this.ref.child('_workers').push({
    connectedAt: Firebase.ServerValue.TIMESTAMP
  });
  this.workerId = this.workerRef.key();
  this.workerRef.onDisconnect().remove();
}

Service.prototype.on = function(method, fn) {
  this.methods[method] = fn;
  var argumentSize = fn.length;

  this.listen(method);
}

Service.prototype.methodLog = function(method, message) {
  console.log("[" + this.name + "." + method + "]", message);
}

Service.prototype.listen = function(method) {
  var watcher = function(snap) {
    this.handle.call(this, method, snap);
  }.bind(this);

  // only listen for incomplete jobs, not processed ones
  var listenRef = this.ref.child(method).orderByChild('complete').equalTo(false)
  listenRef.on('child_added', watcher);
  listenRef.on('child_changed', watcher);
}

Service.prototype.handle = function(method, snap) {
  var id = snap.key();

  snap.ref().transaction(function(data) {
    this.jobs[id] = data;
    if (!data.status && !data.worker && !data.complete) {
      data.status = 'processing';
      data.statusChangedAt = Firebase.ServerValue.TIMESTAMP;
      data.worker = this.workerRef.key();

      return data;
    }
  }.bind(this), function(err, committed, snap) {
    this.jobs[id] = snap.val();
    if (err) { // the transaction ended abnormally
      this.methodLog(method, "id=" + id + " in=handle update=error message=\"" + err + '"');
    } else if (committed) { // it's ours! let's process
      try {
        var result = this.methods[method].apply(this, snap.val().arguments.concat([function(result) {
          this.deliver(method, snap.key(), null, result);
        }.bind(this), function(err) {
          this.deliver(method, snap.key(), err);
        }.bind(this)]));
      } catch(e) { // the method itself had an error
        throw e;
        this.deliver(method, snap.key(), e);
      }
    } else { // another worker already grabbed it
      if (!this.jobs[id]) {
        var val = snap.val();
        this.methodLog(method, "id=" + id + " update=skipped status=" + val.status + " worker=" + val.worker + " statusChanged=" + val.statusChanged);
      }
    }
  }.bind(this));
}

Service.prototype.deliver = function(method, id, err, result) {
  this.ref.child(method).child(id).transaction(function(data) {
    if (!data.status === 'processing' || !data.worker === this.workerRef.key() || data.complete) {
      return;
    } else {
      data.error = err ? err.toString() : null;
      data.result = result || null;
      data.status = err ? 'error' : 'processed';
      data.statusChangedAt = Firebase.ServerValue.TIMESTAMP;
      data.complete = true;
      data.completeAt = Firebase.ServerValue.TIMESTAMP;

      return data;
    }
  }.bind(this), function(err, committed, snap) {
    this.jobs[id] = null;

    if (err) {
      this.methodLog(method, "id=" + id + " in=handle update=error message=\"" + err + "\"");
    } else if (committed) {
      var val = snap.val();
      this.methodLog(method, "id=" + id + " update=processed elapsed=" + (val.completeAt - val.createdAt));
    } else {
      var val = snap.val();
      this.methodLog(method, "id=" + id + " in=deliver update=error message=out_of_sync elapsed=" + (val.completeAt - val.createdAt));
    }
  }.bind(this));
}

module.exports = Service;