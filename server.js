const https = require('https');
const express = require('express');
const NodeCache = require('node-cache');
const app = express();

const cache = new NodeCache({ stdTTL: 3600 });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const characterIds = [...Array(731).keys()].map(i => i + 1);

function getCharacterById(id, callback) {
    const cachedCharacter = cache.get(id);
    if (cachedCharacter) {
        return callback(null, cachedCharacter);
    }

    const url = `https://akabab.github.io/superhero-api/api/id/${id}.json`;

    https.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            try {
                const character = JSON.parse(data);
                cache.set(id, character);
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
                    return callback(null, character);
                } else {
                    return callback(new Error('Character not found'), null);
                }
            } catch (err) {
                callback(err, null);
            }
        });
    }).on('error', (err) => {
        callback(err, null);
    });
}

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
    res.redirect('/characters');
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
        return res.status(404).send('Character not found');
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

app.post('/searching', (req, res) => {
    const name = req.body.searched;
    
    if (!name || name.trim() === "") {
        return res.render('error', { message: 'Search query cannot be empty' });
    }

    getCharacterByName(name, (err, character) => {
        if (err) {
            console.error(err);
            return res.status(404).render('error', { message: 'Character not found' });
        }

        const currentIndex = characterIds.indexOf(character.id);
        
        const previousCharacterId = currentIndex > 0 ? characterIds[currentIndex - 1] : characterIds[characterIds.length - 1];
        const nextCharacterId = currentIndex < characterIds.length - 1 ? characterIds[currentIndex + 1] : characterIds[0];

        res.render("index", { 
            character,
            previousCharacterId,
            nextCharacterId
        });
    });
});

app.listen(3000, () => {
    console.log("Application is listening on port 3000");
});