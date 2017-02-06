//this page will handle the api endpoints
var knowledgeArticleModel = require('../models/knowledgeArticleModel');//get the todoModel
var express = require('express');

var device = require('express-device');//library to see what device is being used by the user
var moment = require('moment');// a library for time formatting and processing (great with time zones etc.)


var bodyParser = require('body-parser');
var mysql = require('mysql');//library to connect and interact with mysql databases
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var bcrypt = require('bcrypt-nodejs');//used to encrypt passwaords and check passwords against generated hash

var config = require('../config');
var con = config.mysql_con;


var sendPwdReset = require('../models/sendPasswordResetTemplate');//importing the password reset email template
var sendInitEmail = require('../models/sendUserInitiationTemplate');//importing the template for email sent when user is added to the kB


var authenticatedApiRouter = express.Router();   //router for authenticated API
var authenticatedRenderRouter = express.Router();//router for pages to render
var authenticationRouter = express.Router();//router for authentication (page and api)

//var domainURL = 'http://skhan231.people.uic.edu:8080';//update for base domainURL
//var domainURL = 'http://localhost';//update for base domainURL
var domainURL = 'http://ltskb.uic.edu:8005'; //8005

var baseURL = '/LTS_KB'
var loginURL = baseURL + '/auth';
var knowledgeBaseURL = baseURL + '/knowledge';
var apiURL = baseURL + '/api';
var resetURL = '/resetPassword';
var resetPasswordAPI = '/passwordResetAPI';


String.prototype.addSlashes = function() 
{ 
   //no need to do (str+'') anymore because 'this' can only be a string
   return this.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
} 


module.exports = function(app) {
    
    //use middleware to parse out json from the HTTP response body
    app.use(bodyParser.json());
    //make sure it can handle URL encoded data (certain charachters are converted to % sign symbols etc.)
    app.use(bodyParser.urlencoded({extended: true}));
    //captures device information and adds it to the req
    app.use(device.capture());
    

    
   // var articles;//

    /////////////////////////////////////////////////////
    //Pulling startup data from mongoDB
    /////////////////////////////////////////////////////

    //save approved articles to app variable
    knowledgeArticleModel.find({Status: 'Approved'}, function (err, knowledgeArticle) {
        if(err) throw err; 

        //save articles to the application (cache)
        app.set('articles', knowledgeArticle);

        //output count of approves documents on startup
        //console.log('articles has been updated with length: ' + app.get('articles').length);

    });

    //save submitted articles count to app variable
    knowledgeArticleModel.find({Status: 'Submitted'}, function (err, knowledgeArticle) {
        if(err) throw err; 


        app.set('submitted', knowledgeArticle.length);

        //console.log('articles that have been submitted: ' + app.get('submitted'));

    });
 



    ///////////////////////////////////////////////////////////////////////////////////////////////
    //ROUTES FOR PAGES THAT WILL BE RENDERED
    ///////////////////////////////////////////////////////////////////////////////////////////////
    


    app.get('/', function(req, res) {
	
	    res.redirect(loginURL);
	
    });

    app.get(baseURL, function(req, res) {
	
	    res.redirect(loginURL);
	
    });
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //ROUTES FOR TEST API/PAGES FOR AUTHENTICATION
    ///////////////////////////////////////////////////////////////////////////////////////////////
    
    authenticationRouter.get('/', function(req, res) {
        
        //before render, check to see if any flags (for messages) have been triggered
        var token_status, match_error, logout_status, valid_password = 'not_set';
        
        token_status = req.query.token;      
        
        match_error = req.query.match_error;

        logout_status = req.query.logout_status;

        password_error = req.query.valid;
       
                
        //have this page serve as login and POST where authentication will happen
        res.render('login', { CURR_URL: req.url, PAGE_NAME: 'login', AUTH_URL: loginURL, TOKEN_STATUS: token_status, MATCH_ERROR: match_error, LOGOUT_STATUS: logout_status, FORGOT_PASSWORD_LINK: loginURL + resetURL, PASSWORD_ERROR: password_error});
        
        
    });
    

    authenticationRouter.get(resetURL, function(req, res) {
    /*
        - WHen user asks to reset password, generate a token for them that expires in X hours
        - Send token to user (if valid email). The token will have very basic info (user firstname, lastname, and email AND a 'purpose' field that says "reset")
        - using the email in the token, we will ask to update the password (locked email field)
        - For the other authenticated routes, we need to check for a password field in the decoded token. If it does not exist, send to login page. 
    */

        var token_status, valid_status, email = 'not_set';

        match_status = req.query.valid;//if it is valid, it has been matched

        email = req.query.email;

        //check to see if token exists anywhere
        var token = req.body.token || req.query.token || req.headers['x-access-token'];
        
        //if token exists, the uer was already sent an email with the password reset link (had token as parameter)
        if (token) {

            // verifies secret and checks exp
            jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
            if (err) {
                //if token is not valid, assume it is expired and send back to lohin page
                console.log(err);  
                res.redirect(loginURL + '?token_status=expired');                
                
            } else {
                //if the token does not have the 'forPasswordReset' property, the token is not meant for password resets. Send back to login
                if(!decoded.hasOwnProperty('forPasswordReset')){
                    console.log('forPasswordReset is not a part of the decoded token');
                    res.redirect(loginURL + '?token_status=no_token');
                }
               
                //console.log('token is valid and now the passowrd reset option should show up');

                email = decoded.email;
                token_status = 'VALID';

                res.render('resetPassword', {FORGOT_PASSWORD_LINK: loginURL + resetURL, MATCH_STATUS: match_status, EMAIL: email, TOKEN_STATUS: token_status, PASSWORD_UPDATE_API: loginURL + resetPasswordAPI, TOKEN: token, LOGIN_URL: loginURL});

            }
            });
        }
        
        else
        {
            //if no token is sent, the email is yet to be sent. Display base page
            res.render('resetPassword', {FORGOT_PASSWORD_LINK: loginURL + resetURL, MATCH_STATUS: match_status, EMAIL: email, TOKEN_STATUS: token_status, PASSWORD_UPDATE_API: loginURL + resetPasswordAPI, TOKEN: token, LOGIN_URL: loginURL});

        }
        
    });

    //find user in DB and send password reset if they exist
    authenticationRouter.post(resetURL, function(req, res) {
        
        con.query('Select * from users where email="' + req.body.inputEmail +  '" limit 1', function(err, user) {
            if (err) {    
                console.log(err);     
            }
            if(user.length < 1)
            {
                res.redirect(loginURL + resetURL + '?valid=false');
            }
            else{

                //console.log('send password reset email');
                //console.log(user);
                //console.log(req.baseUrl);

                var user_info = {
                                    user_id: user[0].user_id,
                                    email: user[0].email,
                                    forPasswordReset: true
                                };
                
                var token_for_reset = jwt.sign(user_info, app.get('superSecret'), {
                        expiresIn: '8h'
                }); //superSecret set in app.js
                    
                sendPwdReset({
                        to: user[0].email
                    }, {
                        username: user[0].first_name + ' ' + user[0].last_name,
                        reset: domainURL + loginURL + resetURL + '?token=' + token_for_reset
                    }, function(err, info){
                        if(err){
                            console.log(err);
                        }else{
                            //console.log('Password reset sent');
                        }
                });

                res.redirect(loginURL + resetURL + '?valid=true&email=' + req.body.inputEmail);


            }
        });
    });

    //post API endpoint to find user in DB and update password reset if they exist and are sending a valid token
    authenticationRouter.post(resetPasswordAPI, function(req, res) {

        //console.log('params: ' + JSON.stringify(req.params));
        //console.log('body: ' + JSON.stringify(req.body));
        //console.log('query: ' + JSON.stringify(req.query));
        
        var datetime = moment().format();

        var token = req.body.token || req.query.token || req.headers['x-access-token'];
        
        if (token) {

            // verifies secret and checks for expiration
            jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
            if (err) {                
                //throw err;                
                console.log(err);
  
                //console.log('returned because no token provided');
                return res.status(403).send({ 
                    
                    success: false, 
                    message: 'No token provided.' 
                });

                
                
            } else {

                    if(!decoded.hasOwnProperty('forPasswordReset')){
                        console.log('returned because token is invalid');
                        return res.status(403).send({ 
                            success: false, 
                            message: 'Token is not valid for password resets' 
                        });                                   
                    }
                    //console.log(decoded);

                    //hash the password before storage
                    var hashed_password = bcrypt.hashSync(req.body.f_input_password);
                    //console.log(hashed_password);
                    //console.log(bcrypt.compareSync(req.body.f_input_password, hashed_password)); 

                        //update password for user
                        con.query("UPDATE users SET pass='"+ hashed_password + "' WHERE user_id="+ decoded.user_id, function(errOnUpdate, rowsOnUpdate) {
                                    
                            if(errOnUpdate)
                            {   
                                console.log('error on update');
                                console.log(errOnUpdate);
                                return res.status(503).send({ 
                                    success: false, 
                                    message: 'Failed to update password. Please try again later.' 
                                });
                            }    
                            else
                            {
                                //update activity for password reset
                                con.query("INSERT INTO activity_accumulator(activity_type, activity_timestamp, device_type, email)"
                                        + "VALUES ('password_updated','"+ datetime + "','" + req.device.type + "','" + decoded.email + "')", function(err, rows) {
                                            
                                    if(err)
                                    {
                                        console.log(err);
                                    }
                                    //if all is good, send success message
                                    return res.status(200).send({ 
                                        success: true, 
                                        message: 'Successfully updated password!' 
                                    });                            
                                });
                            }
                        });
                }
            })
        }           
        
        //if token is not provided, send back unsuccessful password update message
        else
        {
            //console.log('returned because no token provided');
            return res.status(403).send({ 
                success: false, 
                message: 'No token provided.' 
            });
        }

    });
    
    
    //post API endpoint to login and verify password
    authenticationRouter.post('/', function(req, res) {
        
        //con already defined
        con.query('Select * from users where email="' + req.body.inputEmail +  '" limit 1', function(err, user) {
        //con.query('Select * from users limit 1', function(err, user) {
            if (err) {    
                console.log(err);     
            }
            if(user.length < 1)
            {
                res.redirect(loginURL + '?valid=false');
            }
            else
            {   
                //check password and if it is correct, log and take user to KB
                pass = user[0].pass;
  
                if (!bcrypt.compareSync(req.body.inputPassword, pass)) { //check to see if encrypted password matched
                    res.redirect(loginURL + '?valid=false');
                } else {
                    
                    var token = jwt.sign(user[0], app.get('superSecret'), {
                        expiresIn: '8h'
                    }); //superSecret set in app.js
       
                    var datetime = moment().format();  
     
                    con.query("INSERT INTO activity_accumulator(activity_type, activity_timestamp, device_type, email)"
                            + "VALUES ('login_success','"+ datetime + "','" + req.device.type + "','" + user[0].email + "')", function(err, rows) {                                
                        if (err) {    
                            console.log(err);     
                        }
                    });
                    
                    //redirect to knowledge base
                    res.redirect(knowledgeBaseURL + '?token=' + token);   
                }
            }           

        });
                
    });
    
    app.use(loginURL, authenticationRouter);
    
    
    authenticatedRenderRouter.use(function(req, res, next) {

    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {

        // verifies secret and checks exp
        jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
        if (err) {
            
            //throw err;
            console.log(err);

            res.redirect(loginURL + '?token_status=expired');
            
            
        } else {
            //if the token does not have a password property, send to login page
            if(!decoded.hasOwnProperty('pass')){
                console.log('Password is not a part of the decoded token');
                res.redirect(loginURL + '?token_status=no_token');
            }
            req.decoded = decoded;
            req.token = token; 

            next();
        }
        });

    } else {

        // if there is no token, send back to login
        //no message displayed on login page if you try going in without token
        res.redirect(loginURL + '?token_status=no_token');
        
    }
    });    
    
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //ROUTES FOR THE PAGES BEHING AUTH
    ///////////////////////////////////////////////////////////////////////////////////////////////   
    
    //page displayed on login....this is the KB
    authenticatedRenderRouter.get('/', function(req, res) {
        
        token = req.query.token;
        user = req.decoded;
        res.render('knowledge', { FIRST_NAME: user.first_name, 
                                    LAST_NAME: user.last_name, 
                                    TOKEN: token, CURR_URL: req.url, 
                                    KNOWLEDGE_URL: ( apiURL + '/knowledgeArticles/mongodb'), 
                                    KNOWLEDGE_BASE_URL: knowledgeBaseURL,
                                    SUBMIT_KNOWLEDGE_URL: knowledgeBaseURL + '/submit',
                                    LOGIN_URL: loginURL,
                                    USER_TYPE: user.user_type,
                                    MODIFY_KNOWLEDGE_URL: knowledgeBaseURL + '/modify',
                                    ADD_USERS_URL: knowledgeBaseURL + '/addusers',
                                    NUMBER_OF_SUBMISSIONS_PENDING:  app.get('submitted'),
                                    SUBMISSIONS_URL: knowledgeBaseURL + '/submissions'                                       
        });
        
    });
    
    //this is the page where knowledge is submitted
    authenticatedRenderRouter.get('/submit', function(req, res) {
    
    //get the token from the URL
    token = req.token;
    //get user information from the decoded token
    user = req.decoded;

    res.render('submitKnowledge', {    FIRST_NAME: user.first_name, 
                                        LAST_NAME: user.last_name, 
                                        TOKEN: token, CURR_URL: req.url,
                                        KNOWLEDGE_URL: ( apiURL + '/knowledgeArticles/mongodb'), 
                                        QUESTION_CATEGORIES: app.get('question_categories'), 
                                        KNOWLEDGE_BASE_URL: knowledgeBaseURL,
                                        API_SUBMIT_DOCUMENT_URL:  ( apiURL + '/knowledgeArticle'),
                                        LOGIN_URL: loginURL,
                                        USER_TYPE: user.user_type,
                                        ADD_USERS_URL: knowledgeBaseURL + '/addusers',
                                        NUMBER_OF_SUBMISSIONS_PENDING:  app.get('submitted'),
                                        SUBMISSIONS_URL: knowledgeBaseURL + '/submissions' 
                                    });
    
    });

    //this is the page where an admin modifies an article
    authenticatedRenderRouter.get('/modify', function(req, res) {
    
    //get the token from the URL
    token = req.token;
    //get user information from the decoded token
    user = req.decoded;

    //make sure user is either admin or super user before accessing this page 
    if (user.user_type !== "a" && user.user_type !== "su")
    {
            return res.status(403).send({ 
                success: false, 
                message: 'Access is forbidden' 
            });
    }


    //render page with article information (if found)
    knowledgeArticleModel.findById({_id: req.query.id}, function (err, knowledgeArticle) {
        //if article isn't found, send a 404 response
        if(err){ res.status(404).send(err);}
        else{
            //if article exists, render it with the page
            res.render('modifyKnowledge', {     
                                FIRST_NAME: user.first_name, 
                                LAST_NAME: user.last_name, 
                                TOKEN: token, CURR_URL: req.url,
                                KNOWLEDGE_URL: ( apiURL + '/knowledgeArticles/mongodb'), 
                                QUESTION_CATEGORIES: app.get('question_categories'), 
                                KNOWLEDGE_BASE_URL: knowledgeBaseURL,
                                API_SUBMIT_DOCUMENT_URL:  ( apiURL + '/knowledgeArticle'),
                                LOGIN_URL: loginURL,
                                USER_TYPE: user.user_type,
                                KNOWLEDGE_ARTICLE_ID: knowledgeArticle._id,
                                KNOWLEDGE_ARTICLE_QUESTION: knowledgeArticle.Question,
                                KNOWLEDGE_ARTICLE_ANSWER: knowledgeArticle.Answer,
                                KNOWLEDGE_ARTICLE_RT_REFERENCE: knowledgeArticle.RT_reference,
                                KNOWLEDGE_ARTICLE_CATEGORY: knowledgeArticle.Category,
                                SUBMIT_KNOWLEDGE_URL: knowledgeBaseURL + '/submit', 
                                ADD_USERS_URL: knowledgeBaseURL + '/addusers',
                                NUMBER_OF_SUBMISSIONS_PENDING:  app.get('submitted'),
                                SUBMISSIONS_URL: knowledgeBaseURL + '/submissions'                                   
                            });
        }            
    }); 
    });

    //this is the page that renders to add new users to the KB
    authenticatedRenderRouter.get('/addusers', function(req, res) {

        token = req.query.token;
        
        user = req.decoded;
        //make sure user is either admin or super user before accessing this page
        if (user.user_type !== "a" && user.user_type !== "su")
        {
                return res.status(403).send({ 
                    success: false, 
                    message: 'Access is forbidden' 
                });
        }

        //this renders page with the information neeeded
        res.render('addusers', { FIRST_NAME: user.first_name, 
                                    LAST_NAME: user.last_name, 
                                    TOKEN: token, CURR_URL: req.url, 
                                    KNOWLEDGE_URL: ( apiURL + '/knowledgeArticles/mongodb'), 
                                    KNOWLEDGE_BASE_URL: knowledgeBaseURL,
                                    SUBMIT_KNOWLEDGE_URL: knowledgeBaseURL + '/submit',
                                    LOGIN_URL: loginURL,
                                    USER_TYPE: user.user_type,
                                    MODIFY_KNOWLEDGE_URL: knowledgeBaseURL + '/modify',
                                    ADD_USERS_URL: knowledgeBaseURL + '/addusers',
                                    NUMBER_OF_SUBMISSIONS_PENDING:  app.get('submitted'),
                                    SUBMISSIONS_URL: knowledgeBaseURL + '/submissions' 
                                    //ADD_USER_SUBMIT_URL:                                             
                                });                                
        
    });

    //this is the POST API endpoint to add new users and send them initiation email
    authenticatedRenderRouter.post('/addusers', function(req, res) {

        token = req.query.token;        

        user = req.decoded;
        //make sure user is either admin or super user before accessing this page
        if (user.user_type !== "a" && user.user_type !== "su")
        {
                return res.status(403).send({ 
                    success: false, 
                    message: 'Access is forbidden because of user type' 
                });
        }
        //select user from DB and if they exist, the user already exists
        con.query('Select * from users where email="' + req.body.email +  '" limit 1', function(err, user) {
            if (err) {    
                console.log(err);     
            }
            if(user.length !== 0)
            {
                return res.status(201).send({ 
                    success: false, 
                    message: 'User already exists!' 
                });
            }
            else
            {
                //if the user does not exist, move on

                //function to generate a 30 charachter password id and then has it
                function makeid()
                {
                    var text = "";
                    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                    for( var i=0; i < 30; i++ )
                        text += possible.charAt(Math.floor(Math.random() * possible.length));

                    //temp password is hashed or bCrypt will piss itself
                    var hashed_password = bcrypt.hashSync(text);

                    return hashed_password;
                }

                //users added as regular users (u)
                var user_type_to_add = 'u';
                //activity description for activity_accumulator
                var activity_type = 'added_user: ' + req.body.email;

                var datetime = moment().format();  
                //insert new user into DB
                con.query("INSERT INTO users (user_type, email, pass, first_name, last_name)"
                        + "VALUES ('" + user_type_to_add + "','" + req.body.email + "','" + makeid() + "','"+ req.body.first_name + "','"+ req.body.last_name + "')"
                        ,function(err, newUser) {                            
                            if (err) {    
                                console.log(err);     
                            }                           

                            //insert activity into activity_accumulator
                            con.query("INSERT INTO activity_accumulator (user_id, activity_type, activity_timestamp, device_type, email)"
                            + "VALUES ('" + newUser.insertId + "','" + activity_type + "','" + datetime + "','"+ req.device.type + "','"+ req.decoded.email + "')"
                            ,function(err, row) {                            
                                    if (err) {    
                                        console.log(err);     
                                    }

                                    //send initiation email
                                    sendInitEmail({
                                            to: req.body.email
                                        }, {
                                            username: req.body.first_name + ' ' + req.body.last_name,
                                            knowledge_base_url: domainURL + loginURL
                                        }, function(err, info){
                                            if(err){
                                                //if email fails, send back the appropriate response
                                                return res.status(201).send({                                                     
                                                    success: false, 
                                                    message: 'User was added but initiation email was not sent. Please verify that the email is correct. If so, let the user know that they have been added to the system' 
                                                });
                                            }else{
                                                console.log('init email sent');
                                                //if email is successful, send back the appropriate response
                                                return res.status(200).send({ 
                                                    success: true, 
                                                    message: 'User was successfully added!' 
                                                });
                                            }
                                    });
                            });
                });
            }
         });     
    });


    //this will render the page that shows a table of all outstanding submissions
    authenticatedRenderRouter.get('/submissions', function(req, res) {

    token = req.query.token;

    user = req.decoded;
    //make sure user is either admin or super user before accessing this page
    if (user.user_type !== "a" && user.user_type !== "su")
    {
            return res.status(403).send({ 
                success: false, 
                message: 'Access is forbidden because of user type' 
            });
    }

   // var submitted_articles;
       
       //get all articles that are marked as submitted
        knowledgeArticleModel.find({Status: 'Submitted'}, function (err, knowledgeArticles) {
            if (err) {    
                console.log(err);     
            }


            app.set('submitted', knowledgeArticles.length);

            //submitted_articles = knowledgeArticle;

            console.log('articles that have been submitted: ' + app.get('submitted'));

            //console.log(submitted_articles);
            
            
            //render page
            res.render('submissions', { FIRST_NAME: user.first_name, 
                                        LAST_NAME: user.last_name, 
                                        TOKEN: token, CURR_URL: req.url, 
                                        KNOWLEDGE_URL: ( apiURL + '/knowledgeArticles/mongodb'), 
                                        KNOWLEDGE_BASE_URL: knowledgeBaseURL,
                                        SUBMIT_KNOWLEDGE_URL: knowledgeBaseURL + '/submit',
                                        LOGIN_URL: loginURL,
                                        USER_TYPE: user.user_type,
                                        MODIFY_KNOWLEDGE_URL: knowledgeBaseURL + '/modify',
                                        ADD_USERS_URL: knowledgeBaseURL + '/addusers',
                                        NUMBER_OF_SUBMISSIONS_PENDING:  app.get('submitted'),
                                        SUBMISSIONS_URL: knowledgeBaseURL + '/submissions',  
                                        SUBMISSIONS_API_URL: apiURL + '/knowledgeArticlesByStatus/Submitted',
                                        REVIEW_SUBMISSIONS_URL: knowledgeBaseURL + '/reviewSubmission'                                                                                 
                                    });          
        });

    });


    //render page to review submission for specific id
    authenticatedRenderRouter.get('/reviewSubmission/:_id', function(req, res) {
            token = req.query.token;
            user = req.decoded;

            if (user.user_type !== "a" && user.user_type !== "su")
            {
                    return res.status(403).send({ 
                        success: false, 
                        message: 'Access is forbidden because of user type' 
                    });
            }

            if(req.params._id)
            {
                //make sure the article exists in the mongoDB
                knowledgeArticleModel.findById({_id: req.params._id}, function (err, knowledgeArticle) {
 
            
                if(err){ res.status(404).send(err);}
                else{                
                    //render page with information of the article to be reviewd
                    res.render('reviewSubmission', { FIRST_NAME: user.first_name, 
                                    LAST_NAME: user.last_name, 
                                    TOKEN: token, CURR_URL: req.url, 
                                    KNOWLEDGE_URL: ( apiURL + '/knowledgeArticles/mongodb'), 
                                    KNOWLEDGE_BASE_URL: knowledgeBaseURL,
                                    SUBMIT_KNOWLEDGE_URL: knowledgeBaseURL + '/submit',
                                    LOGIN_URL: loginURL,
                                    USER_TYPE: user.user_type,
                                    MODIFY_KNOWLEDGE_URL: knowledgeBaseURL + '/modify',
                                    ADD_USERS_URL: knowledgeBaseURL + '/addusers',
                                    NUMBER_OF_SUBMISSIONS_PENDING:  app.get('submitted'),
                                    SUBMISSIONS_URL: knowledgeBaseURL + '/submissions',  
                                    SUBMISSIONS_API_URL: apiURL + '/knowledgeArticlesByStatus/Submitted',
                                    REVIEW_SUBMISSIONS_URL: knowledgeBaseURL + '/reviewSubmission',
                                    KNOWLEDGE_ARTICLE_ID: knowledgeArticle._id,
                                    KNOWLEDGE_ARTICLE_QUESTION: knowledgeArticle.Question,
                                    KNOWLEDGE_ARTICLE_ANSWER: knowledgeArticle.Answer,
                                    KNOWLEDGE_ARTICLE_RT_REFERENCE: knowledgeArticle.RT_reference,
                                    KNOWLEDGE_ARTICLE_CATEGORY: knowledgeArticle.Category,
                                    KNOWLEDGE_ARTICLE_SUBMITTED_BY: knowledgeArticle.Submitted_by,
                                    QUESTION_CATEGORIES: app.get('question_categories')   ,
                                    API_SUBMIT_DOCUMENT_URL:  ( apiURL + '/knowledgeArticle'),                                                                          
                    });

                }
                })     
        
            }
            else
            {
                //if id is not detected in the url as a parameter, send forbidden code
                res.status(403).send ({
                    success: false,
                    message: 'No id deteceted'
                })
            }

    });


    app.use(knowledgeBaseURL, authenticatedRenderRouter);
    
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //ROUTES FOR THE API
    ///////////////////////////////////////////////////////////////////////////////////////////////


    authenticatedApiRouter.use(function(req, res, next) {

    //NOTE: Al updates are treated as updates in the log.

    //console.log('Request Url:' + req.url);
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {

        // verifies secret and checks exp
        jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
        if (err) {
             
            console.log(err);

            return res.status(401).send({ 
                success: false, 
                message: 'Token has expired' 
            });
            
        } else {
            // if everything is good, save to request for use in other routes
            //make sure the password is in a part of the decoded token
            if(!decoded.hasOwnProperty('pass')){
                console.log('Password is not a part of the decoded token');
                res.redirect(loginURL + '?token_status=no_token');
            }

            req.decoded = decoded;
            req.token = token; 

            next();
        }
        });

    } else {

        //API will not respond as access is forbidden without valid token          
        return res.status(403).send({ 
            success: false, 
            message: 'No token provided.' 
        });

        
    }
    });

    //this api endpoint simply sends back all approved articles in the cache
    authenticatedApiRouter.get('/knowledgeArticles/mongodb', function(req, res){
        res.send(app.get('articles'));
    });
    
    
    //api endpoint to retrieve and send documents of a specific status   
    authenticatedApiRouter.get('/knowledgeArticlesByStatus/:status', function(req, res){
        
        //.find (on mongoose) has an error first callback
        knowledgeArticleModel.find({Status: req.params.status}, function (err, knowledgeArticle) {
            if (err) {    
                console.log(err);     
            }
            
            //express will convert and send back as JSON
            res.send(knowledgeArticle);
        });
        
    });

    
    //api endpoint to find indivdual knowledge article by id
    authenticatedApiRouter.get('/knowledgeArticle/:_id', function(req, res) {
        //mongoose method
        knowledgeArticleModel.findById({_id: req.params._id}, function (err, knowledgeArticle) {
            if (err) {    
                console.log(err);     
            }
            
            res.send(knowledgeArticle);
            
        });
    });
    
    //api endpoint for POSTing articles
    authenticatedApiRouter.post('/knowledgeArticle', function(req, res) {
        
        //body parser gives us the body object on req
        //if the req has an id, assume it is to update
        if(req.body._id){
 
            var datetime = moment().format();
            //find and update article
             knowledgeArticleModel.findByIdAndUpdate(req.body._id, {
                    Question: req.body.Question,
                    Category: req.body.Category,
                    RT_reference: req.body.RT_reference,
                    Answer: req.body.Answer,
                    Status: req.body.Status,
                    Last_updated_by: req.decoded.email,
                    Last_updated_on: datetime
            }, function(err, todo){
                if(err) { 
                    //throw err;
                    console.log('could not update mongo article');
                    console.log(err);

                    return res.status(503).send({ //error 503 means service is not available temporarily
                        success: false, 
                        message: err
                    });

                }

                console.log('Updates Article In MongoDB'); 

                //Update the specific article being updated. Saves time by not having to load from the mongo db
                var current_articles = app.get('articles');
                var index_of_article = 0;
                var article_found = 'NO';

                //update article in the cache if it exists
                current_articles.forEach(function(element, index) {

                    if(element._id == req.body._id)
                    {
                        console.log('FOUND ARTICLE'); 
                        //if article is found, update article_found variable, and update element's value
                        article_found = 'YES';
                        //if the status of the article is still 'Approved', update the article
                        if(req.body.Status === 'Approved')
                        {
                            element.Question =  req.body.Question;
                            element.Category =  req.body.Category;
                            element.RT_reference = req.body.RT_reference;
                            element.Answer = req.body.Answer;
                            element.Status = req.body.Status;
                            element.Last_updated_by = req.decoded.email;
                            element.Last_updated_on =  datetime;
                        }
                        //if the status is 'Retired'
                        else if(req.body.Status === 'Retired')
                        {
                            current_articles.splice(index, 1);//update the status of the article
                            console.log('REMOVING ARTICLE FROM CIRCULATIONS'); 
                            //element.Status = req.body.Status; 
                        }
                        //index_of_article = index;     
                        //console.log('found and updated artice');         
                    }    
                });

                if(article_found === 'NO')
                {
                    console.log('*********** article was not found ***********')
                }

                //if article is not found AND the article is approved, a submisson is being approved. Create a new element and push it to current_articles
                if (article_found === 'NO' && req.body.Status === 'Approved')
                    {
                        var newElement = {};
                        newElement.Question =  req.body.Question;
                        newElement.Category =  req.body.Category;
                        newElement.RT_reference = req.body.RT_reference;
                        newElement.Answer = req.body.Answer;
                        newElement.Status = req.body.Status;
                        newElement.Last_updated_by = req.decoded.email;
                        newElement.Last_updated_on =  datetime;
                        newElement._id = req.body._id;
                        newElement.Created_on =  datetime;
                        newElement.Last_updated_by = datetime;
                        newElement.___v = 0;

                        current_articles.push(newElement);
                    }

                //update value of articles with current_articles
                app.set('articles', current_articles);
                //console.log('UPDATED THE ARTICLES');

                //update submitted with the up-to-date value of number of submissions still left
                knowledgeArticleModel.find({Status: 'Submitted'}, function (err, knowledgeArticle) {
                if (err) {    
                    console.log(err);     
                }
                    app.set('submitted', knowledgeArticle.length);
                });
                    
                //look for KB article with the mongoID
                con.query('Select * from KB_articles where mongo_id="'+  req.body._id +'" limit 1', function(err, articleToUpdate) {
                    if (err) {    
                        console.log(err);
                        //throw err;

                        console.log('no article with mongoid found');
                        console.log(err); 

                        return res.status(503).send({ //error 503 means service is not available temporarily
                            success: false, 
                            message: err
                        });     
                    }
                    //update mySQL row where mongoID matches

                    /*console.log("UPDATE KB_articles SET Question = '" + req.body.Question.addSlashes() + "', Category = '" + req.body.Category.addSlashes() + "', RT_reference = '" + req.body.RT_reference.addSlashes()  + "', Answer = '" 
                                + req.body.Answer.addSlashes() + "', Status = '" + req.body.Status.addSlashes() + "', Last_updated_by = '"+ req.decoded.email + "', Last_updated_on = '" + datetime + "' WHERE Document_id = '" + articleToUpdate[0].Document_id + "'");
                    */
                    con.query("UPDATE KB_articles SET Question = '" + req.body.Question.addSlashes() + "', Category = '" + req.body.Category.addSlashes() + "', RT_reference = '" + req.body.RT_reference.addSlashes()  + "', Answer = '" 
                                + req.body.Answer.addSlashes() + "', Status = '" + req.body.Status.addSlashes() + "', Last_updated_by = '"+ req.decoded.email + "', Last_updated_on = '" + datetime + "' WHERE Document_id = '" + articleToUpdate[0].Document_id + "'"
                    , function(err, article_added) {
                            if(err) { 
                                //throw err;
                                console.log('could not update KB article properly in DB');
                                console.log(err); 

                                return res.status(503).send({ //error 503 means service is not available temporarily
                                    success: false, 
                                    message: err
                                });
                            };

                        var change_type = 'Update';
                        //insert change into the article change log with old value of the artcile (in case we need to ever revert to old values). This tracks the change elaboratwly
                        con.query("INSERT INTO KB_article_change_log (Document_id, mongo_id, change_type, updated_from_question, updated_from_answer, updated_on, updated_by)"
                            + "VALUES ('" + articleToUpdate[0].Document_id + "','" + req.body._id + "','"+ change_type.addSlashes() + "','"+ req.body.old_Question.addSlashes() + "','"+ req.body.old_Answer.addSlashes() + "','"+ datetime + "','"+ req.decoded.email + "')"
                            ,function(err, article_change_log) {                            
                            if (err) {    
                                console.log(err);     
                            }
    
                            var activity_type = 'Updated existing document. KB_article_change_log ID: ' + article_change_log.insertId;
                            //add the update to the activity acumulator...this is a brief general activity log
                            con.query("INSERT INTO activity_accumulator (user_id, activity_type, activity_timestamp, device_type, email)"
                            + "VALUES ('" + req.decoded.user_id + "','" + activity_type.addSlashes() + "','" + datetime + "','"+ req.device.type + "','"+ req.decoded.email + "')"
                            ,function(err, row) {                            
                                if (err) {    
                                    console.log(err);     
                                }

                                //if everything is logged successfully, send back success message
                                return res.status(200).send({ 
                                    success: true, 
                                    message: 'Article was submitted!'
                                });

                            });
                        });
                    });
                });
            }); 
        }
        else {

            //if the article does not have an ID, assume it is a new submission. 

            //console.log('params: ' + JSON.stringify(req.params));
            //console.log('body: ' + JSON.stringify(req.body));
            //console.log('query: ' + JSON.stringify(req.query));
        
            var datetime = moment().format();

            //create a new knowledge article 
            var newknowledgeArticle = knowledgeArticleModel({
                    Question: req.body.Question,
                    Category: req.body.Category,
                    RT_reference: req.body.RT_reference,
                    Answer: req.body.Answer,
                    Status: req.body.Status,
                    Last_updated_by: req.decoded.email,
                    Submitted_by: req.decoded.email, //get from decoded
                    Created_on: datetime,
                    Last_updated_on: datetime
            });


            newknowledgeArticle.save(function(err, newknowledgeArticle){
                if(err) { 
                    //throw err;
                    return res.status(503).send({ //error 503 means service is not available temporarily
                        success: false, 
                        message: err
                    });
                };

                //console.log(newknowledgeArticle);
                
                con.query("INSERT INTO KB_articles (Question, Category, RT_reference, Answer, Status, Last_updated_by, Submitted_by, Created_on, Last_updated_on, __v, mongo_id)"
                          + "VALUES ('" + req.body.Question.addSlashes() + "','" + req.body.Category.addSlashes() + "','" + req.body.RT_reference.addSlashes()  + "','" 
                                        + req.body.Answer.addSlashes() + "','" + req.body.Status.addSlashes() + "','" + req.decoded.email + "','" 
                                        + req.decoded.email + "','" + datetime + "','" + datetime + "','" + newknowledgeArticle.__v + "','" + newknowledgeArticle._id +  "')"
                , function(err, article_added) {
                        if(err) { 
                            //throw err;
                            return res.status(503).send({ //error 503 means service is not available temporarily
                                success: false, 
                                message: err
                            });
                        };

                        var change_type = 'Submission';
                        //insert into KB_article_change_log
                        con.query("INSERT INTO KB_article_change_log (Document_id, mongo_id, change_type, updated_from_question, updated_from_answer, updated_on, updated_by)"
                        + "VALUES ('" + article_added.insertId + "','" + newknowledgeArticle._id + "','"+ change_type.addSlashes() + "','NEW','NEW','"+ datetime + "','"+ req.decoded.email + "')"
                        ,function(err, article_change_log) {

                            var activity_type = 'Submitted a new article. KB_article_change_log ID: ' + article_change_log.insertId;
                            //insert into activity_accumulator
                            con.query("INSERT INTO activity_accumulator (user_id, activity_type, activity_timestamp, device_type, email)"
                            + "VALUES ('" + req.decoded.user_id + "','" + activity_type + "','" + datetime + "','"+ req.device.type + "','"+ req.decoded.email + "')"
                            ,function(err, row) {                            
                                if(err) { 
                                //throw err;
                                    return res.status(503).send({ //error 503 means service is not available temporarily
                                        success: false, 
                                        message: err
                                    });
                                };
                                    var old_submissions = app.get('submitted');
                                    //iterate submissions by 1
                                    app.set('submitted', (old_submissions + 1));
                                    //send back success messsge
                                    return res.status(200).send({ 
                                        success: true, 
                                        message: 'Article was submitted!'
                                    });
                            });
                        }); 
                });                
            });      
        };  
    });

    //api endpoint to delete a knowledge article. 
    authenticatedApiRouter.delete('/knowledgeArticle', function(req, res) {

        user = req.decoded;
        //only super users can delete articles from the KB. The standard way would be to tag them as rejected or Deleted
        if (user.user_type !== "su")
        {
                return res.status(403).send({ 
                    success: false, 
                    message: 'Access is forbidden  because of user type' 
                });
        }

        knowledgeArticleModel.findByIdAndRemove(req.body._id, function(err){
            if (err) {    
                console.log(err);     
            }
            res.send('Successfully deleted');
        });
    });    
        
    // apply the routes to our application with the prefix /api
    app.use(apiURL, authenticatedApiRouter);  
    
};

