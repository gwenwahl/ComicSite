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

    var connection = mysql.createConnection(config);
    //Let's get some navigation going on
    if (req.query.comic) {
        //Load specific comic, and navigation logic for it, also handle invalid requests
        var specComicQuery = "SELECT * FROM Comics " +
                             "WHERE NOW() > Display_Date " +
                             "AND Comic_Number = '"+req.query.comic+"'";
        connection.query(specComicQuery, function (err, comicRes) {
            if (err) throw err;
            if (comicRes.length > 0) {
                //Determine previous comic
                var prev = parseInt(comicRes[0].Comic_Number) - 1;
                var next = prev + 2;
                if (prev < 1) {
                    //This is the first and last comic
                    prev = '#';
                } else {
                    prev = 'http://holeystonescomic.com/?comic=' + prev;
                }
                //Check next comic
                var nextQuery = "SELECT * FROM Comics " +
                                "WHERE Comic_Number = '"+next+"' " +
                                "AND NOW() > Display_Date";
                connection.query(nextQuery, function (err, nextRes) {
                    if (err) throw err;
                    if (nextRes.length < 1) {
                        next = '#';
                    } else {
                        next = 'http://holeystonescomic.com/?comic=' + next;
                    }
                    res.render('index', {
                        comicText  : comicRes[0].Comic_Text,
                        comicTitle : comicRes[0].Comic_Title,
                        comicURL   : comicRes[0].Comic_URL,
                        nextComic  : next,
                        prevComic  : prev,
                        disqusID   : sha256('comic' + comicRes[0].Comic_Number)
                    });
                });
            } else {
                //Display 404
                console.log("404 triggered");
                res.render('404');
            }
        });
    } else {
        //Load most recent comic, and navigation logic for it
        var latestComicQuery = "SELECT * FROM Comics " +
                               "WHERE NOW() > Display_Date " +
                               "ORDER BY Comic_Number Desc " +
                               "LIMIT 1";
        connection.query(latestComicQuery, function (err, comicRes) {
            //Consider rendering a 503 as well
            if (err) throw err;
            if (comicRes.length > 0) {
                //Determine previous comic
                var prev = parseInt(comicRes[0].Comic_Number) - 1;
                if (prev < 1) {
                    //This is the first and last comic
                    prev = '#';
                } else {
                    prev = 'http://holeystonescomic.com/?comic=' + prev;
                }
                res.render('index', {
                    comicText  : comicRes[0].Comic_Text,
                    comicTitle : comicRes[0].Comic_Title,
                    comicURL   : comicRes[0].Comic_URL,
                    nextComic  : '#',
                    prevComic  : prev,
                    disqusID   : sha256('comic' + comicRes[0].Comic_Number)
                });
            } else {
                //Display 404
                res.render('404');
            }
        });
    }
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
        var comicNum   = req.body.comicNum,
            comicDate  = req.body.comicDate,
            comicText  = req.body.comicText,
            comicUrl   = req.files.userPhoto.path.substr(6),
            comicTitle = req.body.comicTitle;

        var insertQuery = "INSERT INTO Comics (Comic_Number, Comic_URL, Uploaded_Date, Display_Date, Comic_Text, Comic_Title) " +
                          "VALUES ('"+comicNum+"', '"+comicUrl+"', NOW(), '"+comicDate+"', '"+comicText+"', '"+comicTitle+"')";
        console.log(insertQuery);
        connection.query(insertQuery, function (err) {
            if (err) throw err;
            res.end("File uploaded.");
        });
    }
});

app.get('/About', function (req, res) {
    res.render('about');
});

app.get('/Archive', function (req, res) {
    res.render('archive');
});

app.get('/Characters', function (req, res) {
    res.render('characters');
});

app.get('/Links', function (req, res) {
    res.render('links');
});

app.get('*', function (req, res) {
   res.render('404');
});

app.listen(80, function () {
    console.log('Application listening on port 8080');
});