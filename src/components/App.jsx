import React from 'react';
import Grid from './Grid';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { kittys: [] };
    this.hz = props.hz;
    this.cats = this.hz('cats');
  }

  componentDidMount() {
    this.cats.watch().subscribe(
      (items) => {
        const sortedCats = items.sort((a, b) => b.votes - a.votes);
        this.setState({ kittys: sortedCats });
      },
      // If an error occurs, this function
      //  will execute with the `err` message
      (err) => {
        console.log(err);
      }
    );
  }

  render() {
    const onKittyClick = (id) => {
      const cats = this.cats;
      console.log(id);
      cats.find(id).fetch().subscribe(msg => {
        this.cats.update({
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
        <Grid kittys={this.state.kittys} onKittyClick={onKittyClick} />
      </div>
    );
  }
}

App.propTypes = {
  hz: React.PropTypes.function
};

export default App;
