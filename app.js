/**
 * Created by Gwendolyn on 1/16/15.
 */

/*
 * Module dependencies
 */
var   express    = require('express')
    , stylus     = require('stylus')
    , session    = require('express-session')
    , bodyParser = require('body-parser')
    , mysql      = require('mysql')
    , sha256     = require('sha256')
    , nib        = require('nib');

var app = express();
function compile(str, path) {
    return stylus(str)
        .set('filename', path)
        .use(nib())
}

var config = {
    socketPath : '/var/run/mysqld/mysqld.sock',
    user     : 'ComicReporter',
    password : 'BatteryStaple',
    database : 'holey_stones'
};

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser.json() );        // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
app.use(session({secret: 'penguin'}));
app.use(stylus.middleware(
    { src: __dirname + '/public'
        , compile: compile
    }
));
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.render('index',
        { title : 'Home' }
    );
});

app.post('/admin', function (req, res) {
    var userName = req.body.userName;
    var password = req.body.password;

    //Authenticate the supplied credentials
    var connection = mysql.createConnection(config);
    //First get user name based on supplied username
    connection.query("SELECT * FROM Users WHERE User_Name = '"+userName+"'", function (err, result) {
        if (err) throw err;

        //If non-existent user
        if (result.length < 1) {
            res.redirect('/login?e=true');
        }

        //Otherwise check if password is valid
        var passwordHash = sha256(password);
        var passSalt     = passwordHash + result[0].Salt;
        var finalHash    = sha256(passSalt);

        if (finalHash !== result[0].Password_Hash) {
            res.redirect('/login?e=true');
        } else {
            res.render('admin');
        }
    });
});

app.get('/login', function (req, res) {
    var err = "";
    if (req.query.e) {
        err = "Invalid Username or Password";
    }
    res.render('login', {
        error : err
    });
});

app.listen(80, function () {
    console.log('Application listening on port 8080');
});