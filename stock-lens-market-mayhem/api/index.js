'use strict';

const { handleRequest } = require('../server/server.js');

module.exports = (req, res) => handleRequest(req, res);