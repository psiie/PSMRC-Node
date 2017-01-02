var fs = require('fs');
var unzip = require('unzip');
var archiver = require('archiver');
var archive = archiver('zip');
var cleanup = require('./cleanup');
var gm = require('gm').subClass({imageMagick: true});
var fixNested = require('./fixNested');
var blockSprites = require('./sprites-block');
var itemSprites = require('./sprites-item');
var singleSprites = require('./sprites-single');
// var importDirectory = findImportDirectory(); // Declare so find only runs once
var importDirectory;
var layout = [
  // '/armor',
  // '/font',
  // '/item',
  // '/misc',
  // '/mob',
  '/art',
  '/textures'
]

// ----------------- Directory Functions ----------------- //

function makeLayout(folder, cookie) {
  if (!fs.existsSync(folder)) {
    fs.mkdir('uploads/' + cookie + '-create' + folder, ()=>console.log('created dir'));
  }
}

// depricated now that dir is automatically renamed to cookie
function findImportDirectory() {
  console.log('running findImportDirectory :\\');
  // Returns a promise with the most likely folder to be importing
  var dir = new Promise((resolve, reject) => {
    fs.readdir('./import/', (err, list) => {
      if (err) {
        console.log('error: ', err);
        reject(err)
      }
      else {resolve(list)}
    })
  });
  return dir.then(list => {
    var mostLikely = 'default';
    list.forEach(i=>{ // Cycle through each folder. If not hidden or 'default'
      if (i !== 'default' && i[0] !== '.') {mostLikely = i}
    });
    return mostLikely;
  });
}

function findPNG(shortDirectory) {
  return new Promise( (resolve, reject) => {
    let userDir = importDirectory + '-unzip/assets/minecraft/textures/' + shortDirectory;
    let defaultDir = './uploads/default/assets/minecraft/textures/' + shortDirectory;
    // if (false) {
    if (fs.existsSync(userDir)) {
      resolve(userDir);
    } else if (fs.existsSync(defaultDir)) {
      resolve(defaultDir);
    } else {
      console.log("!!!ERROR!!! Report this filename: \"", shortDirectory, "\"");
      resolve('./uploads/default/404.png');
    }
  })

}

// function findPNG(shortDirectory) {
//   // Returns either the imported texturepack path or the default path
//   return importDirectory.then(dir => {
//     let userDir = importDirectory + '/import/' + dir + '/assets/minecraft/textures/' + shortDirectory;
//     let defaultDir = importDirectory + '/import/default/assets/minecraft/textures/' + shortDirectory;
//     // if (false) {
//     if (fs.existsSync(userDir)) {
//       return userDir;
//     } else if (fs.existsSync(defaultDir)) {
//       return defaultDir;
//     } else {
//       console.log("!!!ERROR!!! Report this filename: \"", shortDirectory, "\"");
//       return './import/default/404.png';
//     }
//   })
// }

// ----------------- Imagemagick Functions ----------------- //

function montageEach(spritesheet, sprites, sheetSize, folder, savename) {
  return new Promise( (resolve, reject) => {
    // Recursive function to allow successive Promises to resolve in sequence
    let counter = 0;
    let apply = function(spritesheet, sprites) {
      findPNG(folder + sprites[counter]).then(dir => {
        spritesheet.montage(dir);
        if (counter < sprites.length-1) {
          counter += 1;
          apply(spritesheet, sprites);
        } else {
          saveSheet(spritesheet, savename, sheetSize)
            .then(()=>{ resolve() })
        }
      });
    }
    apply(spritesheet, sprites);
  })

}

function moveAndConvert() {
  return new Promise( (resolve, reject) => {
    // This function loads each element of singleSprites and converts/moves the file.
    let counter = 0;
    let apply = function() {
      if (counter < singleSprites.length) {
        findPNG(singleSprites[counter][2]).then(dir => {
          if (dir == './uploads/default/404.png') {
            console.log('missing ', singleSprites[counter[2]], 'skipping...');
            counter += 1;
            apply();
          } else {
            gm(dir)
              .resize(singleSprites[counter][0],singleSprites[counter][1])
              .bitdepth(8)
              .background('transparent')
              .write(importDirectory + '-create/' + singleSprites[counter][3], err => {
                if (err) {console.log('error writing on ' + counter + '[3]:', err)
                } else {
                  console.log('written ' + singleSprites[counter][3]);
                  counter += 1;
                  apply();
                }
              })
          }
        });
      } else { 
        resolve();
      }
    }
    apply();
  })
}

function saveSheet(spritesheet, filename, size) {
  return new Promise( (resolve, reject) => {
    console.log('ran saver function');
    
    if (filename == 'terrain.png') {
      // Only terrain.png has MipMapLevels
      spritesheet
        .geometry('8x8+0+0').tile(size)
        .write(importDirectory + '-create/terrainMipMapLevel2.png', (err) => {
          if (err) {console.log(err);}
          else {console.log('written terrainMipMapLevel2')} 
        })

      spritesheet
        .geometry('4x4+0+0').tile(size)
        .write(importDirectory + '-create/terrainMipMapLevel3.png', (err) => {
          if (err) {console.log(err);}
          else {console.log('written terrainMipMapLevel3')} 
        })  
    }

    spritesheet
      .geometry('16x16+0+0').tile(size)
      .write(importDirectory + '-create/' + filename, (err) => {
        if (err) {console.log(err);}
        else {
          console.log('written', filename);
          resolve();
          // setTimeout(()=>{console.log('resolving');resolve()},1000)
        } 
      })


  })

}

// ----------------- MAIN ----------------- //

module.exports = function(res, cookie) {
  if (!cookie) {return -1}
  cleanup.cleanExistingZip(cookie);
  
  // cookie = 'override';
  try {
    fs.createReadStream(__dirname + '/uploads/' + cookie)
      .pipe( unzip.Extract({ path: __dirname + '/uploads/' + cookie + '-unzip' }) )
      // .on('finish', () => {fixNested().then( () => {} )}
      .on('finish', () => {
        console.log('finished unzip');
        fixNested(cookie).then( () => {
          console.log('outside fixnested');
          process(res, cookie)} )
      });
  } catch(e) {
    res.statusCode = 500;
    res.send('Error: ' + e);
  }
}

function process(res, cookie) {
  console.log('+++ indise process');
  console.log('1');
  // Organize an output folder
  // Create specific user's cookie folder first
  importDirectory = __dirname + '/uploads/' + cookie;
  console.log('2');
  fs.mkdir(importDirectory + '-create', (err) => {
    console.log('3');
    if (err) {console.log('err', err);}

    // Create layout inside user's cookie folder
    layout.forEach((i)=>{
      makeLayout(i, cookie);
    });

    // I'm banking on the fact that directory creation is o1 time. montage 
    // creation should always take longer. It's not waiting for completion
    // Create item & terrain spritesheet

    var blockSpritesheet = gm(256,512).bitdepth(8).background('transparent');
    var itemSpritesheet = gm(256,256).bitdepth(8).background('transparent');
    montageEach(blockSpritesheet, blockSprites, '16x32', 'blocks/', 'terrain.png')
    .then( () => { 
      console.log('Done Step 1');
      
      montageEach(itemSpritesheet, itemSprites, '16x16', 'items/', 'items.png')
      .then( () => { 
        console.log('Done Step 2'); 
        // Copy Destroy Stages 0-9
        moveAndConvert()
        .then( ()=> {
          console.log('Done Step 3');

          // Create a zip archive
          var fileName = __dirname + '/public/pack/' + cookie + '.zip';
          var fileOutput = fs.createWriteStream(fileName);
          var cleanFileWriting = function() {
            // This function performs cleanup which would otherwise cause bugs
            archive = archiver('zip');
            fileOutput = undefined;
          }

          archive.pipe(fileOutput);
          archive.glob("**/*", {cwd: __dirname + '/uploads/' + cookie + '-create/'});
          archive.on('error', function(err){console.log(err)});
          archive.finalize();

          
          fileOutput.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('Done Step 4');
            cleanup.cleanByCookie(cookie);
            cleanFileWriting();
            res.send('/pack/' + cookie + '.zip');
          });

        });
      });
    });






  });
}