module.exports = {
  sanitize: function (str, type='statvalue') {
      var result = str ? str : '';

      if (type == 'statvalue') {
          result = result.replace(/[^0-9\-]/gi, ''); // replace non-digits
          result = parseInt(result);
          if (parseInt(result) == null) {
              result = '';
          }
      }
      else if (type == 'name') {
          result = result.replace(/[^a-zA-Z\s]/g, ''); // replace non-word and extra spaces
          result = result.trim();
      }
      else if (type == 'alphanumeric') {
          result = result.replace(/[^a-zA-Z0-9\s]/g, ''); // replace non-word and extra spaces
          result = result.trim();
      }
      else if (type == 'time') {
          result = result.trim();
          var date = new Date();
          var h, m, n;
          var matches;

          // if input includes am or pm indicator,
          // convert to 4 digit numbers first

          if (result.match(/^(\d{1,4}|\d{1,2}:\d{2})\s?(a|p)m$/i)) {
              matches = result.match(/^(\d{1,4}|\d{1,2}:\d{2})\s?(a|p)m$/i);

              n = matches[1];
              if (n.indexOf(':') !== -1) {
                  var parts = n.split(':');
                  h = parseInt(parts[0]);
                  m = parseInt(parts[1]);

                  if (h > 24 || h < 0) {
                      h = 24;
                  }
                  if (m > 60 || m < 0) {
                      m = 0;
                  }

                  h = h.toString().padStart(2, '0');
                  m = m.toString().padStart(2, '0');
                  n = h + m;
                  //console.log('h ' + h + ' m ' + m + ' n ' + n);
              }

              // if string starts with 2 leading 0s, means time is in minutes
              if (n.substring(0,2) != "00") {
                  n = parseInt(n);
                  if (n < 100) {
                      n *= 100;
                  }
              }
              n = parseInt(n);

              if (matches[2] == 'p' && n <= 1200) {
                  n += 1200;
              }

              result = n.toString().padStart(4, '0');

              //console.log('result ' + result + ' n ' + n);
          }

          if (result.match(/^(\d{4})$/)) {
              matches = result.match(/^(\d{4})$/); // 4 digits
              h = parseInt(matches[1].slice(0,2));
              if (h > 24) {
                  h = 24;
              } else if (h < 0) {
                  h = 0;
              }
              m = parseInt(matches[1].slice(2,4));
              if (m > 60 || m < 0) {
                  m = 0;
              }

              result = h * 100 + m;

              result = result.toString().padStart(4, '0');
          }
          else {
              result = '0000'; // default value
          }
      }

      //console.log('sanitize ' + str + ' to ' + result);

      return result;
  },

  checkUserName: function (name, namelist) {
      var name = this.sanitize(name, 'alphanumeric');
      if (!name) {
          // if name is empty
          name = 'player1';
      }

      var v = 1;
      while (namelist.indexOf(name) !== -1) {
          // if username already exist, generate a new one
          v++;
          name = 'player' + v;
      }

      //console.log('unique username: ' + name);

      return name;
  },

  isJSON: function (str) {
      if( typeof( str ) !== 'string' ) {
          return false;
      }
      try {
          JSON.parse(str);
          return true;
      } catch (e) {
          return false;
      }
  },

  getTodayString: function () {
      var today = new Date();
      var dd = String(today.getDate()).padStart(2, '0');
      var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = today.getFullYear();
      var str = yyyy + mm + dd;
      return str;
  },

  shuffle: function (array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
          // Pick a remaining element...
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;

          // And swap it with the current element.
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
        }

        return array;
    },

    fillArrayWithNumbers: function(n) {
        var arr = Array.apply(null, Array(n));
        return arr.map(function (x, i) { return i });
    },

    diceRoller: function (str) {
        var output = str;
        var matches;

        if (str.match(/^lb[1-9]\d?/i)) {
            // lady blackbird style dice rolls
            matches = str.match(/(\d+)/);
            output = this.lbDice(parseInt(matches[0]));
        }
        else if (str.match(/^(aw|how)-?\d/i)) {
            // apocalypse world style dice rolls
            // hearts of wulin uses the same rule, so should also match
            matches = str.match(/(-?\d+)/);
            output = this.awDice(parseInt(matches[0]));
        }
        else if (str.match(/^da-?\d/i)) {
            // dragon age style dice rolls
            matches = str.match(/(-?\d+)/);
            output = this.daDice(parseInt(matches[0]));
        }

        else if (str.match(/^d[1-9]\d{0,4}$/i)) {
            // just a single x-sided die, between 1 and 19999
            matches = str.match(/(\d+)/);
            // ignore a possibly matched 0-sided die
            if (parseInt(matches[0]) != 0) {
                output = this.dx(parseInt(matches[0]));
            }
        }
        else if (str.match(/^\d{1,2}d\d{1,2}(([\+\-][1-9])|([\+\-][1-9]\d))?$/i)) {
            // general-purpose x number of x-sided dice, x between 0 to 99
            matches = str.match(/(-?\d+)/g);
            var num = parseInt(matches[0]);
            var sides = parseInt(matches[1]);
            var bonus = 0;
            if (matches.length > 2) {
                // has a bonus value
                bonus = parseInt(matches[2]);
            }
            if (num == 0 || sides == 0) {
                // ignore the roll, only return bonus if any
                if (bonus > 0) {
                    output = bonus + '';
                }
            } else {
                output = this.xdx(num, sides, bonus);
            }
        }
        else if (str.match(/^dd-?\di?/i)) {
            // d&d style dice rolls
            matches = str.match(/(-?\d+)/g);
            var i_matches = str.match(/i$/i);
            output = this.ddDice(parseInt(matches[0]), i_matches);
        }

        return output;
    },

    lbDice: function (n) {
        var hits = 0;
        var result = 0;
        var results = new Array();
        var expanded = '';
        var output = '';

        for (var i = 0; i < n; i++) {
            result = Math.floor((Math.random() * 6) + 1);
            results.push(result);
            if (result > 3) {
                hits++;
            }
        }

        expanded = '( ' + results.join('+') + ' ) = ' + results.reduce(function(a,b) {
            return a + b;
        });
        output += '<span title="' + expanded + '">' +
            hits + ' hit';

        if (hits > 1) {
             output += 's';
        }

        output += '</span>';

        return output;
    },

    awDice: function (n) {
        var results = new Array();
        var total = 0;
        var expanded = '';
        var output = '';

        for (var i = 0; i < 2; i++) {
            // roll 2d6
            results.push(Math.floor((Math.random() * 6) + 1));
        }

        total = results.reduce(function(a,b) {
            return a + b;
        });
        total += n;

        expanded = '( ' + results.join('+') + ' ) + ' + n;
        output += '<span title="' + expanded + '">' + total + '</span>';
        if (total > 9) {
            output += ', <span class="text-success">success!</span>';
        } else if (total > 6) {
            output += ', <span class="text-secondary">???</span>';
        } else {
            output += ', <span class="text-danger">miss!</span>';
        }

        return output;
    },

    daDice: function (n) {
        var results = new Array();
        var total = 0;
        var expanded = '';
        var result = 0;
        var dragondie = 0;
        var output = '';

        for (var i = 0; i < 3; i++) {
            // roll 3d6
            result = Math.floor((Math.random() * 6) + 1);
            if (i == 2) {
                // last die represents dragon die
                dragondie = result;
            }
            results.push(result);
        }

        total = results.reduce(function(a,b) {
            return a + b;
        });
        total += n;

        expanded = '( ' + results.join('+') + ' ) + ' + n;
        output += '<span title="' + expanded + '">' + total + ' (Dragon Die: ' + dragondie + ')';
        output += '</span>';

        return output;
    },

    dx: function (n) {
        // n-sided dice without bonus
        var output = '';
        var result = 0;

        result = Math.floor((Math.random() * n) + 1);
        output += '<span title="(' + result + ')">';
        if (n == 2) {
            if (result == 1) {
                output += 'coin flip: head';
            } else {
                output += 'coin flip: tail';
            }
        }
        else {
            output += 'd' + n + ' roll: ' + result;
        }
        output += '</span>';

        return output;
    },

    xdx: function (num,sides,bonus) {
        var output = '';
        var results = new Array();
        var total = 0;
        var expanded = '';
        var output = '';

        for (var i = 0; i < num; i++) {
            results.push(Math.floor((Math.random() * sides) + 1));
        }

        total = results.reduce(function(a,b) {
            return a + b;
        });
        total += bonus;

        expanded = '( ' + results.join('+') + ' ) + ' + bonus;
        output += '<span title="' + expanded + '">' + total;
        output += '</span>';

        return output;
    },

    ddDice: function (n, inspiration=false) {
        var result = 0;
        var results = new Array();
        var output = '';
        var rolls = 1;

        if (inspiration) {
            rolls = 2;
        }

        for (var i = 0; i < rolls; i++) {
            results.push(Math.floor((Math.random() * 20) + 1));
        }

        if (inspiration) {
            // choose the higher value
            if (results[0] > results[1]) {
                result = results[0];
            } else {
                result = results[1];
            }
        }
        else {
            result = results[0];
        }

        output += '<span title="( ' + results[0] + ' ) + ' + n;
        if (inspiration) {
            output += ' and ( ' + results[1] + ' ) + ' + n;
        }
        output += '">' + (result + n);

        if (inspiration) {
            output += ' (the higher result)';
        }

        output += '</span>';

        return output;
    }
};
