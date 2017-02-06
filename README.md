# KnowledgeBase
This is a Knowledge Base application built on the MEAN stack. A version of it is currently in production at [UIC's Learning Technology Solutions department] (http://skhan231.people.uic.edu:8080).

View a demo of the application in action [HERE](https://youtu.be/mDB5pSo57go).

##Architecture Overview
All active documents are retrieved form the MongoDB and cached on server startup. Every time documents are updated via the GUI, updates to the document cache is queued on the server and seperately for MongoDB. This is to ensure that documents are up-to-date on the server, even if the MongoDB is temporarily unreachable. 

Session information is carried in __JWTs (JSON Web Tokens)__. Each token has an expiry of 1 hour from the last time they are used after which the session is automatically destroyed. 

User information is stored in a __MySQL database__ (can be easily updated to any _MS SQL Server_ or _Oracle DB_). __All passwords are salted and then hashed before being stored in the MySQL DB.__

All document updates and user account updates are logged in activity accumulator tables in detail so as to allow detailed tracking. This will make any admin approved changes easy to revert if needed.

As of now, there are 3 levels of access to the KnowledgeBase:
- __User:__ This is the general user access and allows users to search documents as well as propose new docuemnt additions. 
- __Admin:__ In addition to _User_ access, _Admins_ are able to add new users to the knowledge base, update current documents (edit or retire), and approve _User_ submitted doucments.
- __SuperUser:__ Only a SuperUser may access certain endpoints of the API (non-GUI) with a valid authentication JST. Please refer to the __Routes for API__ section in _controllers/apiController.js_ to see what they are.

##Setup
In order to use use the application to its fullest, the following steps must be taken:
- Update _app.js_ with the correct port on which the node application will attach a listener to
- Add smtp credetials to create a nodemailer transporter to:
  - _models/sendUserInitiationTemplate.js_ 
  - _models/sendPasswordResetTemplate.js_
- Update domainURL with the base domain URL (web endpoint) in _controllers/apiController.js_
- Create MySQL DB with schema information in MySQL folder
- Create a MongoDB for the application
  - Once the MongoDB has been created, the setup controller in _controllers/setupController.js_ can be used to add dummy documents for testing
- Update MySQL and MongoDB information in _config/config.json_

Once the above steps are complete, the Knowledge Base is ready to be used.

##Future Additions and To Dos:
To continually improve the application, the following items are on the list:
- Web interface to allow users to fully configure the type of fields ('Title', 'Category', 'Subcategory', 'Tags', etc.) that can be used to index and tag documents, how the index is built, and how the documents are scored to match user-inputted queries (are specific fields weighted more?). 
- Ability to allow bulk document uploading so initial setups are fast
- Dynamically built document tags (Machine Learning application)
- Dynamically built cache of most relevant (average recency of use vs. average frequency of use) articles to transfer on load

