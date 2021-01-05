var fs = require('fs-extra');
var unzip = require('unzipper');
var archiver = require('archiver');
var archive = archiver('zip');
var cleanup = require('./cleanup');
var gm = require('gm').subClass({imageMagick: true});
const path = require('path');
var fixNested = require('./fixNested');
var blockSprites = require('./sprites-block');
var itemSprites = require('./sprites-item');
var singleSprites = require('./sprites-single');
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
    fs.mkdir(__dirname + '/uploads/' + cookie + '-create' + folder, () => console.log('created dir'));
  }
}

function findPNG(shortDirectory, filename, index /* optional */) {
  return new Promise( (resolve, reject) => {
    const debug = false;
    const userDir = importDirectory + '-unzip/assets/minecraft/textures/' + shortDirectory + filename;
    const fallbackDir = path.join(
      __dirname,
      debug ? '/uploads/fallback_debug/' : '/uploads/fallback/',
      shortDirectory,
      `${index}.png`,
    );
    console.log('a');
    
    // console.log('fallbackdir', fallbackDir)
    if (fs.existsSync(userDir)) {
      resolve(userDir);
    } else if (fs.existsSync(fallbackDir)) {
      resolve(fallbackDir);
    } else {
      console.log('  ! Could not fallback for this texture:', filename, index);
      resolve(__dirname + '/uploads/fallback/404.png');
    }
  })

}

// ----------------- Imagemagick Functions ----------------- //

function montageEach(spritesheet, sprites, sheetSize, folder, savename) {
  return new Promise( (resolve, reject) => {
    // Recursive function to allow successive Promises to resolve in sequence
    let counter = 0;
    let apply = function(spritesheet, sprites) {
      findPNG(folder, sprites[counter], counter).then(dir => {
        spritesheet.montage(dir);
        if (counter < sprites.length-1) {
          counter += 1;
          apply(spritesheet, sprites);

          return;
        }

        saveSheet(spritesheet, savename, sheetSize).then(() => resolve())
      });
    }

    apply(spritesheet, sprites);
  });

}

function moveAndConvert() {
  return new Promise( (resolve, reject) => {
    // This function loads each element of singleSprites and converts/moves the file.
    let counter = 0;
    let apply = function() {
      if (counter < singleSprites.length) {
        findPNG('', singleSprites[counter][2]).then(dir => {
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
  // Organize an output folder
  // Create specific user's cookie folder first
  importDirectory = __dirname + '/uploads/' + cookie;
  fs.mkdir(importDirectory + '-create', (err) => {
    if (err) {console.log('err', err);}

    // Create layout inside user's cookie folder
    layout.forEach((i)=>{
      makeLayout(i, cookie);
    });

    // I'm banking on the fact that directory creation is o1 time. montage 
    // creation should always take longer. It's not waiting for completion
    // Create item & terrain spritesheet

    var blockSpritesheet = gm(256,544).bitdepth(8).background('transparent');
    var itemSpritesheet = gm(256,272).bitdepth(8).background('transparent');
    console.log('1');
    montageEach(blockSpritesheet, blockSprites, '16x34', 'block/', 'terrain.png')
    .then( () => { 
      console.log('2');
      montageEach(itemSpritesheet, itemSprites, '16x17', 'item/', 'items.png')
      .then( () => { 
        console.log('3');
        // Copy Destroy Stages 0-9
        moveAndConvert()
        .then( ()=> {
          console.log('4');

          // Create a zip archive
          var fileName = __dirname + '/public/pack/' + cookie + '.zip';
          var fileOutput = fs.createWriteStream(fileName);
          var cleanFileWriting = function() {
            // This function performs cleanup which would otherwise cause bugs
            archive = archiver('zip');
            fileOutput = undefined;
          }

          archive.pipe(fileOutput);
          archive.glob("**/*", { cwd: path.join(__dirname, '/uploads/', cookie, '-create/') });
          archive.on('error', function(err){console.log(err)});
          archive.finalize();

          console.log('5');
          fileOutput.on('close', function () {
            console.log('6');
            console.log(archive.pointer() + ' total bytes');
            console.log('Done Step 4');
            cleanup.cleanByCookie(cookie); // todo: re-enable
            cleanFileWriting();
            res.send('/pack/' + cookie + '.zip');
          });

        });
      });
    });






  });
}