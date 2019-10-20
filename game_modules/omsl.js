
module.exports = function(app, socketio, helper) {
    console.log('module "Our Mundane Supernatural Life" running...');

    var io = socketio.of('/omsl'); // custom namespace
    var fs = require('fs'); // file stream for saving data

    // variables

    var roles = {}; // roles (2 max per room) in rooms
    var users = {}; // users in rooms
    var connections = []; // all connections to this namespace
    var datafiles = []; // data json filenames for each room

    var gamehandle = 'omsl';
    var defaultroom = 'test';
    var defaultdatapath = '/../game_default/';
    var datapath = '/../game_data/';
    var defaultfile = __dirname + defaultdatapath + 'default_' + gamehandle + '.json';

    var gamedata = {}; // includes data for each individual rooms

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
            //socket.emit('username', socket.username); // send back the valid username

            // prepare filenames for save files

            if (!datafiles[room]) {
                datafiles[room] = __dirname + datapath + 'data_' + gamehandle + '_' + room + '.json';
            }

            // prepare local data

            if (!gamedata[room]) {
                gamedata[room] = {};
            }
            gamedata[room] = {
                "roles": {
                    "mundane": {
                        "name": null,
                        "pronoun": null,
                        "notes": null,
                        "problem": null,
                        "activities": []
                    },
        			"supernatural": {
                        "name": null,
                        "pronoun": null,
                        "notes": null,
                        "problem": null,
        				"supernaturaltype": null,
                        "activities": []
        			}
                },
                "shared": {
                    "relationship": null,
                    "activities": []
                },
                "ourday": {
                    "activities": [],
                    "indicesofactivitygonewrong" : []
                },
                "timerstate": null,
                "scenelength": null
            };

            readJSONtoGame(datafiles[room], room);
        });

        connections.push(socket);
        console.log('%s sockets connected', connections.length);

        // disconnect
        socket.on('disconnect', function(data) {
            var room = socket.room;
            if (!room) {
                room = defaultroom; // default room
            }

            if (socket.role && roles[room]) {
                // only remove roles that are active, not before any has been chosen
                roles[room].splice(roles[room].indexOf(socket.role), 1);
            }
            if (users[room]) {
                users[room].splice(users[room].indexOf(socket.username), 1);
            }
            connections.splice(connections.indexOf(socket), 1);
            console.log('disconnected: ' + socket.username + ' of role ' + socket.role);
            console.log('%s sockets connected', connections.length);
        });

        // new user
        socket.on('choose role', function(data, callback) {
            callback(true);
            var room = socket.room;
            socket.role = data.role;

            roles[room] = roles[room] ? roles[room] : [];
            roles[room].push(socket.role);

            //console.log(data.role + ' chosen, now active roles in room ' + room + ': ' + roles[room].join(', '));
            updateClients(room);
        });

        // send message
        socket.on('chat message', function(data) {
            var type = 'chat';
            var output = '';
            var room = socket.room;
            var s = io.to(room);
            var message = data.trim();

            // only deal with non-empty data
            if (message) {
                //console.log('message ' + message);

                if (message.match(/^\/save$/)) {
                    type = "savegame";

                    output = GametoJSON(room);
                    writeJSON(datafiles[room], output); // save to a JSON file

                    s = socket; // only send to sender
                }
                else if (message.match(/^\/load$/)) {
                    type = "loadgame";
                    s = socket; // only send to sender
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
            s.emit('chat message', {'message': output, 'role': socket.role, 'type': type});
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

        // update relationship
        socket.on('update relationship', function(data) {
            var room = socket.room;
            gamedata[room]['shared']['relationship'] = data;
            updateClients(room);
        });

        // update supernatural type
        socket.on('update supernatural type', function(data) {
            var room = socket.room;
            gamedata[room]['supernatural']['supernaturaltype'] = data;
            updateClients(room);
        });

        // update problem
        socket.on('update problem', function(data) {
            var room = socket.room;
            var role = data.role;
            var problem = data.problem;
            var d = gamedata[room];

            d['problems'] = d['problems'] ? d['problems'] : {};
            d['problems'][role] = problem;

            gamedata[room] = d;

            updateClients(room);
        });

        // update notes
        socket.on('update notes', function(data) {
            var room = socket.room;
            var role = data.role;
            var notes = data.notes;
            var d = gamedata[room];

            d['notes'] = d['notes'] ? d['notes'] : {};
            d['notes'][role] = notes;

            gamedata[room] = d;
            updateClients(room);
        });

        socket.on('update field', function(data) {
            var room = socket.room;
            var field = data.field;
            var role = data.role;
            var index = data.index;
            var value = data.value;

            var d = gamedata[room];

            if (field == 'relationship') {
                d['shared'][field] = value;
            }
            else if (field == 'time' || field == 'activity') {
                if (role == 'shared') {
                    d['shared']['activities'] = d['shared']['activities'] ? d['shared']['activities'] : [];
                    d['shared']['activities'][index] =
                        d['shared']['activities'][index] ? d['shared']['activities'][index] : {};
                    d['shared']['activities'][index][field] = value;
                }
                else {
                    d['roles'][role]['activities'] = d['roles'][role]['activities'] ? d['roles'][role]['activities'] : [];
                    d['roles'][role]['activities'][index] =
                        d['roles'][role]['activities'][index] ? d['roles'][role]['activities'][index] : {};
                    d['roles'][role]['activities'][index][field] = value;
                }
            }
            else {
                d['roles'][role][field] = value;
            }

            gamedata[room] = d;

            io.emit('update field', {'field': field, 'role': role, 'number': (index+1), 'value': value});
        });

        socket.on('merge schedules', function() {
            var room = socket.room;
            var d = gamedata[room];

            // every merge re-generates the random indices

            d['ourday']['indicesofactivitygonewrong'] = [];

            while (d['ourday']['indicesofactivitygonewrong'].length < 5) {
                var random_number = Math.floor(Math.random() * 12); // random value from 0 to 11
                if (d['ourday']['indicesofactivitygonewrong'].indexOf(random_number) == -1) {
                    d['ourday']['indicesofactivitygonewrong'].push( random_number );
                }
            }

            // get all times/activities from mundane and supernatural

            var list = [];
            var activities = [];
            var i = 0;
            for (var r in d['roles']) {
                activities = d['roles'][r]['activities'];
                for (i = 0; i < activities.length; i++) {
                    list.push({'role': r, 'index': i,
                               'time': helper.sanitize(activities[i]['time'], 'time'),
                               'activity': activities[i]['activity']
                    });
                }
            }
            // add in shared activities
            activities = d['shared']['activities'];
            for (i = 0; i < activities.length; i++) {
                list.push({'role': 'shared', 'index': i,
                           'time': helper.sanitize(activities[i]['time'], 'time'),
                           'activity': activities[i]['activity']
                });
            }

            list.sort(compareActivities);
            // console.log('list length: ' + list.length);
            d['ourday']['activities'] = list;

            gamedata[room] = d;

            io.to(room).emit('unlock timer');

            updateClients(room);
        });

        socket.on('set timer', function() {
            var room = socket.room;
            var d = gamedata[room];
            var oldstate = d['timerstate'];
            d['timerstate'] = 'set';
            d['scenelength'] = Math.floor((Math.random() * 4) + 1) + 1;

            gamedata[room] = d;
            io.to(room).emit('update timer', {'oldstate': oldstate, 'newstate': 'set', 'scenelength': d['scenelength']});
            updateClients(room);
        });

        socket.on('update timer', function(state) {
            var room = socket.room;
            var d = gamedata[room];
            var oldstate = d['timerstate'];
            var scenelength = d['scenelength'];
            var s = io;

            d['timerstate'] = state;
            oldstate = oldstate ? oldstate : 'unset';

            //console.log('server timer oldstate ' + oldstate + ' newstate ' + state);

            if (state == 'toggle') {
                // sender will already toggled the clock locally, so just send
                // update to the other client
                s = socket.broadcast;
            }
            else {
                if (oldstate == 'toggle' && state == 'unset') {
                    s.to(room).emit('chat message', {'message': 'SCENE DONE', 'role': socket.role, 'type': 'scenedone'});
                }
            }
            gamedata[room] = d;

            s.to(room).emit('update timer', {'oldstate': oldstate, 'newstate': state, 'scenelength': scenelength});
        });

        socket.on('x-card', function(data) {
            var room = socket.room;
            io.to(room).emit('x-card', data);
        });

        socket.on('load json', function(data) {
            var room = socket.room;
            // parse JSON data, make sure it's valid
            if (helper.isJSON(data)) {
                var obj = JSON.parse(data);
                JSONtoGame(obj, room);
                console.log('JSON accepted');
                updateClients(room);
            }
            else {
                console.log('JSON refused');
            }
        });

        function updateClients(room) {
            io.to(room).emit('update client', {'roles': roles[room], 'info': gamedata[room]});
        }

        // comparators for activity object
        // (with element's source role, index, time and activity)
        function compareActivities(a, b) {
            var result = 0;
            // compare time first
            if (parseInt(a.time) < parseInt(b.time)) {
                result = -1;
            }
            else if (parseInt(a.time) > parseInt(b.time)) {
                result = 1;
            }
            else {
                // if time ties, compare string value of activity
                if (a.activity < b.activity) {
                    result = -1
                }
                else if (a.activity > b.activity) {
                    result = 1;
                }
                else {
                    // if still ties, compare index
                    if (a.index < b.index) {
                        result = -1;
                    }
                    else if (a.index > b.index) {
                        result = 1;
                    }
                    else {
                        // if still ties, supernatural above mundane
                        if (a.role == 'mundane' && b.role == 'supernatural') {
                            result = -1;
                        }
                        else if (a.role == 'supernatural' && b.role == 'mundane') {
                            result = 1;
                        }
                    }
                }
            }

            return result;
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
            fs.access(filename, fs.constants.F_OK, (err) => {
                if (err) { // file doesn't exist
                    filename = defaultfile;
                }
                fs.readFile(filename, 'utf8', function (err, data) {
                    if (err) throw err;
                    let obj = JSON.parse(data);
                    // must do it here or function will finish before read finishes
                    JSONtoGame(obj, room);
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
