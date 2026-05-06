// Netlify serverless function wrapper for Stock-LENS API
// This forwards requests to the Node.js server bundled as a Netlify function

const http = require('http');

// Cache module instance to avoid re-initialization per request
let serverHandler = null;

async function getServerHandler() {
  if (serverHandler) return serverHandler;
  
  // Dynamically require the server module only once
  const module = require('../../server/server.js');
  return module;
}

exports.handler = async (event, context) => {
  try {
    const path = event.path || event.rawPath || '/';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const headers = event.headers || {};
    const queryString = event.queryStringParameters ? new URLSearchParams(event.queryStringParameters).toString() : '';
    const body = event.body || null;

    // Build the URL to pass to the server
    const url = `${path}${queryString ? '?' + queryString : ''}`;

    // Create a mock request/response for the server handler
    const mockReq = new MockRequest(method, url, headers, body);
    const mockRes = new MockResponse();

    // Import and call the server handler
    const { default: serverHandler } = require('../../server/server.js');
    
    return new Promise((resolve) => {
      mockRes.onFinish(() => {
        resolve({
          statusCode: mockRes.statusCode,
          headers: mockRes.getHeaders(),
          body: mockRes.body,
          isBase64Encoded: false
        });
      });

      // Call your server handler
      serverHandler(mockReq, mockRes);
    });
  } catch (error) {
    console.error('API handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

class MockRequest {
  constructor(method, url, headers, body) {
    this.method = method;
    this.url = url;
    this.headers = headers;
    this.body = body;
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);

    if (event === 'end') {
      setImmediate(() => callback());
    }
    if (event === 'data' && this.body) {
      setImmediate(() => callback(Buffer.from(this.body)));
    }
  }

  once(event, callback) {
    this.on(event, callback);
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(...args));
    }
  }

  destroy() {}
}

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
    this.finished = false;
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = { ...this.headers, ...headers };
  }

  write(data) {
    this.body += typeof data === 'string' ? data : data.toString();
  }

  end(data) {
    if (data) {
      this.body += typeof data === 'string' ? data : data.toString();
    }
    this.finished = true;
    this.emit('finish');
  }

  getHeaders() {
    return this.headers;
  }

  on(event, callback) {
    if (event === 'finish' && this.finished) {
      callback();
    }
  }

  once(event, callback) {
    this.on(event, callback);
  }

  onFinish(callback) {
    if (this.finished) {
      callback();
    } else {
      this.on('finish', callback);
    }
  }

  emit(event) {
    // Mock event emitter
  }
}
