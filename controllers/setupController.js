//this is to setup seed data

var knowledgeArticleModel = require('../models/knowledgeArticleModel');//get the todoModel

//exporting function that takes an app (will end up being the express app)
module.exports = function (app) {
    app.get('/api/setupKnowledgeArticles', function(req,res){
        //seed database
        var starterKnowledge = [
                      
           {
                Question: 'Test Question 1',
                Category: 'test category',
                RT_reference: 'NONE',
                Answer: 'This is a test answer 1',
                Status: 'Approved',
                Last_updated_by: 'skhan231',
                Submitted_by: 'skhan231',
                Created_on: '2016-05-01',
                Last_updated_on: '2016-05-01'
            },
            {
                Question: 'Test Question 2',
                Category: 'test category',
                RT_reference: 'NONE',
                Answer: 'This is a test answer 2',
                Status: 'Approved',
                Last_updated_by: 'skhan231',
                Submitted_by: 'skhan231',
                Created_on: '2016-05-01',
                Last_updated_on: '2016-05-01'
            },
            {
                Question: 'Test Question 3',
                Category: 'test category',
                RT_reference: 'NONE',
                Answer: 'This is a test answer 3',
                Status: 'Approved',
                Last_updated_by: 'skhan231',
                Submitted_by: 'skhan231',
                Created_on: '2016-05-01',
                Last_updated_on: '2016-05-01'
            }
        ];
        
        //use mongoose methods available on it. Create accepts arrays
        knowledgeArticleModel.create(starterKnowledge, function(err, results){
                res.send(results);
        })
    })
}