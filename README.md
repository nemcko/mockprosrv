# Mockup Proxy Server

Development tool for continual testing frondend applications.
The main advantage of the solution is the fact that the frondend and backend with the [Lowdb](https://github.com/typicode/lowdb) database is written all in JavaScript only. The library is suitable for debugging frondend as well as for building automatic tests.
An example of an amazing simple mockup library is <a href="https://github.com/nemcko/mockup_example" target="_blank">here</a>.

## Configuration
### Working directory

```
 mock
  | |
  | +- controllers
  | |   +- ctrl1.js
  | |
  | +- data
  |     +- db1.json
  | 
  config.js
 
 runsrv.js
```

### Script to start mock server 
*mocksrv.js*
```javascript
var path = require('path');
var mocksrv = require('mockprosrv');

mocksrv.runMockSrv(__dirname,path.join(__dirname,'/mock/config'));
```
Path `/mock/config` is full path to config.js:
## Config file
*mock/config.js*
```javascript
// schemes of path
const apipath = {
    REQ_PERSONS: '/persons',                    // Simple route
    REQ_PERSON: '/person/:id',                  // Route with params
    ...  
}

module.exports.apipath = apipath;

// proxy gate settings
const hostname = 'devsrv';
module.exports.config = {
    ctrlDir: './mock/controllers',              // Controler`s directory
    dataDir: './mock/data',                     // MockUp database directory
    clientUrl: 'http://localhost:4200',         // Frondend URL
    serverUrl: 'http://' + hostname,            // Dev.server URL
    serverHost: hostname,                       // Dev.server Host
    serverPort: '5000',                         // Dev.server Port
    serverUser: 'ferko',                        // Dev.server User
    serverPwd: 'ferkove',                       // Dev.server User`s Password
    devPort: 3000,                              // MockUp proxy server Port
    mockPort: 3001,                             // MockUp server Port
    mockGate: {                                 // Setting the application gateway:
        [apipath.REQ_PERSONS]: true,            //      true - go to dev server
        [apipath.REQ_PERSON]: false,            //      false - go to mockup server
        ...
   },
}
```


### Databases 
*mock/data/db1.json*

```javascript
{
    "persons": [
      {"id":1,"name":"Germain Ishaki","gender":"Female","company":"Bubblemix","age":59},
      {"id":2,"name":"Tabbie Treweke","gender":"Female","company":"Eidel","age":19},
      {"id":3,"name":"Ruthy Mulcock","gender":"Female","company":"Bubblemix","age":50},
    ]
    ...
}
```


### Controllers 
*mock/controllers/ctrl1.js*

```javascript
'use strict';

    // Filling a web table via a post request 

    app.post(api.REQ_PERSONS, (req, res) => {
        lib.useDb(conf, 'db1').then(db => {
            lib.browseList(req, res, db, 'persons', 'id,name,gender,company,age', {
                // mapping filter fields to database fields
                search: 'name',
            }, (req, res, result) => {
                let arr = []
                result.result.forEach(item => {
                    arr.push({
                        // mapping database fields to response fields
                        id: item.id,
                        name: item.name,
                        age: item.age,
                        gender: item.gender,
                        company: item.company
                    })
                })
                result.result = arr;
                res.send(result);
            });
        });
    })

    // CRUD requests
    
    app.post(api.REQ_PERSON, (req, res) => {
        lib.useDb(conf, 'db1').then(db => {
            req.body.id = new Date().getTime();
            lib.appendObject(req, res, db, 'persons');
        });
    })

    app.get(api.REQ_PERSON, (req, res) => {
        lib.useDb(conf, 'db1').then(db => {
            lib.sendObjectById(req, res, db, 'persons');
        });
    })
    ...

}
```


## Library functions
Function name | Description
------------ | -------------
*useDb* | Select a database to use
*writeHead* | Write the header of the response sent to the http client
*sendFile* | Sent file to the http client
*findObjectById* | Searching a database object by its ID
*sendObjectById* | Searching a database object by its ID plus sent data to the http client
*appendObject* | Add an object to a data collection
*saveObjectById* | Storing data based on an object ID
*deleteObjectById* | Delete data based on an object ID
*list* | Sending a list of items to an http client
*browseList* | Sending a list of query results to an http client

## Installation
npm install --save-dev https://github.com/nemcko/mockprosrv 

## Example package.json scripts
```
"start": "concurrently --raw --prefix-colors --kill-others \"npm run srv\" \"npm run cli\" ",
"cli": "ng serve --proxy-config",
"srv": "nodemon mocksrv.js"
```
## Use in case of start-up problems
kill $(lsof -t -i:3001)

