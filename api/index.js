'use strict';

const { handleRequest } = require('../stock-lens-market-mayhem/server/server.js');

module.exports = (req, res) => handleRequest(req, res);
