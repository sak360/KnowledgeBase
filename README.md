# KnowledgeBase
This is a Knowledge Base application built on the MEAN stack. A version of it is currently in production at UIC's Learning Technology Solutions department.

All active documents are retrieved form the MongoDB and cached on server startup. Every time documents are updated via the GUI, updates to the document cache is queued on the server and seperately for MongoDB. This is to ensure that documents are up-to-date on the server, even if the MongoDB is temporarily unreachable. 

##Setup
In order to use use the application to its fullest, the following steps must be taken:
