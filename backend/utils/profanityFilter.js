const { Filter } = require('bad-words');

const customBadWords = [
  'tangina',
  'putangina',
  'gago',
  'tarantado',
  'bobo',
  'inutil',
  'ulol',
  'pota',
  'kingina',
  'buwisit',
];

const filter = new Filter();
filter.addWords(...customBadWords);

const cleanText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return filter.clean(text);
};

const isProfane = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  return filter.isProfane(text);
};

module.exports = {
  cleanText,
  isProfane,
};
