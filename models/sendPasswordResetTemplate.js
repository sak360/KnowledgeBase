var nodemailer = require('nodemailer');

var htmlToText = require('nodemailer-html-to-text').htmlToText; //html to text extension

var transporter = nodemailer.createTransport('smtps://skhan231%40uic.edu:Sak360360!@smtp.gmail.com');

transporter.use('compile', htmlToText());

// create template based sender function 
var sendPwdReset = transporter.templateSender({
    subject: 'LTS Knowledge Base - Password reset for {{username}}!',
    //text: 'Hello, {{username}}, Please go here to reset your password: {{ reset }}',
    html: 'Hello, <strong>{{username}}</strong>,<br><br> Please click <a href="{{ reset }}">HERE</a> to reset your password.<br><br>LTS - UIC'
}, {
    from: 'Shahbaz <skhan231@uic.edu>',
});

module.exports = sendPwdReset;