import React, { useState, useEffect } from 'react';
import { KittyGrid, type Cat } from './Grid';

interface HzCollection {
  watch: () => {
    subscribe: (
      onNext: (items: Cat[]) => void,
      onError: (error: Error) => void
    ) => { unsubscribe: () => void };
  };
  find: (id: string) => {
    fetch: () => {
      subscribe: (callback: (msg: Cat) => void) => void;
    };
  };
  update: (cat: Partial<Cat>) => void;
}

interface AppProps {
  hz: (collection: string) => HzCollection;
}

function App({ hz }: AppProps): JSX.Element {
  const [kittys, setKittys] = useState<Cat[]>([]);
  const cats: HzCollection = hz('cats');

  useEffect(() => {
    const subscription = cats.watch().subscribe(
      (items: Cat[]) => {
        console.log('sub');
        const sortedCats = items.sort((a, b) => b.votes - a.votes);
        setKittys(sortedCats);
      },
      (err: Error) => {
        console.log(err);
      }
    );

    return () => subscription.unsubscribe();
  }, [cats]);

  const onKittyClick = (id: string): void => {
    console.log(id);
    cats.find(id).fetch().subscribe(msg => {
      cats.update({
        id: msg.id,
        votes: msg.votes + 1
      });
    });
  };

  return (
    <div>
      <h3>All the cats...but which is best?</h3>
      <div>(click to vote)</div>
      <img id="crown" src="/crown.png" alt="crown" />
      <KittyGrid kittys={kittys} onKittyClick={onKittyClick} />
    </div>
  );
}

export default App;
