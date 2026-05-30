const DEFAULT_BASE_URL = 'http://localhost:3000/api';

function getBaseUrl() {
  if (typeof window !== 'undefined' && window.PAYO_API_URL) {
    return window.PAYO_API_URL.replace(/\/$/, '');
  }
  return DEFAULT_BASE_URL;
}

function getOperatorName() {
  const el = document.querySelector('.user-name');
  if (el?.textContent?.trim()) {
    return el.textContent.trim();
  }
  return 'system';
}

export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function buildUrl(path, query) {
  const base = getBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  let url = `${base}${normalizedPath}`;

  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  return url;
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return res.json();
  }

  if (res.status === 204) {
    return null;
  }

  const text = await res.text();
  return text ? { message: text } : null;
}

async function request(method, path, options = {}) {
  const { body, query, headers = {}, raw = false } = options;
  const url = buildUrl(path, query);

  const init = {
    method,
    headers: {
      'X-Operator-Name': getOperatorName(),
      ...headers
    }
  };

  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined && body !== null) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(
      'Unable to reach the Payo API. Ensure the backend server is running.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (raw) {
    if (!res.ok) {
      const payload = await parseResponse(res);
      throw new ApiError(
        payload?.message || `Request failed with status ${res.status}`,
        res.status,
        payload?.error
      );
    }
    return res;
  }

  const payload = await parseResponse(res);

  if (!res.ok) {
    throw new ApiError(
      payload?.message || `Request failed with status ${res.status}`,
      res.status,
      payload?.error
    );
  }

  return payload;
}

export const apiClient = {
  get(path, options = {}) {
    return request('GET', path, options);
  },

  post(path, body, options = {}) {
    return request('POST', path, { ...options, body });
  },

  patch(path, body, options = {}) {
    return request('PATCH', path, { ...options, body });
  },

  delete(path, options = {}) {
    return request('DELETE', path, options);
  },

  async getBlob(path, options = {}) {
    const res = await request('GET', path, { ...options, raw: true });
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') || '';
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    return {
      blob,
      filename: filenameMatch ? filenameMatch[1] : 'download.pdf'
    };
  }
};

export async function checkApiHealth() {
  const base = getBaseUrl().replace(/\/api$/, '');
  const res = await fetch(`${base}/api/health`);
  return res.json();
}
