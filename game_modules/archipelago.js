
module.exports = function(app, socketio, helper) {
    console.log('module "Archipelago" running...');

    var io = socketio.of('/archipelago'); // custom namespace
    var fs = require('fs'); // file stream for saving data

    // variables

    var users = {}; // users in rooms
    var connections = []; // all connections to this namespace
    var datafiles = []; // data json filenames for each room

    var infotext = {};
    infotext['fate'] = [
        "Somebody important to this character faces trouble because of the element you own - severe illness, bankruptcy, doubt in their faith or similar.",
        "This character does something rash that causes them a lot of trouble with the element you own. An unwise liaison; insulting an ally; destruction of property.",
        "An area on the map is threatened. An attack by enemies, a natural disaster, a change from within or similar.",
        "Someone from this character's past suddenly appears in an area on the map, with a request or demand.",
        "The element you own is interfering with this character's desires, wishes or needs.",
        "Something important is stolen from this character by someone connected to the element you own.",
        "The element you own changes allegiance, motivation or direction.",
        "This character receives an unwanted and troublesome gift from an area on the map.",
        "The element you own claims something from you that you might not be able to give.",
        "This character makes an enemy in the element you own.",
        "This character must come to terms with the element you own, either mastering it, co-opting it, or accepting the element's control.",
        "The element you own comes to this character's aid in some unexpected and surprising way. This is not without consequences."
    ];

    infotext['resolution'] = [
        "YES, and... you earn a friend, reward or good reputation in the process.",
        "YES, and... something completely unrelated is a smashing success.",
        "YES, but... you earn a new enemy, debt or bad reputation in the process.",
        "YES, but... something entirely unrelated goes badly wrong.",
        "YES, but... your success will cause great personal harm.",
        "YES, but... your success has dangerous and unintended consequences.",
        "YES, but... your success will harm a friend, ally or loved one.",
        "YES, but... in order to succeed you must sacrifice something dear to you.",
        "PERHAPS... but this isn't something you can do alone. Help is needed.",
        "PERHAPS... but if you want this done, someone more suited to the task must do it.",
        "NO, but... your failure helps another succeed.",
        "NO, but... you gain insight or knowledge that will be useful in the future.",
        "NO, but... you earn a friend, ally or goodwill in the process.",
        "NO, but... your failure has unexpected positive consequences.",
        "NO, and... something entirely unrelated goes badly wrong.",
        "NO, and... someone or something dear to you is harmed, lost or destroyed."
    ];

    var gamehandle = 'archipelago';
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
            gamedata[room]['currentmap'] = null;
            gamedata[room]['currentimage'] = null;
            gamedata[room]['profiles'] = [
                {
                    'portrait': 'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse2.mm.bing.net%2Fth%3Fid%3DOIP.fdE-CI_DijExNf3BoQmqzQAAAA%26pid%3DApi&f=1',
                    'player': null,
                    'character': null,
                    'ownedelement': null,
                    'notes': null,
                    'destiny': null
                },
                {
                    'portrait': 'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse2.mm.bing.net%2Fth%3Fid%3DOIP.fdE-CI_DijExNf3BoQmqzQAAAA%26pid%3DApi&f=1',
                    'player': null,
                    'character': null,
                    'ownedelement': null,
                    'notes': null,
                    'destiny': null
                },
                {
                    'portrait': 'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse2.mm.bing.net%2Fth%3Fid%3DOIP.fdE-CI_DijExNf3BoQmqzQAAAA%26pid%3DApi&f=1',
                    'player': null,
                    'character': null,
                    'ownedelement': null,
                    'notes': null,
                    'destiny': null
                },
                {
                    'portrait': 'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Ftse2.mm.bing.net%2Fth%3Fid%3DOIP.fdE-CI_DijExNf3BoQmqzQAAAA%26pid%3DApi&f=1',
                    'player': null,
                    'character': null,
                    'ownedelement': null,
                    'notes': null,
                    'destiny': null
                }
            ];
            // prepare decks

            if (!gamedata[room]['fate_deck_indices']) {
                gamedata[room]['fate_deck_indices'] = helper.fillArrayWithNumbers(12);
                gamedata[room]['fate_discard_indices'] = [];
            }
            gamedata[room]['fate_deck_indices'] = helper.shuffle(gamedata[room]['fate_deck_indices']);
            if (!gamedata[room]['resolution_deck_indices']) {
                gamedata[room]['resolution_deck_indices'] = helper.fillArrayWithNumbers(16);
                gamedata[room]['resolution_discard_indices'] = [];
            }
            gamedata[room]['resolution_deck_indices'] = helper.shuffle(gamedata[room]['resolution_deck_indices']);
            gamedata[room]['currentcard'] = null;
            gamedata[room]['currentcardtype'] = null;

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
                else if (message.match(/^\/clearcard$/)) {
                    type = "clearcard";
                    gamedata[room]['currentcard'] = null;
                    gamedata[room]['currentcardtype'] = null;
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
            // send to everyone else but sender
            socket.broadcast.to(room).emit('togglelock profile', {'profileid': id, 'lockit': lockit});
        });

        socket.on('update image', function(data) {
            var room = socket.room;
            var field = data.field;
            var url = data.url;
            gamedata[room][field] = url;
            // send to everyone else but sender
            socket.broadcast.to(room).emit('update image', data);
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

            gamedata[room]['profiles'][index][field] = value;

            io.to(room).emit('update field', {'field': field, 'number': (index+1), 'value': value});
        });

        socket.on ('draw card', function(type) {
            var room = socket.room;
            var data = gamedata[room];
            var output = '';

            if (!data[type + '_deck_indices']) {
                if (type == 'fate') {
                    data[type + '_deck_indices'] = helper.fillArrayWithNumbers(12);

                } else {
                    data[type + '_deck_indices'] = helper.fillArrayWithNumbers(16);
                }
                data[type + '_deck_indices'] = helper.shuffle(data[type + '_deck_indices']);
            }
            if (!data[type + '_discard_indices']) {
                data[type + '_discard_indices'] = [];
            }

            if (data[type + '_deck_indices'].length < 1) {
                // reshuffle the discard back into deck
                data[type + '_deck_indices'] = helper.shuffle(data[type + '_discard_indices']);
                data[type + '_discard_indices'] = [];
            }
            var index = data[type + '_deck_indices'].shift();
            data[type + '_discard_indices'].push(index);
            output = infotext[type][index];
            data['currentcard'] = output;
            data['currentcardtype'] = type;

            gamedata[room] = data;

            io.to(room).emit('update card', {'card': output, 'type': type, 'remaining': data[type + '_deck_indices'].length});
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

        socket.on('sketchpad', function(data) {
            var room = socket.room;
            socket.broadcast.to(room).emit('sketchpad', data);
        });

        // socket send

        function updateClients(room) {
            var data = gamedata[room];
            //console.log('server update clients');
            if (data) {
                var info = {
                    'profiles': data['profiles'],
                    'currentcard': data['currentcard'],
                    'currentcardtype': data['currentcardtype'],
                    'currentmap': data['currentmap'],
                    'currentimage': data['currentimage']
                };

                io.to(room).emit('update client', {'users': users[room], 'info': info});
            }
            sendLockedProfiles(room);
        }

        function sendUsers(room) {
            io.to(room).emit('user list', users[room]);
        }

        function sendLockedProfiles(room) {
            io.to(room).emit('locked profiles', locked[room]);
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
