var fs = require('fs-extra');
var rmdir = require('rmdir');
const path = require('path');

module.exports = {

  cleanByCookie: function(cookie) {
    rmdir(__dirname + '/uploads/' + cookie + '-create', () => console.log(`Cleanup: deleted ${cookie}-create dir.`))
    rmdir(__dirname + '/uploads/' + cookie + '-unzip', () => console.log(`Cleanup: deleted ${cookie}-unzip dir`))
    fs.unlink(__dirname + '/uploads/' + cookie, () => console.log(`Cleanup: deleted ${cookie} file`))
  },

  cleanByExpiration: function(cookie) {
    var expireFile = function(file) {
      var stats = fs.statSync(file);
      var fileTime = parseInt(new Date(stats.mtime).getTime() / 1000);
      var currTime = parseInt(Date.now() / 1000);

      if (/fallback/.test(file)) return; // never delete fallback folder(s)
      if (/keep/.test(file)) return;
      
      if ((currTime - fileTime) > 1800) {
        rmdir(file, () => console.log(`Cleanup: deleted ${file} by experation. ${currTime - fileTime}`))
      }
    }

    var pack = fs.readdirSync(__dirname + '/public/pack/');
    pack.forEach(file => expireFile(__dirname + '/public/pack/' + file));

    var uploads = fs.readdirSync(__dirname + '/uploads/');
    uploads.forEach(file => expireFile(__dirname + '/uploads/' + file));
  },

  cleanExistingZip: function(cookie) {
    const existingZip = path.join(__dirname, '/public/pack/', `${cookie}.zip`);
    if (fs.existsSync(existingZip)) {
      fs.unlink(existingZip, () => console.log('Cleanup: cleaned up existing file before starting'))
    } else {
      console.log('Cleanup: No existing zip :)');
    }
  }
}