
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

    // init const values
    const startingskills = {
        'cook': [
            {
                "name": "cooking",
                "level": 1,
                "practice": 0
            },
            {
                "name": "brewing",
                "level": 1,
                "practice": 0
            }
        ],
        'farmer': [
            {
                "name": "farming",
                "level": 1,
                "practice": 0
            },
            {
                "name": "weatherwatching",
                "level": 1,
                "practice": 0
            }
        ],
        'riverwalker': [
            {
                "name": "swimming",
                "level": 1,
                "practice": 0
            },
            {
                "name": "slinging",
                "level": 1,
                "practice": 0
            }
        ],
        'guardian': [
            {
                "name": "swinging",
                "level": 1,
                "practice": 0
            },
            {
                "name": "protecting",
                "level": 1,
                "practice": 0
            }
        ],
        'hunter': [
            {
                "name": "shooting",
                "level": 1,
                "practice": 0
            },
            {
                "name": "tracking",
                "level": 1,
                "practice": 0
            }
        ],
        'scout': [
            {
                "name": "sneaking",
                "level": 1,
                "practice": 0
            },
            {
                "name": "mapping",
                "level": 1,
                "practice": 0
            }
        ],
        'gourmand': [
            {
                "name": "eating",
                "level": 1,
                "practice": 0
            },
            {
                "name": "smelling",
                "level": 1,
                "practice": 0
            }
        ],
        'artist': [
            {
                "name": "singing",
                "level": 1,
                "practice": 0
            },
            {
                "name": "painting",
                "level": 1,
                "practice": 0
            }
        ],
        'forester': [
            {
                "name": "foraging",
                "level": 1,
                "practice": 0
            },
            {
                "name": "running",
                "level": 1,
                "practice": 0
            }
        ],
        'bellmaker': [
            {
                "name": "bellmaking",
                "level": 1,
                "practice": 0
            },
            {
                "name": "befriending",
                "level": 1,
                "practice": 0
            }
        ],
        'elder': [
            {
                "name": "riddling",
                "level": 1,
                "practice": 0
            },
            {
                "name": "storytelling",
                "level": 1,
                "practice": 0
            }
        ],
        'beekeeper': [
            {
                "name": "befriending",
                "level": 1,
                "practice": 0
            },
            {
                "name": "beekeeping",
                "level": 1,
                "practice": 0
            }
        ],
        'scholar': [
            {
                "name": "reading",
                "level": 1,
                "practice": 0
            },
            {
                "name": "writing",
                "level": 1,
                "practice": 0
            }
        ],
        'kitesailor': [
            {
                "name": "flying",
                "level": 1,
                "practice": 0
            },
            {
                "name": "weatherwatching",
                "level": 1,
                "practice": 0
            }
        ],
        'treerunner': [
            {
                "name": "climbing",
                "level": 1,
                "practice": 0
            },
            {
                "name": "running",
                "level": 1,
                "practice": 0
            }
        ],
        'courier': [
            {
                "name": "befriending",
                "level": 1,
                "practice": 0
            },
            {
                "name": "carrying",
                "level": 1,
                "practice": 0
            }
        ],
        'carpenter': [
            {
                "name": "building",
                "level": 1,
                "practice": 0
            },
            {
                "name": "foraging",
                "level": 1,
                "practice": 0
            }
        ],
        'maiden': [
            {
                "name": "befriending",
                "level": 1,
                "practice": 0
            },
            {
                "name": "singing",
                "level": 1,
                "practice": 0
            }
        ],
        'blacksmith': [
            {
                "name": "building",
                "level": 1,
                "practice": 0
            },
            {
                "name": "swinging",
                "level": 1,
                "practice": 0
            }
        ],
        'thief': [
            {
                "name": "sneaking",
                "level": 1,
                "practice": 0
            },
            {
                "name": "stabbing",
                "level": 1,
                "practice": 0
            }
        ],
        'spearbearer': [
            {
                "name": "stabbing",
                "level": 1,
                "practice": 0
            },
            {
                "name": "singing",
                "level": 1,
                "practice": 0
            }
        ],
        'pirate': [
            {
                "name": "sailing",
                "level": 1,
                "practice": 0
            },
            {
                "name": "swinging",
                "level": 1,
                "practice": 0
            }
        ],
        'poet': [
            {
                "name": "singing",
                "level": 1,
                "practice": 0
            },
            {
                "name": "riddling",
                "level": 1,
                "practice": 0
            }
        ],
        'brewer': [
            {
                "name": "brewing",
                "level": 1,
                "practice": 0
            },
            {
                "name": "smelling",
                "level": 1,
                "practice": 0
            }
        ],
        'mysterio': [
            {
                "name": "riddling",
                "level": 1,
                "practice": 0
            },
            {
                "name": "sneaking",
                "level": 1,
                "practice": 0
            }
        ],
        'miner': [
            {
                "name": "digging",
                "level": 1,
                "practice": 0
            },
            {
                "name": "carrying",
                "level": 1,
                "practice": 0
            }
        ],
        'cartographer': [
            {
                "name": "mapping",
                "level": 1,
                "practice": 0
            },
            {
                "name": "weatherwatching",
                "level": 1,
                "practice": 0
            }
        ]
    };

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

            // if (max < 4) {
            //     practice(room, index, skill);
            // }

            var name = gamedata[room]['profiles'][index]['character'];
            if (!name) {
                name = "character" + (index+1);
            }

            io.to(room).emit('roll result', {'character': name, 'skill': skill, 'result': max, 'html': output});
        });

        socket.on('roll 1d6', function(data) {
            let room = socket.room;
            let index = data.index;
            let name = gamedata[room]['profiles'][index]['character'];
            if (!name) {
                name = "character" + (index+1);
            }
            let result = Math.floor((Math.random() * 6) + 1);

            io.to(room).emit('1d6 result', {'character': name, 'result': result});
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
            let room = socket.room;
            let index = data.index;
            let skill = data.skill.toLowerCase();
            let found = false;
            let p = gamedata[room]['profiles'][index];
            let remove = false;
            let minusPractice = false;
            let minusLevel = false;

            if (skill.substring(0,6) == "remove") {
                remove = true;
                // cut out the remove prefix
                skill = skill.substring(6);
            }
            else if (skill.substring(0,2) == '--') {
                minusLevel = true;
                // cut out the prefix
                skill = skill.substring(2);
            }
            else if (skill.substring(0,1) == '-') {
                minusPractice = true;
                // cut out the prefix
                skill = skill.substring(1);
            }

            let i = findSkill(skill, p['skills']);
            if (i != -1) {
                if (remove) {
                    // remove from skill list
                    p['skills'].splice(i, 1);
                }
                else if (minusPractice && p['skills'][i]['practice'] > 0) {
                    p['skills'][i]['practice'] -= 1;
                }
                else if (minusLevel && p['skills'][i]['level'] > 1) {
                    p['skills'][i]['level'] -= 1;
                }
            }

            if (i == -1 && !remove) { // if adding a skill that doesn't exist
                // a new skill start with 1 dot/level and 0 practice
                p['skills'].push({'name': skill, 'level': 1, 'practice': 0});
            }

            gamedata[room]['profiles'][index] = p;

            updateClients(room);
        });
        function findSkill(skill, skilllist) {
            var index = -1; // if not found

            for(let i = 0; i < skilllist.length; i++) {
                if (skilllist[i]['name'] == skill) {
                    index = i;
                    break;
                }
            }

            return index;
        }

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
            if (field == 'background') {
                addStartingSkills(room, index, value);
                io.to(room).emit('update skills', {'index': index, 'skills': gamedata[room]['profiles'][index]['skills']});
            }

            io.to(room).emit('update field', {'field': field, 'number': (index+1), 'value': value});
        });

        function addStartingSkills(room, index, background) {
            var p = gamedata[room]['profiles'][index];

            if (startingskills[background]) {
                for (let i = 0; i < startingskills[background].length; i++) {
                    if (findSkill(startingskills[background][i]['name'], p['skills']) == -1) {
                        p['skills'].push(startingskills[background][i]);
                    }
                }
            }

            gamedata[room]['profiles'][index] = p;
        }

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
