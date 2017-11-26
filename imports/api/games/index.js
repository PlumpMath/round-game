import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { cards } from '/imports/helpers/types';

const Games = new Mongo.Collection('games');

Games.deny({
  insert() { return false; },
  update() { return false; },
  remove() { return false; },
});

Games.schema = new SimpleSchema({
  users: {
    type: [String],
  },
  isFinished: {
    type: Boolean,
    optional: true,
  },
  createdAt: {
    type: Date,
    autoValue: () => new Date(),
  },
  currentBids: {
    type: Object,
    blackbox: true,
    optional: true,
    autoValue() {
      return this.isSet ? this.value : {
        [this.field('users').value[0]]: Games.randomCombination(),
        [this.field('users').value[1]]: Games.randomCombination(),
      };
    },
  },
  previousBids: {
    type: Object,
    blackbox: true,
    optional: true,
  },
});

Games.attachSchema(Games.schema);

Games.randomCombination = () => [
  cards[Math.floor(Math.random() * 3)],
  cards[Math.floor(Math.random() * 3)],
  cards[Math.floor(Math.random() * 3)],
];

export default Games;