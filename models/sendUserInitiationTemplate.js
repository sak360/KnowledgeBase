var nodemailer = require('nodemailer');

var htmlToText = require('nodemailer-html-to-text').htmlToText; //html to text extension

var transporter = nodemailer.createTransport('smtps://EMAIL%40gmail.com:PASSWORD@smtp.gmail.com'); //update with email and password

transporter.use('compile', htmlToText());

// create template based sender function 
var sendPwdReset = transporter.templateSender({
    subject: 'LTS Knowledge Base - {{username}}, you have been added!',
    html: 'Hello, <strong>{{username}}</strong>,<br><br> You have been added to the LTS Knowledge base. Please click <a href="{{ knowledge_base_url }}">HERE</a> to navigate to it. You would need to reset your password by clicking the "Forgot the password" link before you can access it.<br><br>LTS - UIC'
}, {
    from: 'Shahbaz <skhan231@uic.edu>', // update with your name and email
});

module.exports = sendPwdReset;