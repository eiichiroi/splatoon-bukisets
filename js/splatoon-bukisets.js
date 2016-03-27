if (typeof jQuery === 'undefined') {
    throw new Error('Splatoon bukisets JavaScript require jQuery')
}

(function (namespace) {
    namespace.XorShift128 = function (seed) {
	this.srandom(seed);
    }

    namespace.XorShift128.prototype.srandom = function (seed) {
	this.seed = seed;
	this.x = 123456789;
	this.y = 362436069;
	this.z = 521288629;
	this.w = seed || 88675123;
	for (var i = 0; i < 100; i++) {
	    this.rand();
	}
    }

    // rand return [0, 4294967296)
    namespace.XorShift128.prototype.rand = function () {
	var t = this.x ^ this.x << 11;
	this.x = this.y;
	this.y = this.z;
	this.z = this.w;
	this.w = (this.w ^ this.w >>> 19) ^ (t ^ t >>> 8);
	return this.w >>> 0;
    }

    // random return [0, 1)
    namespace.XorShift128.prototype.random = function () {
	return this.rand() / 4294967296.0;
    }

    namespace.XorShift128.prototype.getSeed = function () {
	return this.seed;
    }
})(window);

var xorshift = new XorShift128();

function formatBukiImpl(buki) {
    return '<td>'
	+ '<img '
	+ 'src="' + buki.url + '" '
	+ 'alt="' + buki.name + '" '
	+ 'title="' + buki.name + '" '
	+ 'width="' + buki.width/2 + '" '
	+ 'height="' + buki.height/2 + '" '
	+ '>'
	+ '</td>';
}

function formatBuki(bukiList, indices, index) {
    return '<tr>'
	+ '<th>' + (index + 1).toString() + '</th>'
	+ '<td>' + bukiList[indices[index]].main_weapon.name + '</td>'
	+ formatBukiImpl(bukiList[indices[index]].main_weapon)
	+ formatBukiImpl(bukiList[indices[index]].sub_weapon)
	+ formatBukiImpl(bukiList[indices[index]].special_weapon)
	+ '</tr>';
}

function getBukiList() {
    var buki_list = [];
    $.getJSON('js/buki_list.json', function(data) {
	buki_list = data;
    });
    return buki_list;
}

function range(from, to) {
    var array = [];
    for (var i = from; i <= to; i++) {
	array.push(i);
    }
    return array;
}

function shuffle(array) {
    var n = array.length, t, i;
    while (n) {
	i = Math.floor(xorshift.random() * n--);
	t = array[n];
	array[n] = array[i];
	array[i] = t;
    }
    return array;
}

function drawBukiConsideringPopularity(bukiList) {
    var probability = xorshift.random();
    for (var index = 0; index < bukiList.length; index++) {
	probability -= bukiList[index].popularity;
	if (probability <= 0) {
	    return index;
	}
    }
    return bukiList.length - 1;
}

function drawBukiAtRandom(bukiList) {
    return Math.floor(xorshift.random() * bukiList.length);
}

function drawBukiSetsUnique(bukiList, sizeOfBukiSet, popular) {
    if (popular) {
	var array = [];
	while (array.length < sizeOfBukiSet) {
	    var index = drawBukiConsideringPopularity(bukiList);
	    if (array.indexOf(index) == -1) {
		array.push(index);
	    }
	}
	return array;
    } else {
	return shuffle(range(0, bukiList.length-1)).slice(0, sizeOfBukiSet);
    }
}

function drawBukiSetsNonUnique(bukiList, sizeOfBukiSet, popular) {
    if (popular) {
	var array = [];
	for (var i = 0; i < sizeOfBukiSet; i++) {
	    var index = drawBukiConsideringPopularity(bukiList);
	    array.push(index);
	}
	return array;
    } else {
	var array = [];
	for (var i = 0; i < sizeOfBukiSet; i++) {
	    var index = drawBukiAtRandom(bukiList);
	    array.push(index);
	}
	return array;
    }
}

function drawBukiSets(bukiList, sizeOfBukiSet, unique, popular) {
    if (unique) {
	return drawBukiSetsUnique(bukiList, sizeOfBukiSet, popular)
    } else {
	return drawBukiSetsNonUnique(bukiList, sizeOfBukiSet, popular)
    }
}

function getURIParameter(key) {
    var regexp = new RegExp('(?:&|\\?)' + key + '=(.*?)(?:&|$)');
    var match = location.search.match(regexp);
    if(match) {
	return decodeURIComponent(match[1]);
    } else {
	return null;
    }
}

function getDrawingURL(seed) {
    var pattern = '(&|\\?)seed=(.*?)(&|$)'
    var regexp = new RegExp(pattern);
    if (location.href.match(regexp)) {
	return location.href.replace(regexp, '$1seed=' + seed.toString() + '$3');
    } else {
	if (location.search.length == 0) {
	    return location.href + '?seed=' + seed.toString();
	} else {
	    return location.href + '&seed=' + seed.toString();
	}
    }
}

function updateBukiSets(bukiList, seed) {
    xorshift.srandom(seed);
    sizeOfBukiSet = parseInt($('#size_of_bukiset option:selected').text());
    unique = $('#unique').prop('checked');
    popular = $('#popular').prop('checked');
    indices = drawBukiSets(bukiList, sizeOfBukiSet, unique, popular);
    $('#table tbody *').remove();
    for (var i = 0; i < indices.length; i++) {
	$('#table tbody').append(formatBuki(bukiList, indices, i));
    }
    $('#drawing_url').attr('placeholder', getDrawingURL(seed));
}

$(function() {
    var bukiList = getBukiList();
    var seed = getURIParameter('seed');
    if (seed == null || parseInt(seed) == NaN) {
	seed = Date.now();
    }

    updateBukiSets(bukiList, seed);
    $('#draw_button').click(function(e) {
	seed = Date.now();
	updateBukiSets(bukiList, seed);
    });

    var clipboard = new Clipboard('#copy_button', {
	text: function(trigger) {
	    return getDrawingURL(seed);
	}
    });
});
