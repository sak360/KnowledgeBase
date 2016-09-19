var mongoose = require('mongoose');

var Schema = mongoose.Schema;

//create a new schema for the mongoDB
var knowledgeArticleSchema = new Schema({
    Question: String,
    Category: String,
    RT_reference: String,
    Answer: String,
    Status: String,
    Last_updated_by: String,
    Submitted_by: String,
    //Created_on_string: String,
    Created_on: Date,
    //Last_updated_on_string: String,
    Last_updated_on: Date
});

var Knowledge = mongoose.model  ('knowledgeArticles', knowledgeArticleSchema);//very much like inherits - creates a new model

module.exports = Knowledge;//export the model

