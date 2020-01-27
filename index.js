'use strict';

var middleware = {};

function loadMiddleware (midname) {

    var mid = middleware[midname];
    if (mid !== undefined) {
        return middleware[midname];
    }

    switch (midname) {
        case 'cookie':
            mid = require('./middleware/titbit-cookie');
            break;
        case 'session':
            mid = require('./middleware/titbit-session');
            break;
        case 'cors':
            mid = require('./middleware/titbit-cors');
            break;
        default:
            throw new Error(`Can not found module: ${mdiname}`);       
    }
    middleware[midname] = mid;

    return mid;
}

exports.cookie = function() {
    return loadMiddleware('cookie');
};

exports.session = function () {
    return loadMiddleware('session')().callback;
};

exports.cors = function () {
    var mw = loadMiddleware('cors');
    var mobj = new mw();
    return mobj;
};

exports.imgfilter = function () {

};

exports.staticServ = function () {

};
