
module.exports = function(app, socketio, helper) {
    console.log('module "Dice Chat" running...');

    var io = socketio.of('/dicechat'); // custom namespace

    // variables

    var users = {}; // users in rooms
    var connections = []; // all connections to this namespace

    var defaultroom = 'test';

    // when client connects
    io.on('connection', function(socket) {

        socket.on("join room", function(room) {

            var room = helper.sanitize(room, 'alphanumeric');
            if (room == '' || room.length > 20) {
                room = defaultroom;
            }

            if (socket.room) { // if already in a room
                // leave that room first
                socket.leave(socket.room);
                console.log('user left room ' + socket.room);
            }

            if (!users[room]) {
                users[room] = [];
            }
            var name = helper.checkUserName('', users[room]); // get a username

            socket.username = name;
            socket.room = room;
            socket.join(room);
            users[room].push(name);
            console.log('user ' + name + ' joined room ' + room);
            socket.emit('username', socket.username); // send back the valid username
            sendUsers(room);
        });

        connections.push(socket);
        console.log('%s sockets connected', connections.length);

        // disconnect
        socket.on('disconnect', function(data) {
            var room = socket.room;
            if (!room) {
                room = defaultroom; // default room
            }

            if (users[room]) {
                users[room].splice(users[room].indexOf(socket.username), 1);
            }
            connections.splice(connections.indexOf(socket), 1);
            console.log('disconnected: ' + socket.username);
            console.log('%s sockets connected', connections.length);
            sendUsers(room);
        });

        // send message
        socket.on('send message', function(data) {
            var type = 'chat';
            var output = '';
            var room = socket.room;
            var s = io.to(room);
            var message = data.trim();

            // only deal with non-empty data
            if (message) {
                //console.log('message ' + message);

                // user wants to change username
                if (message.match(/^\/n\s([\w\d]*)$/)) {
                    var matches = message.match(/n\s([\w\d]*)$/);
                    var oldname = socket.username;
                    var newname = helper.sanitize(matches[1], 'alphanumeric');
                    if (newname) { // if name is not empty after sanitization
                        socket.username = newname;
                        output = oldname + '|' + newname;
                        // update user's name on server
                        var i = users[room].indexOf(oldname);
                        if (i !== -1) {
                            users[room][i] = newname;
                        }
                    } else { // no change on an empty update
                        output = oldname + '|' + oldname;
                    }
                    type = 'updateusername';
                    sendUsers(room);
                }
                else {
                    // assume input is dice command, otherwise return original input
                    output = helper.diceRoller(message);
                    // if chat message was a dice command
                    if (output.match(/^<span title=/i)) {
                        type = "rollresult";
                    }
                }
            }
            s.emit('new message', {'message': output, 'user': socket.username, 'type': type});
        });

        socket.on('sketchpad', function(data) {
            var room = socket.room;
            socket.broadcast.to(room).emit('sketchpad', data);
        });

        function sendUsers(room) {
            io.to(room).emit('user list', users[room]);
        }

    });
};
