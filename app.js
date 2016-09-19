var express = require('express');
var app = express();
var mongoose = require('mongoose');
var path = require('path');
var morgan = require('morgan');

var config = require('./config');
var setupController = require('./controllers/setupController');
var apiController = require('./controllers/apiController');

var port = process.env.PORT || 8080;

//app.use('/assets', express.static(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// use morgan to log requests to the console
app.use(morgan('dev'));

app.set('view engine', 'ejs');

app.set('superSecret', config.secret); // secret variable
//var secret = config.secret;
app.set('question_categories', config.question_categories);





mongoose.connect(config.getDbConnectionString());
setupController(app);
apiController(app);

app.listen(port);

/*
var nodemailer = require('nodemailer');

var sendPwdReset = require('./models/sendPasswordResetTemplate')


sendPwdReset({
    to: 'skhan231@uic.edu'
}, {
    username: 'Node Mailer',
    reset: 'https://www.example.com/reset?token=<unique-single-use-token>'
}, function(err, info){
    if(err){
        console.log('Error');
    }else{
        console.log('Password reset sent');
    }
});

*/