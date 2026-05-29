const isProduction = process.env.NODE_ENV === "production";

function write(method, args) {
  if (!console[method]) {
    return;
  }

  console[method](...args);
}

function debug(...args) {
  if (!isProduction) {
    write("debug", args);
  }
}

function info(...args) {
  if (!isProduction) {
    write("log", args);
  }
}

function warn(...args) {
  write("warn", args);
}

function error(...args) {
  write("error", args);
}

module.exports = {
  debug,
  error,
  info,
  isProduction,
  warn
};
