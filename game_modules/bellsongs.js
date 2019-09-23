
module.exports = function(app, socketio, helper) {
    console.log('module "Bell Songs" running...');

    var io = socketio.of('/bellsongs'); // custom namespace
    var fs = require('fs'); // file stream for saving data

    // variables
    var users = {}; // users in rooms
    var connections = []; // all connections to this namespace
    var datafiles = []; // data json filenames for each room

    var gamehandle = 'bellsongs';
    var defaultroom = 'test';
    var defaultdatapath = '/../game_default/';
    var datapath = '/../game_data/';
    var defaultfile = __dirname + defaultdatapath + 'default_' + gamehandle + '.json';

    var gamedata = {}; // includes data for each individual rooms

    // socket related

    // when client connects
    io.on('connection', function(socket) {

        // socket receive

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

            // prepare filenames for save files

            if (!datafiles[room]) {
                datafiles[room] = __dirname + datapath + 'data_' + gamehandle + '_' + room + '.json';
            }

            // initialize local game room data
            initGameData(room);

            readJSONtoGame(datafiles[room], room);
        });

        connections.push(socket);
        console.log('%s sockets connected', connections.length);

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

        socket.on('chat message', function(data) {
            var type = 'chat';
            var output = '';
            var room = socket.room;
            var s = io.to(room);
            var message = data.trim();

            // only deal with non-empty data
            if (message) {
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
                    updateUserName();
                    sendUsers(room);
                }
                else if (message.match(/^\/save$/)) {
                    type = "savegame";

                    output = GametoJSON(room);
                    helper.writeJSONFile(datafiles[room], output); // save to a JSON file

                    s = socket; // only send to sender
                }
                else if (message.match(/^\/load$/)) {
                    type = "loadgame";
                    s = socket;
                }
                else if (message.match(/^\/newgame$/)) {
                    type = "newgame";
                    newGame(room);
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

            s.emit('chat message', {'message': output, 'user': socket.username, 'type': type});
        });

        socket.on('roll dice', function(data) {
            var room = socket.room;
            var index = data.index;
            var skill = data.skill;
            var level = data.level;
            var results = [];
            var expanded = '';

            for (var i = 0; i < level; i++) {
                results.push(Math.floor((Math.random() * 6) + 1));
            }
            var max = Math.max(...results);
            var expanded = '( ' + results.join('+') + ' )';
            var output = '<span title="' + expanded + '">' + max + '</span>';

            if (max < 4) {
                practice(room, index, skill);
            }

            var name = gamedata[room]['profiles'][index]['character'];
            if (!name) {
                name = "character" + (index+1);
            }

            io.to(room).emit('roll result', {'character': name, 'skill': skill, 'result': max, 'html': output});
        });

        socket.on('save', function() {
            // save to a JSON file
            helper.writeJSONFile(datafiles[socket.room], GametoJSON(socket.room));
        });

        socket.on('save game', function() {
            socket.emit('save game', GametoJSON(socket.room));
        });

        socket.on('update image', function(data) {
            var room = socket.room;
            gamedata[room]['currentimage'] = data;
            // send to everyone else but sender
            socket.broadcast.to(room).emit('update image', data);
        });

        socket.on('update portrait', function(data) {
            var room = socket.room;
            gamedata[room]['profiles'][data.index]['portrait'] = data.url;
            io.to(room).emit('update portrait', {'index': data.index, 'url': data.url});
        });

        socket.on('add skill', function(data) {
            var room = socket.room;
            var index = data.index;
            var skill = data.skill.toLowerCase();
            var found = false;
            var p = gamedata[room]['profiles'][index];

            for(var i = 0; i < p['skills'].length; i++) {
                if (p['skills'][i]['name'] == skill) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                // a new skill start with 1 dot/level and 0 practice
                p['skills'].push({'name': skill, 'level': 1, 'practice': 0});
            }
            gamedata[room]['profiles'][index] = p;

            updateClients(room);
        });

        socket.on('practice', function(data) {
            var room = socket.room;
            var index = data.index;
            var skill = data.skill;

            practice(room, index, skill);
        });
        function practice(room, index, skill) {
            var p = gamedata[room]['profiles'][index];

            for(var i = 0; i < p['skills'].length; i++) {
                if (p['skills'][i]['name'] == skill) {
                    p['skills'][i]['practice'] += 1;
                    if (p['skills'][i]['practice'] > 2) {
                        p['skills'][i]['practice'] = 0;
                        p['skills'][i]['level'] += 1;
                    }
                    break;
                }
            }
            gamedata[room]['profiles'][index] = p;

            updateClients(room);
        }

        socket.on('update field', function(data) {
            var room = socket.room;
            var field = data.field;
            var index = data.index;
            var value = data.value;

            gamedata[room]['profiles'][index][field] = value;

            io.to(room).emit('update field', {'field': field, 'number': (index+1), 'value': value});
        });

        socket.on('sketchpad', function(data) {
            var room = socket.room;
            socket.broadcast.to(room).emit('sketchpad', data);
        });

        socket.on('x-card', function(data) {
            var room = socket.room;
            io.to(room).emit('x-card', data);
        });

        socket.on('load json', function(data) {
            var room = socket.room;
            // parse JSON data, make sure it's valid
            if (helper.isJSON(data)) {
                JSONtoGame(JSON.parse(data), room);
                console.log('JSON accepted');
                updateClients(room);
            }
            else {
                console.log('JSON refused');
            }
        });

        function updateClients(room) {
            var data = gamedata[room];
            //console.log('server update clients');
            if (data) {
                var info = {
                    'profiles': data['profiles'],
                    'currentimage': data['currentimage']
                };

                io.to(room).emit('update client', {'users': users[room], 'info': info});
            }
        }

        function updateUserName() {
            socket.emit('username', socket.username);
        }
        function sendUsers(room) {
            io.to(room).emit('user list', users[room]);
        }

        function initGameData(room) {
            if (!gamedata[room]) {
                gamedata[room] = {};
            }
            gamedata[room]['currentimage'] = null;
            gamedata[room]['profiles'] = [
                {
                    'portrait': 'https://raw.githubusercontent.com/brushmen/trpgplayaid_server/master/public/images/portraiticon.png',
                    'player': null,
                    'character': null,
                    'background': null,
                    'gift': null,
                    'raiment': null,
                    'goal': null,
                    'notes': null,
                    'rascality': 10,
                    'wounded': false,
                    'skills': []
                },
                {
                    'portrait': 'https://raw.githubusercontent.com/brushmen/trpgplayaid_server/master/public/images/portraiticon.png',
                    'player': null,
                    'character': null,
                    'background': null,
                    'gift': null,
                    'raiment': null,
                    'goal': null,
                    'notes': null,
                    'rascality': 10,
                    'wounded': false,
                    'skills': []
                },
                {
                    'portrait': 'https://raw.githubusercontent.com/brushmen/trpgplayaid_server/master/public/images/portraiticon.png',
                    'player': null,
                    'character': null,
                    'background': null,
                    'gift': null,
                    'raiment': null,
                    'goal': null,
                    'notes': null,
                    'rascality': 10,
                    'wounded': false,
                    'skills': []
                }
            ];
        }

        socket.on('new game', function() {
            var room = socket.room;
            newGame(room);
            io.to(room).emit('chat message', {'message': '', 'user': socket.username, 'type': 'newgame'});
        });
        function newGame(room) {
            readJSONtoGame(defaultfile, room);
        }

        function readJSONtoGame(filename, room) {
            //console.log('readfile ' + filename);
            fs.access(filename, fs.constants.F_OK, (err) => {
                if (err) { // file doesn't exist
                    filename = defaultfile;
                }
                fs.readFile(filename, 'utf8', function (err, data) {
                    if (err) throw err;
                    // must do it here or function will finish before read finishes
                    JSONtoGame(JSON.parse(data), room);
                    updateClients(room);
                });
            });
        }

        function JSONtoGame(obj, room=defaultroom) {
            if (obj && obj[gamehandle]) {
                gamedata[room] = obj[gamehandle];
            }
        }

        function GametoJSON(room=defaultroom) {
            var gameJSON = {};
            if (gamedata[room]) {
                gameJSON[gamehandle] = gamedata[room];
                gameJSON = JSON.stringify(gameJSON, null, "\t");
            }
            return gameJSON;
        }

    });
};
