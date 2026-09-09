const { getUserAgent } = require('./utils/index.js');

function getRequestTimeout() {
  return 30000;
}

function parseJsonResponse(data, serverName = "Server") {
  if (typeof data === "object" && data !== null) return data;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("<") || trimmed.startsWith("<!DOCTYPE")) {
      throw new Error(`${serverName} returned an HTML error page (blocked or rate-limited).`);
    }
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      throw new Error(`${serverName} returned an invalid response format.`);
    }
  }
  throw new Error(`${serverName} returned an empty response.`);
}

async function scraperFetch(options, serverName = "Server") {
  const method = (options.method || (options.data ? "POST" : "GET")).toUpperCase();
  const headers = { ...options.headers };

  if (!headers["User-Agent"] && !headers["user-agent"]) {
    headers["User-Agent"] = getUserAgent();
  }

  let body = undefined;
  if (options.data !== undefined) {
    if (typeof options.data === "object") {
      if (headers["Content-Type"]?.includes("application/x-www-form-urlencoded")) {
        body = new URLSearchParams(options.data).toString();
      } else {
        body = JSON.stringify(options.data);
        if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
      }
    } else {
      body = options.data;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getRequestTimeout());

  let fetchUrl = options.url;
  if (options.params) {
    const q = new URLSearchParams(options.params).toString();
    if (q) fetchUrl += (fetchUrl.includes("?") ? "&" : "?") + q;
  }

  try {
    const res = await fetch(fetchUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const resHeaders = {};
    res.headers.forEach((val, key) => {
      resHeaders[key.toLowerCase()] = val;
    });

    const contentType = res.headers.get("content-type") || "";
    let data;
    if (options.responseType === "arraybuffer") {
      data = await res.arrayBuffer();
    } else if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    const response = {
      status: res.status,
      headers: resHeaders,
      data,
      url: res.url,
    };

    if (options.rawResponse) {
      return response;
    }

    if (options.parseJson !== false) {
      return parseJsonResponse(response.data, serverName);
    }

    return response.data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function createScraperResult(success, payload, statusCode = null) {
  if (success) {
    return { status: true, result: payload };
  }
  const res = {
    status: false,
    message: typeof payload === "string" ? payload : payload?.message || "Scraping failed.",
  };
  if (statusCode !== null && statusCode !== undefined) {
    res.statusCode = statusCode;
  }
  return res;
}

module.exports = {
  getRequestTimeout,
  parseJsonResponse,
  scraperFetch,
  createScraperResult
};
