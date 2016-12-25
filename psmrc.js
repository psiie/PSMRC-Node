var fs = require('fs');
var unzip = require('unzip');
var gm = require('gm').subClass({imageMagick: true});
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
  // Recursive function to allow successive Promises to resolve in sequence
  let counter = 0;
  let apply = function(spritesheet, sprites) {
    findPNG(folder + sprites[counter]).then(dir => {
      spritesheet.montage(dir);
      if (counter < sprites.length-1) {
        counter += 1;
        apply(spritesheet, sprites);
      } else {
        saveSheet(spritesheet, savename, sheetSize);
      }
    });
  }
  apply(spritesheet, sprites);
}

function moveAndConvert() {
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
          console.log(dir);
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
    }
  }
  apply();
}

function saveSheet(spritesheet, filename, size) {
  console.log('ran saver function');
  spritesheet
    .geometry('16x16+0+0').tile(size)
    .write(importDirectory + '-create/' + filename, (err) => {
      if (!err) {console.log('written', filename)} 
      else {console.log(err);}
    })

  if (filename == 'terrain.png') {
    // Only terrain.png has MipMapLevels
    spritesheet
      .geometry('8x8+0+0').tile(size)
      .write(importDirectory + '-create/terrainMipMapLevel2.png', (err) => {
        if (!err) {console.log('written terrainMipMapLevel2')} 
      })

    spritesheet
      .geometry('4x4+0+0').tile(size)
      .write(importDirectory + '-create/terrainMipMapLevel3.png', (err) => {
        if (!err) {console.log('written terrainMipMapLevel3')} 
      })  
  }
}

// ----------------- MAIN ----------------- //

module.exports = function(cookie) {
  if (!cookie) {return -1}
  cookie = 'override';

  fs.createReadStream('uploads/' + cookie)
  .pipe( unzip.Extract({ path: 'uploads/' + cookie + '-unzip' }) )
  .on('finish', () => {
    console.log('finished unzip');
    
    // Organize an output folder
    // Create specific user's cookie folder first
    importDirectory = 'uploads/' + cookie;
    fs.mkdir(importDirectory + '-create', (err) => {
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
      montageEach(blockSpritesheet, blockSprites, '16x32', 'blocks/', 'terrain.png');
      montageEach(itemSpritesheet, itemSprites, '16x16', 'items/', 'items.png');

      // Copy Destroy Stages 0-9
      moveAndConvert();





    });

  });
}