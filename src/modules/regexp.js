var re = require('xregexp');

module.exports.unicodeWords = (text, symbols) => {
  if (!symbols)
    return re("^[\\p{L}]+(?:\\s[\\p{L}]+)*$").test(text);
  else
    return re("^[\\p{L}"+re.escape(symbols)+"]+(?:\\s[\\p{L}"+re.escape(symbols)+"]+)*$").test(text);
};

module.exports.unicodeDigitsWords = (text, symbols) => {
  if (!symbols)
    return re("^[\\p{L}\\d]+(?:\\s[\\p{L}\\d]+)*$").test(text);
  else
    return re("^[\\p{L}\\d"+re.escape(symbols)+"]+(?:\\s[\\p{L}\\d"+re.escape(symbols)+"]+)*$").test(text);
};

module.exports.unicodeWord = (text) => {
  return re("^\\p{L}+$").test(text);
};
