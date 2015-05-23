/**
 * Created by igor on 5/23/2015.
 */

var express = require('express');
var app = express();


var mongodb = require('mongojs');
var db = mongodb('users',['users']);

app.set('view engine','ejs');
app.use(express.static(__dirname + '/public'));





//Routes

//Signup Route
app.get('/signup',function(request,response){

	//response.send('asd');
	response.render('signup');
});




//add listener

var server = app.listen(3000,function(){
    console.log("Listening to port 3000");
})

