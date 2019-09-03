
module.exports = function(app, socketio, helper) {
    console.log('module "Hearts of Wulin" running...');

    var io = socketio.of('/heartsofwulin'); // custom namespace
    var fs = require('fs'); // file stream for saving data

    // variables

    var users = {}; // users in rooms
    var connections = []; // all connections to this namespace
    var datafiles = []; // data json filenames for each room

    var gamehandle = 'heartsofwulin';
    var defaultroom = 'test';
    var defaultdatapath = '/../game_default/';
    var datapath = '/../game_data/';
    var defaultfile = __dirname + defaultdatapath + 'default_' + gamehandle + '.json';

    var gamedata = {}; // includes data for each individual rooms
    var locked = {}; // local locked profiles, not to be saved with save file

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

            if (!gamedata[room]) {
                gamedata[room] = {};
            }
            gamedata[room]['profiles'] = [
                {
                    'role': null,
                    'portrait': 'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.4Ksamf5DWGXtDX-MiIjlOgHaLH%26pid%3DApi&f=1',
                    'player': null,
                    'character': null,
                    'faction': null,
                    'notes': null,
                    'style': null,
                    'earth': null,
                    'fire': null,
                    'metal': null,
                    'water': null,
                    'wood': null,
                    'wounded': false,
                    'marked': [],
                    'bonds': [],
                    'xp': 0,
                    'ge': null,
                    're': null
                },

                {
                    'role': null,
                    'portrait': 'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.2nHuYyGjuto2EdYe8UPhnQHaLH%26pid%3DApi&f=1',
                    'player': null,
                    'character': null,
                    'faction': null,
                    'notes': null,
                    'style': null,
                    'earth': null,
                    'fire': null,
                    'metal': null,
                    'water': null,
                    'wood': null,
                    'wounded': false,
                    'marked': [],
                    'bonds': [],
                    'xp': 0,
                    'ge': null,
                    're': null
                },

                {
                    'role': null,
                    'portrait': 'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse2.mm.bing.net%2Fth%3Fid%3DOIP.EZ4unkciUjvtKmMRl6FsSgHaKe%26pid%3DApi&f=1',
                    'player': null,
                    'character': null,
                    'faction': null,
                    'notes': null,
                    'style': null,
                    'earth': null,
                    'fire': null,
                    'metal': null,
                    'water': null,
                    'wood': null,
                    'wounded': false,
                    'marked': [],
                    'bonds': [],
                    'xp': 0,
                    'ge': null,
                    're': null
                }
            ];

            // misc local data not for saving

            if (!locked[room]) {
                locked[room] = [];
            }

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
                else if (message.match(/^\/save$/)) {
                    type = "savegame";

                    // console.log('write to ' + filename);
                    output = GametoJSON(room);
                    writeJSON(datafiles[room], output); // save to a JSON file

                    s = socket; // only send to sender
                }
                else if (message.match(/^\/load$/)) {
                    type = "loadgame";
                    s = socket;
                }
                else if (message.match(/^\/newgame$/)) {
                    type = "newgame";
                    readJSONtoGame(defaultfile, room);
                    locked[room] = []; // clear locked inputs
                    sendLockedProfiles(room);
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

        socket.on('save current', function() {
            writeJSON(datafiles[socket.room], GametoJSON(socket.room)); // save to a JSON file
        });

        socket.on('roll dice', function(data) {
            var user = socket.username;
            var room = socket.room;
            var command = data.command;
            var element = data.element;
            var outcome = helper.diceRoller(command);
            io.to(room).emit('roll result', {'user': user, 'element': element, 'result': outcome});
        });

        socket.on('update wounded', function(data) {
            var room = socket.room;
            var field = data.field;
            var index = data.index;
            var value = data.value;

            gamedata[room]['profiles'][index]['wounded'] = value;
            // apply penalty or reverse it to all stats as applicable
            if (gamedata[room]['profiles'][index]['wounded']) {
                // -2 penalty
                gamedata[room]['profiles'][index]['earth'] -= 2;
                gamedata[room]['profiles'][index]['fire'] -= 2;
                gamedata[room]['profiles'][index]['metal'] -= 2;
                gamedata[room]['profiles'][index]['water'] -= 2;
                gamedata[room]['profiles'][index]['wood'] -= 2;
            }
            else {
                // reverse penalty
                gamedata[room]['profiles'][index]['earth'] += 2;
                gamedata[room]['profiles'][index]['fire'] += 2;
                gamedata[room]['profiles'][index]['metal'] += 2;
                gamedata[room]['profiles'][index]['water'] += 2;
                gamedata[room]['profiles'][index]['wood'] += 2;
            }
            updateClients(room);
        });

        socket.on('update portrait', function(data) {
            var room = socket.room;
            gamedata[room]['profiles'][data.index]['portrait'] = data.url;
            io.to(room).emit('update portrait', {'index': data.index, 'url': data.url});
        });

        socket.on('update field', function(data) {
            var room = socket.room;
            var field = data.field;
            var index = data.index;
            var value = data.value;
            var markedlist = [];

            var p = gamedata[room]['profiles'];

            //console.log('server receiving field ' + field + ' index ' + index + ' value ' + value);

            if (field == 'earth' || field == 'fire' || field == 'metal' ||
                field == 'water' || field == 'wood') {
                 // make all input a number, empty input are interpreted as 0
                p[index][field] = helper.sanitize(value, 'statvalue');
                if (p[index][field] < -5) {
                    p[index][field] = -5; // stat value should be no less than -5
                    value = p[index][field];
                }
            }
            else {
                p[index][field] = value;
            }

            gamedata[room]['profiles'] = p;

            io.emit('update field', {'field': field, 'number': (index+1), 'value': value});
        });

        socket.on('update marked', function(data) {
            var room = socket.room;
            var index = data.index;
            var element = data.element;
            var ismarked = data.ismarked;
            var markedlist = [];
            var p = gamedata[room]['profiles'];
            markedlist = p[index]['marked'];

            var i = markedlist.indexOf(element);
            if (!ismarked && i !== -1) { // is not marked but in the list
                // remove it
                markedlist.splice(i, 1);
            }
            else if (ismarked && i == -1) { // is marked but not in the list
                // add it
                markedlist.push(element);
            }

            gamedata[room]['profiles'][index]['marked'] = markedlist;

            // send to everyone else but sender
            socket.broadcast.to(room).emit('update field', {'field': element + 'marked', 'number': (index+1), 'value': ismarked});
        });

        socket.on('update bonds', function(data) {
            var room = socket.room;
            var index = data.index;
            var name = data.name;
            var amount = data.amount;
            var change = 0;

            var p = gamedata[room]['profiles'][index];

            var found = false;
            for (var i = 0; i < p['bonds'].length; i++) {
                // case-insensitive check
                if (p['bonds'][i]['name'].toLowerCase() == name.toLowerCase()) {
                    found = true;
                    if (amount < 0) {
                        // remove bond
                        p['bonds'].splice(i, 1);
                    }
                    else { // update
                        change = amount - p['bonds'][i]['amount'];
                        if (change < 0) {
                            // burning bonds
                            io.to(room).emit('new message', {'type': 'using bonds', 'user': socket.user, 'message': p['character'] + ' burns ' + Math.abs(change) + ' bonds with ' + name});
                        }
                        else if (change > 0) {
                            // gaining bonds
                            io.to(room).emit('new message', {'type': 'using bonds', 'user': socket.user, 'message': p['character'] + ' gains ' + change + ' bonds with ' + name});
                        }
                        p['bonds'][i]['amount'] = amount;
                    }
                    break;
                }
            }
            if (!found && amount > 0) { // only add new if bond is greater than 0
                p['bonds'].push({'name': name, 'amount': amount});
                io.to(room).emit('new message', {'type': 'using bonds', 'user': socket.user, 'message': p['character'] + ' gains ' + amount + ' bonds with ' + name});
            }

            gamedata[room]['profiles'][index] = p;
            //io.to(room).emit('update bonds', {'number': (index+1), 'bonds': p['bonds']});
            updateClients(room); // forces client-side to refresh
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

        socket.on('togglelock profile', function(data) {
            var room = socket.room;
            var id = data.profileid;
            var lockit = data.lockit;

            var i = locked[room].indexOf(id);

            if (lockit && i == -1) {
                locked[room].push(id); // add to lock list if not there
            }
            else if (!lockit && i !== -1) {
                locked[room].splice(i, 1); // remove from lock list if there
            }
            io.to(room).emit('togglelock profile', {'profileid': id, 'lockit': lockit});
        });

        // socket send

        function updateClients(room) {
            io.to(room).emit('update client', {'users': users[room], 'profiles': gamedata[room]['profiles']});
            sendLockedProfiles(room);
        }

        function sendUsers(room) {
            io.to(room).emit('user list', users[room]);
        }

        function sendLockedProfiles(room) {
            io.to(room).emit('locked profiles', locked[room]);
        }

        function readJSONtoGame(filename, room=defaultroom) {
            fs.access(filename, fs.constants.F_OK, (err) => {
                if (err) { // file doesn't exist
                    filename = defaultfile;
                }
                //console.log('readfile ' + filename);
                fs.readFile(filename, 'utf8', function (err, data) {
                    if (err) throw err;
                    // must do it here or function will finish before read finishes
                    //console.log('read: ' + JSON.stringify(obj));
                    JSONtoGame(JSON.parse(data), room);
                    updateClients(room);
                });
            });
        }

        function writeJSON(filename, content) {
            // create new file if it doesn't exist, overwrite it if it does
            // use flag 'wx' if it should not create new file if it doesn't exist
            fs.writeFile(filename, content, { flag: 'w', encoding: 'utf8' }, function (err) {
                if (err) {
                    console.log("An error occured while writing JSON Object to File.");
                    return console.log(err);
                }
                console.log("JSON file has been saved.");
            });
            // writeFile can't pass back a string for confirmation
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
