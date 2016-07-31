import horizon from '@horizon/client';

const hz = horizon({
  secure: false
});

hz.connect();

const cats = hz('cats');
cats.fetch().subscribe(
  (items) => {
    items.forEach((item) => {
      // Each result from the chat collection
      //  will pass through this function
      console.log(item);
    });
  },
  // If an error occurs, this function
  //  will execute with the `err` message
  (err) => {
    console.log(err);
  });
