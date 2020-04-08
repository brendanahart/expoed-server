const util = require('util');
var mysql = require('mysql');

var constants = require('./constants');

var pool = mysql.createPool({
    connectionLimit : 100,
    host : constants.dbConstants['host'],
    user : constants.dbConstants['user'],
    password : constants.dbConstants['password'],
    database : constants.dbConstants['database'],
    debug : false
});

// Promisify for Node.js async/await.
pool.query = util.promisify(pool.query).bind(pool);

module.exports = pool;