var net = require('net');

var connections = [];

var server = net.createServer(function(connection) {

	connections.push(connection);

	connection.on('close', function() {
		//console.log('closing connection');
		var c=0; 
		while (c < connections.length) {
			if (connections[c] == this) {
				//console.log('deleting connection', c);
				connections.splice(c, 1);
			}
			else ++c;
		}
	});

	connection.on('data', function(data) {
		for (var c=0; c < connections.length; c++) {
			//console.log('writing to connection', c, data);
			connections[c].write(data);
		}
	});
});

server.listen(5000);
console.log('echo server listening');
