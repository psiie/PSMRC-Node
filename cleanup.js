var fs = require('fs');
var rmdir = require('rmdir');

module.exports = {

  cleanByCookie: function(cookie) {
    console.log(rmdir);
    rmdir('uploads/' + cookie + '-create', ()=>{console.log('cleaned up ', cookie, '-create ir') })
    rmdir('uploads/' + cookie + '-unzip', ()=>{console.log('cleaned up ', cookie, '-unzip dir') })
    fs.unlink('uploads/' + cookie,()=>{console.log('cleaned up ', cookie, 'uploaded file')})
  },

  cleanByExpiration: function(cookie) {
    var expireFile = function(file) {
      var stats = fs.statSync(file);
      var fileTime = parseInt(new Date(stats.mtime).getTime() / 1000);
      var currTime = parseInt(Date.now() / 1000);
      if (currTime - fileTime > 600 && file !== 'uploads/default') {
        rmdir(file,()=>{console.log('cleaned up ', file, '.zip by expiration',　currTime - fileTime)})
        // fs.unlink('public/pack/' + file,()=>{console.log('cleaned up ', file, '.zip by expiration',　currTime - fileTime)})
      }
    }
    var pack = fs.readdirSync('public/pack/');
    pack.forEach(file => expireFile('public/pack/' + file));
    var uploads = fs.readdirSync('uploads/');
    uploads.forEach(file => expireFile('uploads/' + file));


  },

  cleanExistingZip: function(cookie) {
    console.log('inside cleanExistingZip');
    if (fs.existsSync('public/pack/' + cookie + '.zip')) {
      console.log('yes, cleanup existing file');
      fs.unlink('public/pack/' + cookie + '.zip', ()=>{console.log('cleaned up existing file')})
    } else {
      console.log('couldn\' find zip', 'public/pack/' + cookie + '.zip');
    }
  }
}