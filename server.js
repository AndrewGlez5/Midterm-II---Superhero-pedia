const https = require('https');
const express = require('express');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

const characterIds = [...Array(731).keys()].map(i => i + 1);

function getCharacterById(id, callback) {
    const url = `https://akabab.github.io/superhero-api/api/id/${id}.json`;

    https.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            try {
                const character = JSON.parse(data);
                callback(null, character);
            } catch (error) {
                callback(error, null);
            }
        });
    }).on('error', (err) => {
        callback(err, null);
    });
}

function getCharacterByName(name, callback) {
    const url = 'https://akabab.github.io/superhero-api/api/all.json';

    https.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            try {
                const characters = JSON.parse(data);
                const character = characters.find(char => char.name.toLowerCase() === name.toLowerCase());

                if (character) {
                    callback(character, character.id);  // Return the character's ID
                } else {
                    callback(new Error('Character not found'), null);
                }
            } catch (error) {
                callback(error, null);
            }
        });
    }).on('error', (err) => {
        callback(err, null);
    });
}

/*
getCharacterByName('Batman', (error, id) => {
    if (error) {
        console.error(error.message);
    } else {
        console.log(`Character ID: ${id}`);
        console.log(typeof(id));
    }
});
*/

app.get('/characters', async (req, res) => {
    const characterList = await Promise.all(
        characterIds.map(async (id) => {
            return new Promise((resolve) => {
                getCharacterById(id, (err, character) => {
                    if (err || !character) {
                        resolve(null);
                    } else {
                        resolve({ 
                            id, 
                            name: character.name, 
                            image: character.images.sm
                        }); 
                    }
                });
            });
        })
    );

    const validCharacters = characterList.filter(char => char !== null);

    res.render('characters', { characterList: validCharacters });
});

app.get('/', (req, res) => {
    //res.redirect(`/${characterIds[0]}`);
    res.redirect('/characters');
    //res.render("characters");
});

function findNextValidId(currentIndex, direction, callback) {
    let newIndex = currentIndex;

    function checkNext() {
        newIndex = (newIndex + direction + characterIds.length) % characterIds.length;
        const nextId = characterIds[newIndex];

        getCharacterById(nextId, (err, character) => {
            if (!err && character) {
                callback(null, nextId);
            } else {
                checkNext();
            }
        });
    }

    checkNext();
}

app.get('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    if (!characterIds.includes(id)) {
        return res.status(404).send('Character not jeje found');
    }

    getCharacterById(id, (err, character) => {
        if (err || !character) {
            const currentIndex = characterIds.indexOf(id);
            findNextValidId(currentIndex, 1, (err, nextValidId) => {
                return res.redirect(`/${nextValidId}`);
            });
        } else {
            const currentIndex = characterIds.indexOf(id);

            findNextValidId(currentIndex, -1, (err, previousCharacterId) => {
                findNextValidId(currentIndex, 1, (err, nextCharacterId) => {
                    res.render('index', {
                        character,
                        previousCharacterId,
                        nextCharacterId
                    });
                });
            });
        }
    });
});

app.post('/searching', async (req, res) => {
    const name = req.query.searched;  // Get the search query from the URL
    console.log(name)
    
    if (!name) {
      return res.status(400).send('Search query cannot be empty');
    }
    
    getCharacterByName(name, (character, validId) => {
        if (character) {
          currentId = validId;
          res.render("index", { character, currentId});
        } else {
          res.render("error");
        }
      });
    
});

app.listen(3000, () => {
    console.log("Aplication is listening in port 3000");
});
