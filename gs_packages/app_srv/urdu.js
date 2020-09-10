#!/usr/bin/env node
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  This is the URSYS Development Utility, which is built to be called from
  package.json scripts or the command line.

  To run from the command line: ./urdu <cmd> or node urdu <cmd>

  DEV TIP: To pass a parameter via npm run script, you have to use -- as in
  npm run myscript -- --myoptions=something

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

const FS = require('fs');
const PROCESS = require('process');
const PATH = require('path');
const shell = require('shelljs');
const minimist = require('minimist');
const URSERVER = require('@gemstep/ursys/server');
const URPACK = require('./src/server-webpack');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = 'URDU';
const RUNTIME_PATH = PATH.join(__dirname, '/runtime');

/// RUNTIME INITIALIZE ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// CHECK NPM CI WAS RUN //////////////////////////////////////////////////////
if (!FS.existsSync('./node_modules')) {
  console.log(`\x1b[30;41m\x1b[37m ${PR} STARTUP ERROR \x1b[0m\n`);
  let out = '';
  out += 'MISSING CRITICAL MODULE\n';
  out += `is this the \x1b[33mfirst time running ${PR}\x1b[0m `;
  out += 'or did you just run \x1b[33mnpm clean:all\x1b[0m?\n';
  out += 'run \x1b[33mnpm ci\x1b[0m to install all node_modules\n';
  console.log(out);
  PROCESS.exit(0);
}
/// CHECK GIT DEPENDENCY //////////////////////////////////////////////////////
if (!shell.which('git')) {
  shell.echo(
    `\x1b[30;41m You must have git installed to run the ${PR} devtool \x1b[0m`
  );
  shell.exit(0);
}
/// COMMAND DISPATCHER ////////////////////////////////////////////////////////
const argv = minimist(process.argv.slice(1));
const cmd = argv._[1];

switch (cmd) {
  case 'dev':
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    RunDevServer();
    break;
  default:
    console.log('unknown command', cmd);
}

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RunDevServer() {
  // git branch information
  const { error, stdout } = shell.exec('git symbolic-ref --short -q HEAD', {
    silent: true
  });
  console.log(PR, 'Starting Development Server...');
  if (error) console.log(PR, 'using repo <detached head>\n');
  if (stdout) console.log(PR, `using repo '${stdout.trim()}' branch\n`);

  // old ursys
  // URSERV.Initialize({ apphost: 'devserver' });
  // URSERV.StartNetwork();
  // URSERV.StartWebServer();

  // new ursys
  (async () => {
    await URPACK.Start();
    await URSERVER.Initialize();
    await URSERVER.StartServer({
      serverName: 'APP_SRV',
      runtimePath: RUNTIME_PATH
    });
  })();
}
