'use strict';

const Task = require('../models/task');
const SilentError = require('silent-error');

class TestTask extends Task {
  constructor(options) {
    super(options);
    this.testem = this.testem || new (require('testem'))();
  }

  invokeTestem(options) {
    let testem = this.testem;
    let task = this;

    return new Promise((resolve, reject) => {
      testem.setDefaultOptions(task.defaultOptions(options));
      testem.startCI(task.transformOptions(options), (exitCode, error) => {
        if (error) {
          reject(error);
        } else if (exitCode !== 0) {
          reject(new SilentError('Testem finished with non-zero exit code. Tests failed.'));
        } else {
          resolve(exitCode);
        }
      });
    });
  }

  addonMiddlewares(options) {
    this.project.initializeAddons();

    return this.project.addons.reduce((addons, addon) => {
      if (addon.testemMiddleware) {
        addons.push(function () {
          addon.testemMiddleware(...arguments, options);
        });
      }

      return addons;
    }, []);
  }

  defaultOptions(options) {
    let defaultOptions = this.transformOptions(options);
    defaultOptions.cwd = options.outputPath;
    /* eslint-disable camelcase */
    defaultOptions.config_dir = process.cwd();
    /* eslint-enable camelcase */
    return defaultOptions;
  }

  transformOptions(options) {
    let transformed = {
      host: options.host,
      port: options.port,
      debug: options.testemDebug,
      reporter: options.reporter,
      middleware: this.addonMiddlewares(options),
      launch: options.launch,
      file: options.configFile,
      /* eslint-disable camelcase */
      test_page: options.testPage,
      query_params: options.queryString,
      /* eslint-enable camelcase */
    };

    transformed.key = options.ssl ? options.sslKey : undefined;
    transformed.cert = options.ssl ? options.sslCert : undefined;

    return transformed;
  }

  run(options) {
    return this.invokeTestem(options);
  }
}

module.exports = TestTask;
