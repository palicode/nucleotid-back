var re = require('xregexp');

module.exports.unicodeWords = (text, symbols) => {
  return re("^[\\p{L}"+re.escape(symbols)+"]+(?:\\s[\\p{L}"+re.escape(symbols)+"]+)*$").test(text);
};

module.exports.unicodeDigitsWords = (text, symbols) => {
  return re("^[\\p{L}\\d"+re.escape(symbols)+"]+(?:\\s[\\p{L}\\d"+re.escape(symbols)+"]+)*$").test(text);
};

module.exports.unicodeWord = (text) => {
  return re("^\\p{L}+$").test(text);
};
