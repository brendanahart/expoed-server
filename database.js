var sqlString = require('sqlstring');
var pool = require('./pool');

const query_database = async function handle_database(query) {
    try {
        return await pool.query(query);
    } catch(e) {
        throw(e);
    }
};

const check_empty_rows = function check_empty_rows(rows) {
    return rows === undefined || rows.length == 0;
};

const get_first_row = function get_first_row(rows) {
    return rows[0];
};

const format_query = function format_query(query_string, variables) {
    return sqlString.format(query_string, variables);
};

module.exports.query_database = query_database;
module.exports.format_query = format_query;
module.exports.check_empty_rows = check_empty_rows;
module.exports.get_first_row = get_first_row;