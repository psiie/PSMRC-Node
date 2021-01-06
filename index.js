var express = require('express');
var app = express();
var path = require('path');
var formidable = require('formidable');
var cookieParser = require('cookie-parser');
var psmrc = require('./psmrc');
var cleanup = require('./cleanup');
var fs = require('fs-extra');
const md5File = require('md5-file');

const HASHES = {
  TERRAIN: [
    'cd7f5ad33c0bb905b66e1ce1b98703fd', // decrypted
    'be55ef4b3753676d711667a977fff19f',
    '49cabb6cc4d6dd642be54510c82330ed', // extended
  ],
  ITEMS: [
    '28ff716d9d9bab6182b6f4ab8a387f23', //decrypted
    'ecd074225b2d159c8d286006f506b810',
    '357d7d3a92ad3a7b80f685a5d3080d2e', // extended
  ],
};

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
  const toggles = {
    canHasItems: false,
    canHasTerrain: false,
  }

  form.on('file', function(field, file) {
    const { type } = file;

    if (/png/.test(type)) {
      md5File(file.path).then(hash => {
        if (HASHES.ITEMS.indexOf(hash) !== -1) toggles.canHasItems = true;
        if (HASHES.TERRAIN.indexOf(hash) !== -1) toggles.canHasTerrain = true;
        fs.unlink(file.path, () => console.log('Express: deleting uploaded item/terrain image file'))
      });
    } 
    else if (/zip/.test(type)) fs.rename(file.path, path.join(form.uploadDir, req.cookies.cookieName));
    else fs.unlink(file.path, () => console.log('Express: unknown file uploaded. deleting'))
    
  });

  form.on('error', function(err) {
    console.log('Express: An error has occured: \n' + err);
  });

  form.on('end', function() { // once all the files have been uploaded, send a response to the client
    res.end('success');
    console.log('res.end, toggles:', toggles);
    setTimeout(() => {
      // gives times for hashing to finish
      psmrc(res, req.cookies.cookieName, { smoothing, toggles });
    }, 500); 
  });

  form.parse(req); // parse the incoming request containing the form data
});

app.listen(process.env.PORT || 3000, function(){
  console.log('Express: Server listening on port');
});