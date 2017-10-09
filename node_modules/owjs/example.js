var owjs = require('../owjs');
var client = new owjs.Client({host:'127.0.0.1'});


client.read('/settings/timeout/directory')
.then(function (result) {
  console.log("Timeout is set to ", result.value.trim());
});


client.list('/')
.then(client.list)
.then(function (result) {
  console.log('All properties of all devices');
  console.log(result);
});


client.write('/05.54F81BE8E78D/PIO', 100).
then(function(){
  console.log('Wrote a value');
});


// this is a special one just to make life easier for me
client.readFamily(10, 'temperature')
.then(function(result){
  console.log("All temperatures");
  console.log(result);
});


// And if you want it can of course be used with standard node
// callback pattern instead of promise.
// Just add a function as the last parameter.
client.list('/', function(err, result){
  if(err){
    return console.error(err);
  }
  console.log("All devices again");
  console.log(result);
});