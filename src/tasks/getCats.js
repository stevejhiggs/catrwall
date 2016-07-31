const fetch = require('node-fetch');
const db = require('../db');
const uuid = require('uuid');

const getCatsFromApi = (count) => {
    return new Promise((resolve, reject) => {
        fetch(`http://thecatapi.com/api/images/get?size=small&results_per_page=${count}&format=html`)
        .then(res => {
            return res.text();
        }).then(body => {
            resolve(body.match(/<img src="(.*)">/gi));
        }).catch(ex => {
            reject(ex);
        });
    });
};

const recreateCatsInDb = (catImages) => {
    let catTable;
    // delete then recreate the cats
    return db.r_internal.table('collections').get('cats').run()
    .then(result => {
        catTable = result.table;
        return db.r.table(catTable).delete().run();
    })
    .then(() => {
        const catDocs = catImages.map(catImage => {
            return {
                id: uuid.v4(),
                src: catImage,
                votes: 0
            }
        });

        return db.r.table(catTable).insert(catDocs).run();
    });
}

const updateCats = () => {
    return getCatsFromApi(10)
    .then(recreateCatsInDb);
}

module.exports = {
    updateCats: updateCats
}