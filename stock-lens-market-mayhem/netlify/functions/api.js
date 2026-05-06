// Netlify serverless function wrapper for Stock-LENS API
// This forwards requests to the shared Node request handler.

const { handleRequest } = require('../../server/server.js');

exports.handler = async (event, context) => {
  try {
    const path = (event.path || event.rawPath || '/').replace(/^\/.netlify\/functions\/api/, '') || '/';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const headers = event.headers || {};
    const queryString = event.queryStringParameters ? new URLSearchParams(event.queryStringParameters).toString() : '';
    const body = event.body || null;

    const url = `${path}${queryString ? '?' + queryString : ''}`;
    const mockReq = new MockRequest(method, url, headers, body);
    const mockRes = new MockResponse();
    
    return new Promise((resolve) => {
      mockRes.onFinish(() => {
        resolve({
          statusCode: mockRes.statusCode,
          headers: mockRes.getHeaders(),
          body: mockRes.body,
          isBase64Encoded: false
        });
      });

      handleRequest(mockReq, mockRes);
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
    this.finishListeners = [];
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
    if (event !== 'finish') return;
    if (this.finished) {
      callback();
      return;
    }
    this.finishListeners.push(callback);
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
    if (event !== 'finish') return;
    for (const callback of this.finishListeners.splice(0)) {
      callback();
    }
  }
}
