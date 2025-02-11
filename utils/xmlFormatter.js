const xml2js = require("xml2js");

const convertToXML = (data) => {
  const builder = new xml2js.Builder();
  return builder.buildObject(data);
};

module.exports = { convertToXML };
