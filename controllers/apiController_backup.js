//this page will handle the api endpoints

var knowledgeArticleModel = require('../models/knowledgeArticleModel');//get the todoModel
var express = require('express');

var bodyParser = require('body-parser');
var mysql = require('mysql');
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens

var apiRouter = express.Router();   //router for api
var renderRouter = express.Router();//router for pages to render
var authenticationRouter = express.Router();//router for authentication TESTING

module.exports = function(app) {
    
    //use middleware to parse out json from the HTTP response body
    app.use(bodyParser.json());
    //make sure it can handle URL encoded data (certain charachters are converted to % sign symbols etc.)
    app.use(bodyParser.urlencoded({extended: true}));
    
    /////////////////////////////////////////////////////
    //ROUTES FOR THE API
    /////////////////////////////////////////////////////
    
    var con = mysql.createConnection({
        host: "erivedbinstance.c254p1lk3lsl.us-east-1.rds.amazonaws.com",
        user: "erive_admin",
        password: "3-r1v3!!",
        database: "LTS_KB"
    });
    
    var articles;
    
    con.query('Select * from KB_articles', function(err, rows) {
        if(err) throw err;
        //  console.log(rows);
        //res.send(rows);
        articles = rows;
    });
 
    
    apiRouter.get('/knowledgeArticles/mysql', function(req, res){
    
      //  app.use('/', function (req, res, next) {
        console.log('Request Url:' + req.url);
        /*
        var con = mysql.createConnection({
            host: "erivedbinstance.c254p1lk3lsl.us-east-1.rds.amazonaws.com",
            user: "erive_admin",
            password: "3-r1v3!!",
            database: "LTS_KB"
        });
        
        con.query('Select * from KB_articles', function(err, rows) {
            if(err) throw err;
          //  console.log(rows);
            res.send(rows);
        });
        */
        
        res.send(articles);
           
        
        
        next();
   // });
        
    })
    
    
    
    
    
    apiRouter.get('/knowledgeArticles/:status', function(req, res){
        
        //.find (on mongoose) has an error first callback
        knowledgeArticleModel.find({Status: req.params.status}, function (err, knowledgeArticle) {
            if(err) throw err; 
            
            //express will convert and send back as JSON
            res.send(knowledgeArticle);
        })
        
    })
    
    
    
    
    //find indivdual knowledge article by id
    apiRouter.get('/knowledgeArticle/:_id', function(req, res) {
        //mongoose method
        knowledgeArticleModel.findById({_id: req.params._id}, function (err, knowledgeArticle) {
            if(err) throw err;
            
            res.send(knowledgeArticle);
            
        })
    })
    
    
    apiRouter.post('/knowledgeArticle', function(req, res) {
        
        //body parser gives us the body object on req
        //if the req has an id, assume it is to update
        if(req.body._id){
            knowledgeArticleModel.findByIdAndUpdate(req.body._id, {
                    Question: req.body.Question,
                    Category: req.body.Category,
                    RT_reference: req.body.RT_reference,
                    Answer: req.body.Answer,
                    Status: req.body.Status,
                    Last_updated_by: req.body.Last_updated_by,
                    //Submitted_by: req.body.Submitted_by,
                    //Created_on: req.body.Created_on,
                    Last_updated_on: req.body.Last_updated_on
            }, function(err, todo){
                if(err) throw err;
                
                    res.send('Successfully updated');                
                
            })
        }
        else {
            //create a new knowledge article 
            var newknowledgeArticle = knowledgeArticleModel({
                    Question: req.body.Question,
                    Category: req.body.Category,
                    RT_reference: req.body.RT_reference,
                    Answer: req.body.Answer,
                    Status: req.body.Status,
                    Last_updated_by: req.body.Last_updated_by,
                    Submitted_by: req.body.Submitted_by,
                    Created_on: req.body.Created_on,
                    Last_updated_on: req.body.Last_updated_on
            });
            
            newknowledgeArticle.save(function(err){
                if(err) throw err;                
                res.send('Successfully created');
            })      
        }  
    })
    
    //delete a knowledge article
    apiRouter.delete('/knowledgeArticle', function(req, res) {
        knowledgeArticleModel.findByIdAndRemove(req.body._id, function(err){
            if(err) throw err;
            res.send('Successfully deleted');
        })
    })
    
        
    // apply the routes to our application with the prefix /api
    app.use('/api', apiRouter);
    
    
    /////////////////////////////////////////////////////
    //ROUTES FOR PAGES THAT WILL BE RENDERED
    /////////////////////////////////////////////////////
    
    renderRouter.get('/', function(req, res) {        
        //have this page serve as login and POST where authentication will happen
        res.render('login');        
    });
    


    // apply the routes to our application with the prefix / {ROOT}
    app.use('/', renderRouter);
    
    
    
    /////////////////////////////////////////////////////
    //ROUTES FOR TEST API/PAGES FOR AUTHENTICATION
    /////////////////////////////////////////////////////
    
    authenticationRouter.post('/', function(req, res) {
        
        //con already defined
        con.query('Select * from users where email="' + req.body.email +  '" limit 1', function(err, user) {
        //con.query('Select * from users limit 1', function(err, user) {
            if(err) throw err;
            if(user.length < 1)
            {
                //res.send('User does not exist');
                res.json({ success: false, message: 'User does not exist.' });
            }
            else
            {   
                // check if password matches
                
                //console.log(config);
                
                 console.log(user[0]);
                 
                 console.log(user[0].pass);
                
                pass = user[0].pass;
                
                if (pass !== req.body.password) {
                    res.json({ success: false, message: 'Authentication failed. Wrong password.' });
                } else {
                    
                    var token = jwt.sign(user[0], app.get('superSecret'), {
                        expiresIn: '24h'
                    }); //superSecret set in app.js
                    
                    console.log(token);
                    
                    res.json({
                        success: true,
                        message: 'Here is your token!',
                        token: token
                    });
                    
                    
                    console.log(user[0]);
                    //res.send(user);
                    
                    
                    
                }
            }
            

        });
        
        
    });
    
    app.use('/auth', authenticationRouter);
    
    
    
}

