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
    , multer     = require('multer')
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

//File upload logic
var done        =    false;
app.use(multer({ dest: './public/images/comics',
    rename: function (fieldname, filename) {
        return filename;
    },
    onFileUploadStart: function (file) {
        console.log(file.originalname + ' is starting ...')
    },
    onFileUploadComplete: function (file) {
        console.log(file.fieldname + ' uploaded to  ' + file.path)
        done=true;
    }
}));
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

app.get('/admin', function (req, res) {
    res.redirect('/login');
});

app.post('/UploadFiles', function(req,res){
    console.log('request received');
    if(done==true){
        console.log(req.files);
        console.log(req.body);
        var connection = mysql.createConnection(config);
        //Insert data into the database
        var comicNum = req.body.comicNum,
            comicDate = req.body.comicDate,
            comicText = req.body.comicText,
            comicUrl  = req.files.userPhoto.path;

        var insertQuery = "INSERT INTO Comics (Comic_Number, Comic_URL, Uploaded_Date, Display_Date, Comic_Text) " +
                          "VALUES ('"+comicNum+"', '"+comicUrl+"', NOW(), '"+comicDate+"', '"+comicText+"')";
        console.log(insertQuery);
        connection.query(insertQuery, function (err) {
            if (err) throw err;
            res.end("File uploaded.");
        });
    }
});

app.listen(80, function () {
    console.log('Application listening on port 8080');
});