const fetch = require('node-fetch');
const db = require('../db');
const uuid = require('uuid');

const srcRegex = /<img src="(.*)">/gi;

const getCatsFromApi = (count) => {
    return new Promise((resolve, reject) => {
        fetch(`http://thecatapi.com/api/images/get?size=large&type=gif&results_per_page=${count}&format=html`)
        .then(res => {
            return res.text();
        }).then(body => {
          const srcs = [];
          while ( ( match = srcRegex.exec( body ) ) && srcs.push( match[1] ) ) {};
          resolve(srcs);
        }).catch(ex => {
            reject(ex);
        });
    });
};

const recreateCatsInDb = (catImages) => {
    let catTable;
    // delete then recreate the cats
    return db.table('cats').delete().run()
    .then(() => {
        const catDocs = catImages.map(catImage => {
            return {
                id: uuid.v4(),
                src: catImage,
                votes: 0
            }
        });

        return db.table('cats').insert(catDocs).run();
    });
}

const updateCats = () => {
    return getCatsFromApi(10)
    .then(recreateCatsInDb);
}

module.exports = {
    updateCats: updateCats
}
