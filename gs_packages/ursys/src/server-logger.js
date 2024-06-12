/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-param-reassign */
/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  LOGGER - WIP
  porting PLAE logger for now to get it minimally working

  SUPER UGLY PORT WILL CLEAN UP LATER AVERT YOUR EYES OMG

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const DBG = false;

/// LOAD LIBRARIES ////////////////////////////////////////////////////////////
/// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
const PATH = require('path');
const FSE = require('fs-extra');
/// for server-side modules,
const TOUT = require('./util/prompts').makeTerminalOut(' URLOG');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
const FILES = require('./util/files');
const FNAME = require('./util/files-naming');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let LOGGING_ENABLED = false; // default
let LASTRTLOGGED = ''; // The last data logged to a real time log. Used to reduce redundant logging.
let SIM_RUNNING = false;

/// MODULE-WIDE VARS //////////////////////////////////////////////////////////
/// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
let LOG_DIR;
const LOG_DELIMITER = '\t';
let fs_log = null;
let rt_log = null;

function StartLogging(options = {}) {
  if (!options.runtimePath) throw Error('runtime path is required');
  if (!options.serverName) options.serverName = '<UNNAMED SERVER>';
  // initialize event logger
  LOG_DIR = PATH.join(options.runtimePath, 'logs');
  let dir = PATH.resolve(LOG_DIR);
  try {
    TOUT(`logging to ${dir}`);
    FSE.ensureDirSync(dir);
    let logname = `${FNAME.DatedFilename('log')}.txt`;
    let pathname = `${dir}/${logname}`;
    fs_log = FSE.createWriteStream(pathname);
    LogLine(
      `${
        options.serverName
      } APPSERVER SESSION LOG for ${FNAME.DateStamp()} ${FNAME.TimeStamp()}`
    );
    LogLine('---');

    let rtlogname = `${FNAME.DatedFilename('rtlog')}.txt`;
    let rtpathname = `${dir}/${rtlogname}`;
    rt_log = FSE.createWriteStream(rtpathname);
    RTLogLine(
      `${
        options.serverName
      } APPSERVER SESSION REAL-TIME LOG for ${FNAME.DateStamp()} ${FNAME.TimeStamp()}`
    );
    RTLogLine('---');
  } catch (err) {
    if (err) throw new Error(`could not make ${dir} directory`);
  }
}

/**	LOGGING FUNCTIONS ******************************************************/
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/	Log a standard system log message
/*/
function LogLine(...args) {
  if (!fs_log) throw Error('must call StartLogging with runtimePath first');

  let out = `${FNAME.TimeStampMS()} `;
  let c = args.length;
  // arguments are delimited
  if (c) {
    for (let i = 0; i < c; i++) {
      if (i > 0) out += LOG_DELIMITER;
      out += args[i];
    }
  }
  out += '\n';
  fs_log.write(out);
}
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/	Log a standard system log message
/*/
function RTLogLine(...args) {
  if (!rt_log) throw Error('must call StartLogging with runtimePath first');
  let out = `${FNAME.TimeStampMS()} `;
  let c = args.length;
  // arguments are delimited
  if (c) {
    for (let i = 0; i < c; i++) {
      if (i > 0) out += LOG_DELIMITER;
      out += args[i];
    }
  }
  out += '\n';
  rt_log.write(out);
}

// Check if the previous real time log line is the same as the one about to be logged.
function IsRepeatRTLogLine(data) {
  if (typeof data === 'string') {
    // first find if lines are equal
    const linesEqual = data === LASTRTLOGGED;
    // then update LASTRTLOGGED
    LASTRTLOGGED = data;
    return linesEqual;
  } else throw Error('must pass a string');
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
let LOG = {};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * API: Toggle displaylist logging on and off
 *      NOTE does not affect basic logging
 * @param {object} pkt
 * @param {object} pkt.data { enabled: boolean }
 */
LOG.PKT_LogEnable = pkt => {
  LOGGING_ENABLED = pkt.data.enabled;
  return { OK: true };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Handle incoming log events, output them as delimited fields
 *  as defined in server-logger (current it is set to tabs so it copy/pastes
 *  easily into Excel */
LOG.PKT_LogEvent = pkt => {
  let { event, items } = pkt.getData();
  if (DBG) console.log(TOUT, pkt.getInfo(), event, ...items);
  LogLine(pkt.getInfo(), event || '-', ...items);
  return { OK: true };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Handle incoming json stream, output them as individual lines */
LOG.PKT_LogJSON = pkt => {
  let { event, json } = pkt.getData();
  if (DBG) console.log(TOUT, pkt.getInfo(), event, json);
  LogLine(pkt.getInfo(), event || '-', json);
  return { OK: true };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Handle incoming real-time stream, output them as individual lines
 *       Used for POZYX and PTRACK logging
 */
LOG.PKT_RTLog = pkt => {
  let { event, items } = pkt.getData();
  const kv = items.map(i => Object.entries(i).flat());
  const data = [event || '-', ...kv].flat();
  RTLogLine(...data);
  return { OK: true };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Write to log as delimited arguments */
LOG.Write = LogLine;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Initialize Logger  */
LOG.StartLogging = StartLogging;

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG.PacketInspector = pkt => {
  // log to separate real-time file
  // ONLY log NET:DISPLAY_LIST updates

  if (SIM_RUNNING && LOGGING_ENABLED && pkt.msg === 'NET:DISPLAY_LIST') {
    const dataString = JSON.stringify(pkt.data, null, 2);
    if (IsRepeatRTLogLine(dataString)) return { OK: true };
    RTLogLine(pkt.s_uaddr, pkt.msg, dataString);
  }
  // track if the sim is running and only write out logs when it is
  else if (pkt.msg == 'NET:HACK_SIM_STOP') {
    SIM_RUNNING = false;
  } else if (pkt.msg == 'NET:HACK_SIM_START') {
    SIM_RUNNING = true;
  }

  return { OK: true };
};

/// EXPORT MODULE DEFINITION //////////////////////////////////////////////////
/// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
module.exports = LOG;
