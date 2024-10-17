const https = require('https');
const express = require('express');
const app = express();

// Configurar el motor de plantillas EJS
app.set('view engine', 'ejs');

// Array de IDs de los personajes
const characterIds = [...Array(731).keys()].map(i => i + 1);

// Función para obtener datos de un personaje desde la API sin usar axios
function getCharacterById(id, callback) {
    const url = `https://akabab.github.io/superhero-api/api/id/${id}.json`;

    https.get(url, (response) => {
        let data = '';

        // Acumular los datos que van llegando
        response.on('data', (chunk) => {
            data += chunk;
        });

        // Procesar los datos una vez que hayan llegado completamente
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


// Ruta para mostrar todos los personajes
app.get('/characters', async (req, res) => {
    const characterList = await Promise.all(
        characterIds.map(async (id) => {
            return new Promise((resolve) => {
                getCharacterById(id, (err, character) => {
                    if (err || !character) {
                        resolve(null); // Si hay un error o no se encuentra el personaje, devuelve null
                    } else {
                        resolve({ 
                            id, 
                            name: character.name, 
                            image: character.images.sm // Guardar la URL de la imagen
                        }); 
                    }
                });
            });
        })
    );

    // Filtra los personajes válidos (no nulos)
    const validCharacters = characterList.filter(char => char !== null);

    // Renderiza la plantilla 'characters.ejs' con la lista de personajes válidos
    res.render('characters', { characterList: validCharacters });
});



// Ruta para redirigir al primer personaje cuando el usuario accede a "/"
app.get('/', (req, res) => {
    res.redirect(`/${characterIds[0]}`);  // Redirige al primer personaje
});

// Función para obtener el siguiente ID válido
function findNextValidId(currentIndex, direction, callback) {
    let newIndex = currentIndex;

    // Función auxiliar para buscar el siguiente ID válido
    function checkNext() {
        newIndex = (newIndex + direction + characterIds.length) % characterIds.length;
        const nextId = characterIds[newIndex];

        getCharacterById(nextId, (err, character) => {
            if (!err && character) {
                // Si el personaje es válido, devolvemos su ID
                callback(null, nextId);
            } else {
                // Continuamos buscando si no es válido
                checkNext();
            }
        });
    }

    // Empezar la búsqueda
    checkNext();
}

// Ruta para mostrar un personaje por ID
app.get('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    if (!characterIds.includes(id)) {
        return res.status(404).send('Character not found');
    }

    getCharacterById(id, (err, character) => {
        if (err || !character) {
            // Si el personaje no es válido, buscar el siguiente válido
            const currentIndex = characterIds.indexOf(id);
            findNextValidId(currentIndex, 1, (err, nextValidId) => {
                return res.redirect(`/${nextValidId}`);
            });
        } else {
            const currentIndex = characterIds.indexOf(id);

            // Encontrar el ID anterior válido
            findNextValidId(currentIndex, -1, (err, previousCharacterId) => {
                // Encontrar el siguiente ID válido
                findNextValidId(currentIndex, 1, (err, nextCharacterId) => {
                    // Renderizar la plantilla con los IDs válidos
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



// Servidor escuchando en el puerto 3000
app.listen(3000, () => {
    console.log("Aplication is listening in port 3000");
});
