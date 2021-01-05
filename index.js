var express = require('express');
var app = express();
var path = require('path');
var formidable = require('formidable');
var cookieParser = require('cookie-parser');
var psmrc = require('./psmrc');
var cleanup = require('./cleanup');
var fs = require('fs-extra');

// Cookie creation middleware
app.use(cookieParser());
app.use(function(req, res, next) {
  var cookie = req.cookies ? req.cookies.cookieName : undefined;
  if (cookie === undefined) {
    var randomNumber=Math.random().toString();
    randomNumber=randomNumber.substring(2,randomNumber.length);
    res.cookie('cookieName',randomNumber, { maxAge: 900000, httpOnly: true });
    req.cookies.cookieName = randomNumber;
  }

  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// ––––––––––– Paths ––––––––––– //

app.get('/', function(req, res){
  console.log('Express: app get / cookie', req.cookies.cookieName);
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/check', function(req, res) {
  const { cookieName } = req.cookies;
  const isReady = fs.existsSync(path.join(__dirname, '/public/pack/', `${cookieName}.zip`));
  
  const downloadUrl = `/pack/${cookieName}.zip`;

  res.send(isReady ? downloadUrl : 'false');
});

app.post('/upload', function(req, res){
  const { smoothing } = req.query;
  console.log('req smoothing', smoothing)
  console.log('Express: Attempting cleanByExpiration()');
  cleanup.cleanByExpiration();

  console.log('Express: upload cookie ', req.cookies);
  var form = new formidable.IncomingForm(); // create an incoming form object
  form.multiples = true; // specify that we want to allow the user to upload multiple files in a single request
  form.uploadDir = path.join(__dirname, '/uploads'); // store all uploads in the /uploads directory

  form.on('file', function(field, file) { 
    fs.rename(file.path, path.join(form.uploadDir, req.cookies.cookieName));
  });

  form.on('error', function(err) {
    console.log('Express: An error has occured: \n' + err);
  });

  form.on('end', function() { // once all the files have been uploaded, send a response to the client
    res.end('success');
    psmrc(res, req.cookies.cookieName, { smoothing });
  });

  form.parse(req); // parse the incoming request containing the form data
});

app.listen(process.env.PORT || 3000, function(){
  console.log('Express: Server listening on port');
});