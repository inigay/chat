/**
 * Created by igor on 5/23/2015.
 */
var http = require('http');
var server = http.createServer(function(request,response){
    response.writeHead(200,{"Content-Type" : "text/htm"});
    response.write("<h1>Hello</h1>");
    response.end();
});

server.listen(3000);