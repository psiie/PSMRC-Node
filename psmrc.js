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
var singleSprites = require('./sprites-single'); // todo: deprecated?
var importDirectory;
var exportDirectory;
var layout = [
  // '/armor',
  // '/font',
  // '/item',
  // '/misc',
  // '/mob',
  // '/art',
  // '/textures'
];

// ----------------- Directory Functions ----------------- //

// todo: deprecated?
function makeLayout(folder, cookie) {
  if (!fs.existsSync(folder)) {
    fs.mkdir(path.join(exportDirectory, folder), () => {
      console.log('Psmrc.js: created dir')
    });
  }
}

function findPNG(shortDirectory, filename, index /* optional */, toggles /* optional */) {
  return new Promise( (resolve, reject) => {
    const debug = false;
    const { canHasItems, canHasTerrain } = toggles;
    const userDir = importDirectory + '-unzip/assets/minecraft/textures/' + shortDirectory + filename;
    let fallbackShortDir = '/uploads/fallback_blank';
    if (canHasItems && canHasTerrain) fallbackShortDir = '/uploads/fallback/';
    if (debug) fallbackShortDir = '/uploads/fallback_debug/';

    const fallbackDir = path.join(__dirname, fallbackShortDir, shortDirectory, `${index}.png`);
    
    if (fs.existsSync(userDir)) {
      resolve(userDir);
    } else if (fs.existsSync(fallbackDir)) {
      resolve(fallbackDir);
    } else {
      resolve(__dirname + '/uploads/fallback/404.png');
    }
  })

}

// ----------------- Imagemagick Functions ----------------- //

function montageEach(spritesheet, sprites, sheetSize, folder, savename, { smoothing, toggles }) {
  return new Promise( (resolve, reject) => {
    // Recursive function to allow successive Promises to resolve in sequence
    let counter = 0;
    let apply = function(spritesheet, sprites) {
      findPNG(folder, sprites[counter], counter, toggles).then(dir => {
        spritesheet.montage(dir);
        if (counter < sprites.length-1) {
          counter += 1;
          apply(spritesheet, sprites);

          return;
        }

        saveSheet(spritesheet, savename, sheetSize, smoothing).then(() => resolve())
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
            console.log('Psmrc.js: missing ', singleSprites[counter[2]], 'skipping...');
            counter += 1;
            apply();
          } else {
            gm(dir)
              .resize(singleSprites[counter][0],singleSprites[counter][1])
              .bitdepth(8)
              .background('transparent')
              .write(importDirectory + '-create/' + singleSprites[counter][3], err => {
                if (err) {console.log('Psmrc.js: error writing on ' + counter + '[3]:', err)
                } else {
                  console.log('Psmrc.js: written ' + singleSprites[counter][3]);
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

function saveSheet(spritesheet, filename, size, smoothing) {
  return new Promise( (resolve, reject) => {
    
    if (filename == 'terrain.png') {
      // Only terrain.png has MipMapLevels
      spritesheet
        .geometry('8x8+0+0').tile(size)
        .write(path.join(exportDirectory, 'terrainMipMapLevel2.png'), (err) => {
          if (err) console.log('Psmrc.js: spritesheet Error: ', err);
          else console.log('Psmrc.js: written terrainMipMapLevel2')
        })

      spritesheet
        .geometry('4x4+0+0').tile(size)
        .write(path.join(exportDirectory, 'terrainMipMapLevel3.png'), (err) => {
          if (err) console.log('Psmrc.js: spritesheet Error: ', err);
          else console.log('Psmrc.js: written terrainMipMapLevel3')
        })  
    }

    spritesheet
      .geometry('16x16+0+0').tile(size)
      .filter(smoothing === 'true' ? 'Lanczos' : 'Point') // scales down without antialiasing
      .write(path.join(exportDirectory, filename), (err) => {
        if (err) console.log('Psmrc.js: spritesheet Error: ', err);
        else {
          console.log('Psmrc.js: written', filename);
          resolve();
        } 
      })


  })

}

// ----------------- MAIN ----------------- //

module.exports = function(res, cookie, options = {}) {
  if (!cookie) {return -1}
  cleanup.cleanExistingZip(cookie);
  
  // cookie = 'override';
  try {
    fs.createReadStream(__dirname + '/uploads/' + cookie)
      .pipe( unzip.Extract({ path: __dirname + '/uploads/' + cookie + '-unzip' }) )
      // .on('finish', () => {fixNested().then( () => {} )}
      .on('finish', () => {
        console.log('Psmrc.js: finished unzip');
        fixNested(cookie).then(() => {
          process(res, cookie, options)} )
      });
  } catch(e) {
    res.statusCode = 500;
    res.send('Error: ' + e);
  }
}

function process(res, cookie, options) {
  const { smoothing } = options;
  // Organize an output folder
  // Create specific user's cookie folder first
  importDirectory = __dirname + '/uploads/' + cookie;
  exportDirectory = path.join(__dirname, '/uploads/', `${cookie}-create`, 'rePatch/PCSE00491/Common/res/TitleUpdate/res');
  fs.mkdirp(exportDirectory, (err) => {
    if (err) {console.log('Psmrc.js: process err', err);}

    // Create layout inside user's cookie folder
    layout.forEach((i)=>{
      makeLayout(i, cookie);
    });

    // I'm banking on the fact that directory creation is o1 time. montage 
    // creation should always take longer. It's not waiting for completion
    // Create item & terrain spritesheet

    var blockSpritesheet = gm(256,544).bitdepth(8).background('transparent');
    var itemSpritesheet = gm(256,272).bitdepth(8).background('transparent');

    montageEach(blockSpritesheet, blockSprites, '16x34', 'block/', 'terrain.png', options)
    .then( () => { 
      montageEach(itemSpritesheet, itemSprites, '16x17', 'item/', 'items.png', options)
      .then( () => { 
        // Copy Destroy Stages 0-9
        moveAndConvert()
        .then( ()=> {

          // Create a zip archive
          var fileName = __dirname + '/public/pack/' + cookie + '.zip';
          var fileOutput = fs.createWriteStream(fileName);
          var cleanFileWriting = function() {
            // This function performs cleanup which would otherwise cause bugs
            archive = archiver('zip');
            fileOutput = undefined;
          }

          archive.pipe(fileOutput);
          archive.glob("**/*", { cwd: path.join(__dirname, '/uploads/', `${cookie}-create/`) });
          archive.on('error', function(err){console.log('Psmrc.js: archive.on()', err)});
          archive.finalize();

          fileOutput.on('close', function () {
            console.log('Psmrc.js: ', archive.pointer() + ' total bytes');
            cleanup.cleanByCookie(cookie);
            cleanFileWriting();
            // console.log('Psmrc.js: sending pack back');
            // res.send('/pack/' + cookie + '.zip');
          });

        });
      });
    });

  });
}
