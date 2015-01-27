/**
 * Created by Gwen on 1/17/15.
 */

var mysql  = require('mysql');
var sha256 = require('sha256');

var connection = mysql.createConnection({
    socketPath : '/var/run/mysqld/mysqld.sock',
    user     : 'remoteAdmin',
    password : 'test',
    database : 'holey_stones'
});

connection.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    var password = "4951Gwen!";

    var salt = Math.random() * 100000;

    //Hash password and salt

    var passHash = sha256(password);
    var saltHash = sha256(salt);

    var passAndSalt = passHash + saltHash;

    var finalPass = sha256(passAndSalt);

    console.log('connected as id ' + connection.threadId);
    var query = "INSERT INTO Users (User_Name,Password_Hash,Salt) VALUES ('jwahl', '"+finalPass+"', '"+saltHash+"')";
    console.log(query);
    connection.query(query, function (err) {
        if (err) throw err;
        console.log('success');
    })
});

