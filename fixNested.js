var fs = require('fs-extra');

module.exports = function(cookie) {
  console.log('inside fixNested');
  return new Promise( (resolve, reject) => {
    var files = fs.readdirSync(__dirname + '/uploads/' + cookie + '-unzip')
    var bestCandidate = '';
    console.log(files);

    if (files.indexOf('assets') === -1) {
      
      // Find the best candidate for being the directory we need
      files.forEach( file => {
        if (fs.lstatSync(__dirname + '/uploads/' + cookie + '-unzip/' + file).isDirectory()) {
          console.log('setting best candidate');
          bestCandidate = file;
        }
      })

      // Empty directory
      // if (bestCandidate === '' && files.length === 1 && files[0] === '.DS_Store') {reject()}

      // Move files
      var mvFileList = fs.readdirSync(__dirname + '/uploads/' + cookie + '-unzip/' + bestCandidate);
      mvFileList.forEach( file => {
        var oldPath = __dirname + '/uploads/' + cookie + '-unzip/' + bestCandidate + '/' + file;
        var newPath = __dirname + '/uploads/' + cookie + '-unzip/' + file;
        try {
          fs.renameSync(oldPath, newPath);
        } catch(e) {
          console.log('++++++++++++++++++++++++couldn\' rename ', oldPath);
        }
        console.log('renamed ', file);
      });
      console.log('done renaming. resolving');
      resolve();

    } else {
      console.log('No need to fixNested');
      resolve();
    }
  })
}