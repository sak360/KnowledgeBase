var nodemailer = require('nodemailer');

var htmlToText = require('nodemailer-html-to-text').htmlToText; //html to text extension

var transporter = nodemailer.createTransport('smtps://EMAIL%40gmail.com:PASSWORD@smtp.gmail.com'); //update with email and password

transporter.use('compile', htmlToText());

// create template based sender function 
var sendPwdReset = transporter.templateSender({
    subject: 'LTS Knowledge Base - Password reset for {{username}}!',
    html: 'Hello, <strong>{{username}}</strong>,<br><br> Please click <a href="{{ reset }}">HERE</a> to reset your password.<br><br>LTS - UIC'
}, {
    from: 'Shahbaz <skhan231@uic.edu>', // update with your name and email
});

module.exports = sendPwdReset;