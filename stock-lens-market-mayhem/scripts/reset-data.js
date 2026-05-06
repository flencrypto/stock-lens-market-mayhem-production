'use strict';
const fs = require('fs');
const path = require('path');
const { emptyData } = require('../server/src/dataStore');
const config = require('../server/src/config');
const dir = path.dirname(config.dataFile);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(config.dataFile, JSON.stringify(emptyData(), null, 2));
console.log(`Reset ${config.dataFile}`);
