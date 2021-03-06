import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import Users from '/imports/api/users';
import Games from '/imports/api/games';
import History from '/imports/api/history';

import { statuses } from '/imports/helpers/types';

const setOpponent = (context, opponent) => {
  const isBot = opponent.username === 'bot';

  Users.update(
    { _id: { $in: [opponent._id, context.userId] } },
    { $set: { status: statuses.game } },
    { multi: true },
  );
  const gameId = Games.insert({ users: [opponent._id, context.userId] });

  if (isBot) {
    Meteor.call('games.openCards', { userId: opponent._id });
    Games.update(gameId, { $set: { [`isFinished.${opponent._id}`]: true } });
  }

  Meteor.setTimeout(() => {
    const { isFinished } = Games.findOne(gameId);

    if (!isFinished[opponent._id]) {
      Meteor.call('games.openCards', { userId: opponent._id });
    }
    if (!isFinished[context.userId]) {
      Meteor.call('games.openCards', { userId: context.userId });
    }
  }, 30000);
};

export const startSearch = new ValidatedMethod({
  name: 'user.startSearch',
  validate: null,
  run() {
    if (!this.userId) {
      throw new Meteor.Error('user.startSearch', 'Must be logged in to start search');
    }
    if (Meteor.user().status) {
      throw new Meteor.Error('user.startSearch', 'You can\'t start searching now');
    }

    let opponent = Users.findOne({ status: statuses.search });

    Meteor.setTimeout(() => {
      const game = Games.findOne({ users: this.userId, [`isFinished.${this.userId}`]: { $ne: true } });

      if (!game) {
        opponent = Users.findOne({ username: 'bot' });

        setOpponent(this, opponent);
      }
    }, 10000);

    if (opponent) {
      setOpponent(this, opponent);
    } else {
      Users.update(this.userId, { $set: { status: statuses.search } });
    }
  },
});

export const cancelSearch = new ValidatedMethod({
  name: 'user.cancelSearch',
  validate: null,
  run() {
    if (!this.userId) {
      throw new Meteor.Error('user.cancelSearch', 'Must be logged in to cancel search');
    }
    if (Meteor.user().status !== statuses.search) {
      throw new Meteor.Error('user.cancelSearch', 'You can\'t cancel search now');
    }

    Users.update(this.userId, { $set: { status: statuses.default } });
  },
});

export const getUserPosition = new ValidatedMethod({
  name: 'user.position',
  validate: null,
  run() {
    if (!this.userId) {
      throw new Meteor.Error('user.cancelSearch', 'Must be logged in to cancel search');
    }

    const users = Users.findOne(this.userId);

    return Users.find({ username: { $ne: 'bot' }, points: { $gt: users.points } }).count();
  },
});

export const resetAll = new ValidatedMethod({
  name: 'users.resetAll',
  validate: null,
  run() {
    if (Meteor.isProduction) {
      throw new Meteor.Error('user.cancelSearch', 'You can\'t call this method now');
    }

    Users.update({}, { $set: { status: statuses.default } }, { multi: true });
    Games.remove({});
    History.remove({});
  },
});
