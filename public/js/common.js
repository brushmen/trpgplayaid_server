
function sanitize(str, type='number') {
    var result = str ? str : '';

    if (type == 'number') {
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

    //console.log('sanitize ' + str + ' to ' + result);

    return result;
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function getTodayString () {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    var str = yyyy + mm + dd;
    return str;
}

function ucFirstLetter(str) {
    var result = str;
    if (result) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    return result;
}

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    var element = document.getElementById(elmnt.id + "Header");
    if (element) {
        // if present, the header is where you move the DIV from:
        element.onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = stopDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position, but never far beyond broswer width or height
        var newtop = elmnt.offsetTop - pos2;
        var newleft = elmnt.offsetLeft - pos1;
        var size = {
            width: window.innerWidth || document.body.clientWidth,
            height: window.innerHeight || document.body.clientHeight
        }
        var width = e.srcElement.clientWidth;
        var height = e.srcElement.clientHeight;
        if (newtop < 0) {
            newtop = 0;
        } else if ((newtop + height) > size.height) {
            newtop = size.height - height;
        }
        if (newleft < 0) {
            newleft = 0;
        } else if ((newleft + width) > size.width) {
            newleft = size.width - width;
        }
        elmnt.style.top = newtop + "px";
        elmnt.style.left = newleft + "px";
    }

    function stopDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function formatTime(time) {
    var min = parseInt(time / 6000);
    var sec = parseInt(time / 100) - (min * 60);
    return (min > 0 ? min.toString().padStart(2, '0') : "00") + ":" + sec.toString().padStart(2, '0');
}

function fillArrayWithNumbers(n) {
  var arr = Array.apply(null, Array(n));
  return arr.map(function (x, i) { return i });
}

function shuffle(array) {
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
}

function convertToIcon(str, sourceType='d6', targetType='pips') {
    var html = '';
    var list = [];

    if (sourceType == 'd6' && targetType == 'pips') {
        var matches = str.match(/\(([1-6\s\+]+)\)/);
        if (str && matches) {
            if (matches[1]) {
                var numbers = matches[1].split('+');
                for (var i = 0; i < numbers.length; i++) {
                    var n = parseInt(numbers[i].trim());
                    var pip = '';
                    if (n == 1) {
                        pip = '⚀';
                    }
                    else if (n == 2) {
                        pip = '⚁';
                    }
                    else if (n == 3) {
                        pip = '⚂';
                    }
                    else if (n == 4) {
                        pip = '⚃';
                    }
                    else if (n == 5) {
                        pip = '⚄';
                    }
                    else {
                        pip = '⚅';
                    }
                    list.push(pip);
                }
            }
        }
    }

    html = list.join(' ');

    return html;
}
