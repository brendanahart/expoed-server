var createError = require('http-errors');

// catch 404 and forward to error handler
const didNotFindError = function(req, res, next) {
    console.log("this is an error");
};

module.exports.didNotFindError = didNotFindError;