import db from '../db';
import { v4 as uuidv4 } from 'uuid';

const srcRegex = /<img src="(.*)">/gi;

const getCatsFromApi = (count: number): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        fetch(`http://thecatapi.com/api/images/get?size=large&type=gif&results_per_page=${count}&format=html`)
        .then(res => res.text())
        .then(body => {
          const srcs: string[] = [];
          let match: RegExpExecArray | null;
          while (true) {
            match = srcRegex.exec(body);
            if (match === null) break;
            srcs.push(match[1]);
          }
          resolve(srcs);
        }).catch(reject);
    });
};

const recreateCatsInDb = async (catImages: string[]): Promise<void> => {
    const tables: string[] = await db.tableList().run();
    if (!tables.includes('cats')) {
        await db.tableCreate('cats').run();
    }
    await db.table('cats').delete().run();
    
    const catDocs = catImages.map(catImage => ({
        id: uuidv4(),
        src: catImage,
        votes: 0
    }));

    await db.table('cats').insert(catDocs).run();
}

const updateCats = async (): Promise<void> => {
    console.log('updating cats');
    try {
        const cats = await getCatsFromApi(10);
        await recreateCatsInDb(cats);
        console.log('cats updated', cats);
    } catch (err) {
        console.error(err);
    }
}

export { updateCats };
