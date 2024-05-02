/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  WebSocketServer and Network Management for URSYS

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

///	LOAD LIBRARIES ////////////////////////////////////////////////////////////
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const WSS = require('ws').Server;
const NetPacket = require('./class-netpacket');
const LOGGER = require('./server-logger');
const TERM = require('./util/prompts').makeTerminalOut(' URNET');
const { PacketHash } = require('./common/ur-detect');
const { CFG_SVR_UADDR } = require('./common/ur-constants');
const {
  InitializeNetInfo,
  SocketAdd,
  SocketDelete,
  GetSocketCount,
  ServerHandlerPromises,
  RemoteHandlerPromises
} = require('./server-datacore');
const { UR_HandleMessage, UR_LocalSignal } = require('./server-message-api');
const { PKT_RegisterHandler } = require('./svc-reg-handlers');
const {
  PKT_SessionLogin,
  PKT_SessionLogout,
  PKT_Session
} = require('./svc-session-v1');
const {
  PKT_RegisterDevice,
  PKT_DeviceDirectory,
  PKT_ControlFrameIn
} = require('./svc-netdevices');
const { PKT_ProtocolDirectory } = require('./svc-netprotocols');
const { PKT_ServiceList, PKT_Reflect } = require('./svc-debug');
const DBG = require('./common/debug-props');

/// DEBUG MESSAGES ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ERR_SS_EXISTS = 'socket server already created';
let m_options;

/// MODULE-WIDE VARS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// sockets
let mu_wss; // websocket server

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// MESSAGE BROKER STARTUP API ////////////////////////////////////////////////
/** stop network */
async function StopNetwork() {
  void m_StopSocketServer();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Initializes the web socket server using the options passed-in
 *  @param {Object} [options] - configuration settings
 *  @param {number} [options.port] - default in ur-config
 *  @param {string} [options.uaddr] - default in ur-config
 *  @returns {Object} complete configuration object
 */
function StartNetwork(options = {}) {
  if (!options.runtimePath) {
    return Error('runtimePath required to start URSYS SERVER');
  }
  // host port uaddr urnet_version
  InitializeNetInfo(options);
  if (mu_wss !== undefined) throw Error(ERR_SS_EXISTS);

  LOGGER.StartLogging(options);
  NetPacket.GlobalSetup({ uaddr: options.uaddr });

  // REGISTER SERVER-BASED MESSAGE HANDLERS
  LOGGER.Write('registering network services');
  UR_HandleMessage('NET:SRV_LOG_ENABLE', LOGGER.PKT_LogEnable);
  UR_HandleMessage('NET:SRV_LOG_EVENT', LOGGER.PKT_LogEvent);
  UR_HandleMessage('NET:SRV_LOG_JSON', LOGGER.PKT_LogJSON);
  UR_HandleMessage('NET:SRV_RTLOG', LOGGER.PacketInspector);
  UR_HandleMessage('NET:SRV_REG_HANDLERS', PKT_RegisterHandler);
  UR_HandleMessage('NET:SRV_SESSION_LOGIN', PKT_SessionLogin);
  UR_HandleMessage('NET:SRV_SESSION_LOGOUT', PKT_SessionLogout);
  UR_HandleMessage('NET:SRV_SESSION', PKT_Session);
  UR_HandleMessage('NET:SRV_REFLECT', PKT_Reflect);
  UR_HandleMessage('NET:SRV_SERVICE_LIST', PKT_ServiceList);
  // NEW DIRECTORY STUFF
  UR_HandleMessage('NET:SRV_PROTOCOLS', PKT_ProtocolDirectory);
  // NEW DEVICES STUFF
  UR_HandleMessage('NET:SRV_DEVICE_REG', PKT_RegisterDevice);
  UR_HandleMessage('NET:SRV_DEVICE_DIR', PKT_DeviceDirectory);
  UR_HandleMessage('NET:SRV_CONTROL_IN', PKT_ControlFrameIn);
  // START SOCKET SERVER
  m_StartSocketServer(options);
  //
  return options;
}

///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** start socket server message broker */
function m_StartSocketServer(options) {
  // create listener.
  try {
    m_options = options;
    mu_wss = new WSS(options);
    mu_wss.on('listening', () => {
      if (DBG.init) TERM(`socket server listening on port ${options.port}`);
      mu_wss.on('connection', (socket, req) => {
        // if (DBG) TERM('socket connected');
        // house keeping
        const added = SocketAdd(socket, req); // assign UADDR to socket
        ConnectAck(socket); // tell client HELLO with new UADDR
        UR_LocalSignal('SRV_SOCKET_ADDED', { uaddr: added });
        // subscribe socket to handlers
        socket.on('message', json => ProcessMessage(socket, json));
        socket.on('close', () => {
          const deleted = SocketDelete(socket); // tell subscribers socket is gone
          UR_LocalSignal('SRV_SOCKET_DELETED', { uaddr: deleted });
        }); // end on 'connection'
      });
    });
  } catch (e) {
    TERM(`FATAL ERROR: ${e.toString}`);
    TERM('Another URSYS server already running on this machine, so exiting');
    process.exit(1);
  }
}
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function m_StopSocketServer() {
  if (!mu_wss) {
    TERM(`... socket server ${m_options.port} already closed`);
    return;
  }
  TERM('... close socket server...');
  await mu_wss.close();
  TERM(`... closed socket server ${m_options.port}`);
}
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Returns a JSON packet to the just-connected client with its assigned URSYS
 * address (UADDR) and the server's UADDR.
 * @param {Object} socket connecting socket
 */
function ConnectAck(socket) {
  let PEERS = { count: GetSocketCount() };
  let data = {
    HELLO: `Welcome to URSYS, ${socket.UADDR}`,
    UADDR: socket.UADDR,
    CFG_SVR_UADDR,
    PEERS,
    ULOCAL: socket.ULOCAL
  };
  socket.send(JSON.stringify(data));
}

///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Main entry point for handling 'message' events from a client socket. It
 * converts the incoming JSON to a NetPacket packet and passes processing
 * further on depending on the type.
 * @param {Object} socket messaging socket
 * @param {string} json text-encoded NetPacket
 */
async function ProcessMessage(socket, json) {
  let pkt = new NetPacket(json);
  // figure out what to do
  switch (pkt.getType()) {
    case 'msig':
    case 'msend':
    case 'mcall':
      await m_RouteMessage(socket, pkt);
      break;
    case 'state':
      // m_HandleState(socket, pkt);
      break;
    default:
      throw new Error(`${TERM} unknown packet type '${pkt.getType()}'`);
  } // end switch
}

///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** MAIN HANDLER that performs the actual work of dispatching messages on behalf
 * of a client to other remote clients, gathers up all the data, and returns
 * it. There are THREE CASES:
 * 1. The incoming message is returning from a remote caller to remote sender
 * 2. The incoming message is intended for the server
 * 3. the incoming message is from a remote reaching another remote
 * @param {Object} socket messaging socket
 * @param {NetPacket} pkt - NetPacket packet instance
 */
let ROUTE_THREAD_COUNTER = 1;
async function m_RouteMessage(socket, pkt) {
  const count = `${ROUTE_THREAD_COUNTER++}`.padStart(4, '0');
  const thread = `T${count}`;
  const hash = PacketHash(pkt);
  const msg = `'${pkt.getMessage()}'`;
  // TERM('');
  // TERM(`${thread} received ${hash} '${pkt.msg}' on socket ${socket.UADDR}`);
  // (1) Is the incoming message a response to a message that the server sent?
  // It might have been a duplicate packet ('forwarded') or one the server itself sent.
  // In either case, the packet will invoke whatever function handler is associated with
  // it and complete the transaction function. Note that dispatched messages comprise
  // of the original packet and the forwarded duplicate packet(s) that the server
  // recombines and returns to the original packet sender
  if (pkt.isResponse()) {
    // const slog = pkt.seqlog.join('>');
    // TERM(`${thread} ${msg} completing transaction ${hash} ${slog}`);
    pkt.transactionComplete();
    return;
  }
  // RealTime Log
  LOGGER.PacketInspector(pkt);

  // (2) If we got this far, it's a new message.
  // Does the server implement any of the messages? Let's add that to our
  // list of promises. It will return empty array if there are none.
  let promises = ServerHandlerPromises(pkt, thread);
  // (3) If the server doesn't implement any promises, check if there are
  // any remotes that have registered one.
  if (promises.length === 0) promises = RemoteHandlerPromises(pkt, thread);
  // (3a) If there were NO HANDLERS defined for the incoming message, then
  // this is an error. If the message is a CALL, then report an error back to
  // the originator; other message types don't expect a return value.
  if (promises.length === 0) {
    const out = `${hash} can't find ${msg} for ${hash}`;
    const info = 'check (1) remote is offline or (2) using send instead of raise';
    if (DBG.calls) TERM.warn(`${thread} ${out}`);
    // return transaction to resolve callee
    pkt.setData({
      code: NetPacket.CODE_NO_MESSAGE,
      error: out,
      info
    });
    if (pkt.isType('mcall')) pkt.transactionReturn(socket);
    return;
  }
  // (3b) We have at least one promise for remote handlers.
  // It will either be server calls or remote calls. The server
  // always takes precedence over remote calls so clients can't
  // subscribe to critical system messages intended only for
  // the server!

  // Print some debugging messages
  const notServer = !pkt.isServerMessage();
  // if (DBG.calls) log_PktDirection(pkt, 'call', promises);
  // if (DBG.calls && notServer) log_PktTransaction(pkt, 'queuing', promises);

  /* (3c) MAGICAL ASYNC/AWAIT BLOCK ****************************/
  /* SERVER MESSAGES: promises immediate invocation of the
     handlerFunction which must return a NetPacket data object
     REMOTE MESSAGES: promises are from pkt.transactionStart()
     which sends a packet and stores a hashkey that has the
     resolve() in it.
  */
  // TERM(`${thread} sleeping ${msg} ${hash}`);
  let pktArray = await Promise.all(promises).catch(err => {
    TERM(`${thread} ERROR IN PROMISE`, err);
  });
  // TERM(`${thread} waking up ${msg} ${hash}`);
  /* END MAGICAL ASYNC/AWAIT BLOCK *****************************/
  // (3d) Print some more debugging messages after async
  /* SERVER MESSAGES: runs immediately in this thread
     REMOTE MESSAGES: this thread is "slept" until a subsequent
     message comes in to 'unlock' it by calling the matching
     handlerFunction that contains the original thread Promise
     resolve() function.
  */

  if (DBG.xact) {
    if (notServer) log_PktTransaction(pkt, 'resolved');
    log_PktDirection(pkt, 'rtrn', promises);
  }

  // (3e) If the call type doesn't expect return data, we are done!
  if (!pkt.isType('mcall')) return;
  // TERM(`${thread} post-promise mcall ${hash}`);

  // (3f) If the call type is 'mcall', and we need to return the original
  /* message packet to the original caller with updated data When there are
     multiple results, an array of results are returned. Otherwise, a plain
     object is returned.
  */

  let data;
  if (pktArray.length === 0) data = {};
  if (pktArray.length === 1) data = pktArray[0];
  if (pktArray.length > 1) data = pktArray;

  // (3g) ...then return the combined data using NetPacket.ReturnTransaction()
  // on the caller's socket, which we have retained through the magic of closures!
  /* NOTE that the 'pkt' variable is the ORIGINAL packet received by the
     originator; this thread was slept before and now resumes.
  */
  pkt.setData(data);
  const json = JSON.stringify(data);
  // TERM(`${thread} transaction ${hash} return payload:`);
  // TERM(json);
  pkt.transactionReturn(socket); // original requesting packet
}

/// DEBUGGING OUTPUT //////////////////////////////////////////////////////////
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** MAIN HANDLER (currently stub) for network-synched state messages, which
 * are not yet implemented in URSYS
 * @param {Object} socket messaging socket
 * @param {NetPacket} pkt a NetPacket object received from socket
 */

///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** helper debug output used by m_RouteMessage() */
function log_PktDirection(pkt, direction, promises) {
  if (promises.length < 1) return;
  const ents = promises.length > 1 ? 'handlers' : 'handler';
  TERM(
    `${pkt.getInfo()} ${direction} '${pkt.getMessage()}' (${
      promises.length
    } ${ents})`
  );
}
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** helper debug output used by m_RouteMessage() */
function log_PktTransaction(pkt, status, promises) {
  const src = pkt.getSourceAddress();
  if (promises && promises.length) {
    TERM(`${src} >> '${pkt.getMessage()}' ${status} ${promises.length} Promises`);
  } else {
    TERM(`${src} << '${pkt.getMessage()}' ${status}`);
  }
}

/// EXPORT MODULE DEFINITION //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = { StartNetwork, StopNetwork };
