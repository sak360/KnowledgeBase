var configValues = require('./config'); //require json with credentials
var mysql = require('mysql');//library to connect and interact with mysql databases

//export the actual connection string. Could be made so param lets you switch between dev and production
module.exports = {
    
    getDbConnectionString: function () {
        return 'mongodb://' + configValues.uname + ':' + configValues.pwd + configValues.dbURL;
    },    
    secret: configValues.secret,
    question_categories: configValues.question_categories,
    //establishing connection with mySQL DB
    mysql_con : mysql.createConnection({
        host: configValues.mySQLDB_host,
        user: configValues.mySQLDB_uname,
        password: configValues.mySQLDB_pwd,
        database: configValues.mySQLDB_DBname
    })
}
