var fs = require('fs');

module.exports = function(cookie) {
  console.log('inside fixNested');
  return new Promise( (resolve, reject) => {
    var files = fs.readdirSync('uploads/' + cookie + '-unzip')
    var bestCandidate = '';
    console.log(files);

    if (files.indexOf('assets') === -1) {
      
      // Find the best candidate for being the directory we need
      files.forEach( file => {
        if (fs.lstatSync('uploads/' + cookie + '-unzip/' + file).isDirectory()) {
          console.log('setting best candidate');
          bestCandidate = file;
        }
      })

      // Empty directory
      // if (bestCandidate === '' && files.length === 1 && files[0] === '.DS_Store') {reject()}

      // Move files
      var mvFileList = fs.readdirSync('uploads/' + cookie + '-unzip/' + bestCandidate);
      mvFileList.forEach( file => {
        var oldPath = 'uploads/' + cookie + '-unzip/' + bestCandidate + '/' + file;
        var newPath = 'uploads/' + cookie + '-unzip/' + file;
        fs.renameSync(oldPath, newPath);
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