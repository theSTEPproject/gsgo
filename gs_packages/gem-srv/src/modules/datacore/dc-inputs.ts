/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Inputs Phase Machine Interface

  This maps inputs to INPUTDEFs:

  entities => Control Objects => Input Definitions

  pozyx/ptrack/faketrack    => ENTITY_TO_COBJ   => COBJ_TO_INPUTDEF
  charControl               => devAPI           => COBJ_TO_INPUTDEF

  This should be a pure data class that maintains a list of input objects
  and the agents it updates.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import * as ACBlueprints from 'modules/appcore/ac-blueprints';
import * as ACInstances from 'modules/appcore/ac-instances';
import * as ACMetaData from 'modules/appcore/ac-metadata';
import InputDef from 'lib/class-input-def';
import SyncMap from 'lib/class-syncmap';
import * as DCAGENTS from './dc-sim-agents';
import { TYPES } from '../step/lib/class-ptrack-endpoint';
import { DistanceTo, Lerp, Rotate } from 'lib/util-vector';

/// CONSTANTS AND DECLARATIONS ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const SAMPLE_FPS = 30;
const INTERVAL = (1 / SAMPLE_FPS) * 1000;
let FRAME_TIMER;

let STAGE_WIDTH = 100; // default
let STAGE_HEIGHT = 100; // default

export const INPUT_GROUPS = new Map(); // Each device can belong to a specific group
export const INPUTDEFS = []; //
const ACTIVE_DEVICES = new Map();

let COBJ_ADDED = false; // Used to track when a new input has been added

const PR = UR.PrefixUtil('DCINPT');
const DBG = false;

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Transforms unit values to project values
 * @param numberString CharControl output is -0.5 to 0.5
 * @returns
 */
function transformX(numberString: string) {
  const n = Number(numberString);
  return n * STAGE_WIDTH;
}
function transformY(numberString: string) {
  const n = Number(numberString);
  return n * STAGE_HEIGHT;
}

// "UADDR_340" to "340"
function UADDRtoID(uaddr) {
  return String(uaddr).substring(6);
}
// "CC340_0" to "340"
function COBJIDtoID(cobjid) {
  // pozyx
  if (cobjid.startsWith(TYPES.Pozyx)) return String(cobjid).substring(8);
  // CharControl
  const re = /([0-9])+/;
  const result = re.exec(cobjid);
  if (result === null)
    throw new Error(`dc-inputs: Unable to retrieve id of ${cobjid}`);
  return re.exec(cobjid)[0];
}
// "CC340_0" to "340_0"
function COBJIDtoID_n(cobjid) {
  return String(cobjid).substring(2);
}
// "UDEV_340:0" to "340"
function UDIDtoID(udid) {
  const re = /([0-9])+\w/;
  return re.exec(udid)[0];
}

/**
 *
 * @param changes {valid: boolean, selected: object[], quantified: object[] }
 *                devObject = { udid = "UDEV_340:0",
 *                              meta = { uaddr: "UADDR_340", uapp, uapp_tags, uclass, uname }
 *                            , inputs, outputs}
 */
function UpdateActiveDevices(changes) {
  // `changes` only contains the devices that notify is announcing
  // we actually want to update ALL devices.
  const devices = UR.GetDeviceDirectory();
  const inputDevices = devices.filter(d => d.meta.uclass === 'CharControl');
  ACTIVE_DEVICES.clear();
  inputDevices.forEach(d => ACTIVE_DEVICES.set(UDIDtoID(d.udid), true));
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

///////////////////////////////////////////////////////////////////////////////
/// POZYX DATA UPDATE /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// Default
export const PTRACK_TRANSFORM = {
  scaleX: 0,
  scaleY: 0,
  translateX: 0,
  translateY: 0,
  rotation: 0,
  useAccelerometer: undefined // Not applicable to PTRACK, but defined here for tscript validation
};

export const POZYX_TRANSFORM = {
  scaleX: 0,
  scaleY: 0,
  translateX: 0,
  translateY: 0,
  rotation: 0,
  useAccelerometer: true
};

// FakeTrack transforms are actually handled by FakeTrack itself.
// Since all inputs are transformed, we use FAKETRACK_TRANSFORM to support a 1-to-1 transform
const FAKETRACK_TRANSFORM = {
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  rotation: 0,
  useAccelerometer: false
};

const TRANSFORMS = {};
TRANSFORMS[TYPES.Undefined] = PTRACK_TRANSFORM;
TRANSFORMS[TYPES.Object] = PTRACK_TRANSFORM;
TRANSFORMS[TYPES.People] = PTRACK_TRANSFORM;
TRANSFORMS[TYPES.Pose] = PTRACK_TRANSFORM;
TRANSFORMS[TYPES.Pozyx] = POZYX_TRANSFORM;
TRANSFORMS[TYPES.Faketrack] = FAKETRACK_TRANSFORM;

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_Transform(
  position: {
    x: number;
    y: number;
  },
  TRANSFORM
): { x: number; y: number } {
  let tx = Number(position.x);
  let ty = Number(position.y);

  // 1. Rotate
  const rad = (TRANSFORM.rotation * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  tx = tx * c - ty * s;
  ty = tx * s + ty * c;

  // 2. Translate
  tx += TRANSFORM.translateX;
  ty += TRANSFORM.translateY;

  // 3. Scale
  tx *= TRANSFORM.scaleX;
  ty *= TRANSFORM.scaleY;

  return { x: tx, y: ty };
}
/// Returns a value between 0 and 1 to use for lerps
function m_GetAccelerationMultiplier(n: number): number {
  // acceleration units in mg (gravity)
  // Adjust thresholds and values to smooth behavior
  if (n > 1000) return 0.8; // fast
  if (n > 500) return 0.5; // medium
  if (n > 250) return 0.1; // deliberate move
  if (n > 50) return 0.05; // sleep threshold / standing still
  return 0; // n <= 50, resting on a hard surface, don't move at all
}
/// Use accelerometer data to reduce jitter
function m_PozyxDampen(
  lastPosition: { x: number; y: number },
  rawEntityPosition: { x: number; y: number },
  acc: { x: number; y: number; z: number }
): { x: number; y: number } {
  //  api-input retrieves entity data at 30fps.
  //  but Pozyx only sends updates at 15fps.
  //  So every other frame is repeated with the same values.
  //  To smooth this out, we only move toward the entity position
  //  rather than jumping straight to the entity position.

  // lastPosition is already transformed
  const newPosition = m_Transform(rawEntityPosition, POZYX_TRANSFORM);

  // If accelerometer movement is high, allow large movement
  // If acceleromoter movement is low, allow only small movmeent
  const gforce = Rotate(acc, POZYX_TRANSFORM.rotation); // rotate accelerometer readings to match stage
  gforce.x = Math.abs(gforce.x); // we just want magnitude
  gforce.y = Math.abs(gforce.y);
  let xm = m_GetAccelerationMultiplier(gforce.x); // x multiplier
  let ym = m_GetAccelerationMultiplier(gforce.y);

  // protect against sleep jump
  // While wearables sleep, they have a tendency to emit bad positions
  if (
    gforce.x < 250 &&
    gforce.y < 250 &&
    DistanceTo(lastPosition, newPosition) > 0.25
  )
    return lastPosition;

  // lerp
  // => still hitchy
  const x = Lerp(lastPosition.x, newPosition.x, xm);
  const y = Lerp(lastPosition.y, newPosition.y, ym);

  // console.log(
  //   // acc.x,
  //   // limiter.x,
  //   Number(xm).toFixed(2),
  //   // Number(dx).toFixed(4),
  //   // acc.y,
  //   // limiter.y,
  //   Number(ym).toFixed(2)
  //   // Number(dy).toFixed(4)
  // );

  return { x, y };
}

///////////////////////////////////////////////////////////////////////////////
/// ENTITY_TO_COBJ (was POZYX_TO_COBJ) /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ENTITY_TO_COBJ = new SyncMap({
  Constructor: InputDef,
  autoGrow: true,
  name: 'TrackedEntityToCObj'
});
ENTITY_TO_COBJ.setMapFunctions({
  onAdd: (entity: any, cobj: InputDef) => {
    const TRANSFORM = TRANSFORMS[entity.type] || TRANSFORMS[TYPES.Faketrack]; // default to faketrack no transforms
    const { x, y } = m_Transform(
      { x: Number(entity.x), y: Number(entity.y) },
      TRANSFORM
    );
    cobj.x = x;
    cobj.y = y;

    cobj.bpid = ACMetaData.GetDefaultBp();

    // If user has selected a different bp for tags (pozyx, ptrack), use the override
    const tagBpid = ACInstances.GetTagBpid(cobj.id);
    if (tagBpid !== undefined) cobj.bpid = tagBpid;

    cobj.label = entity.type === TYPES.Pozyx ? entity.id.substring(2) : entity.id;
    cobj.framesSinceLastUpdate = 0;

    // Keep track of when a new COBJ has been added so we can truigger PanelMap updates
    COBJ_ADDED = true;

    // Commenting out in favor of NET:DISPLAY_LIST log
    // UR.SendMessage('NET:SRV_RTLOG', {
    //   event: entity.type,
    //   items: [
    //     {
    //       id: cobj.id,
    //       bpid: cobj.bpid,
    //       x,
    //       y
    //     }
    //   ]
    // });
  },
  onUpdate: (entity: any, cobj: InputDef) => {
    const TRANSFORM = TRANSFORMS[entity.type] || TRANSFORMS[TYPES.Faketrack]; // default to faketrack no transforms
    let pos = { x: Number(entity.x), y: Number(entity.y) };
    if (entity.acc && TRANSFORM.useAccelerometer) {
      // has accelerometer data
      pos = m_PozyxDampen(cobj, pos, entity.acc); // dampen + transform
    } else {
      pos = m_Transform(pos, TRANSFORM);
    }

    cobj.x = pos.x;
    cobj.y = pos.y;

    // If user has selected a different bp for tags (pozyx, ptrack), use the override
    const tagBpid = ACInstances.GetTagBpid(cobj.id);
    if (tagBpid !== undefined && tagBpid !== cobj.bpid) {
      cobj.bpid = tagBpid;
    } else cobj.bpid = cobj.bpid; // keep the same blueprint

    cobj.label = entity.type === TYPES.Pozyx ? entity.id.substring(2) : entity.id;
    cobj.framesSinceLastUpdate = 0;

    // Commenting out in favor of NET:DISPLAY_LIST log
    // UR.SendMessage('NET:SRV_RTLOG', {
    //   event: entity.type,
    //   items: [
    //     {
    //       id: cobj.id,
    //       bpid: cobj.bpid,
    //       x: pos.x,
    //       y: pos.y
    //     }
    //   ]
    // });
  },
  shouldRemove: cobj => {
    // entities do not necessarily come in with every INPUTS phase fire
    // so we should NOT be removing them on every update.
    // However, entities might be removed by class-ptrack-endpoints
    // (after they exceed MAX_AGE of 100)
    // so we also need to remove them here if there has been
    // no update for 4 seconds
    cobj.framesSinceLastUpdate++;
    if (cobj.framesSinceLastUpdate > 120) return true;
    return false;
  }
});
export function GetTrackerMap() {
  // Prepare ENTITY_TO_COBJ definitions
  // Clear the COBJ_ADDED flag so we can track when a new input has been added
  // This is triggered by api-inputs.StartTrackerVisuals
  COBJ_ADDED = false;

  return ENTITY_TO_COBJ;
}

///////////////////////////////////////////////////////////////////////////////
/// COBJ_TO_INPUTDEF //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Control Object (from CharControl) Sync to InputDef
const COBJ_TO_INPUTDEF = new SyncMap({
  Constructor: InputDef,
  autoGrow: true,
  name: 'CObjToAgent'
});
COBJ_TO_INPUTDEF.setMapFunctions({
  onAdd: (cobj: any, inputDef: InputDef) => {
    inputDef.x = transformX(cobj.x);
    inputDef.y = transformY(cobj.y);
    // HACK Blueprints into cobj
    inputDef.bpid = cobj.bpid;
    inputDef.label = cobj.label;
    inputDef.framesSinceLastUpdate = 0;
  },
  onUpdate: (cobj: any, inputDef: InputDef) => {
    inputDef.x = transformX(cobj.x);
    inputDef.y = transformY(cobj.y);
    inputDef.bpid = cobj.bpid;
    inputDef.label = cobj.label;
    inputDef.framesSinceLastUpdate = 0;
  },
  shouldRemove: (inputDef, map) => {
    // Inputs do not necessarily come in with every INPUTS phase fire
    // so we should NOT be removing them on every update.

    // HACK: Remove agent if no update for 4 seconds
    inputDef.framesSinceLastUpdate++;
    if (inputDef.framesSinceLastUpdate > 120) {
      return true;
    }

    // HACK
    // Remove agents that no longer have active devices
    // cobj = {id, name, blueprint, bpname, valid, x, y}
    //         id = "CC340_0"
    return !ACTIVE_DEVICES.has(COBJIDtoID(inputDef.id));

    // HACK Never Remove for now.
    // return false;

    // REVIEW: At some point, we'll want remove when CharControllers
    //         drop out.  This is hack where we insert a frameCount
    //         into the def to keep track
    //
    // const REMOVAL_THRESHOLD = -1;
    // const instance = map.get(cobj.id);
    // console.error('shouldRemove', cobj, map, instance);
    // if (instance) {
    //   instance.frameCount = instance.frameCount++ || 0;
    //   if (instance.frameCount > REMOVAL_THRESHOLD) return true;
    // }
  }
});

///////////////////////////////////////////////////////////////////////////////
/// dc-input General API //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function SetInputStageBounds(width, height) {
  STAGE_WIDTH = width;
  STAGE_HEIGHT = height;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export async function InputInit(bpname: string) {
  // STEP 1 is to get a "deviceAPI" from a Device Subscription
  const devAPI = UR.SubscribeDeviceSpec({
    // set group here
    selectify: device =>
      device.meta.uclass === 'CharControl' &&
      device.meta.uapp_tags.includes(`bp_${bpname}`),
    quantify: list => list,
    notify: changes => {
      UpdateActiveDevices(changes);
      // NOTE: `removed` is not implemented yet.
      // There's a HACK in client-netdevices to always send a notify
      // update to get around this.
      // const { valid, added, updated, removed } = changes;
      // console.error(...PR('notify', changes));
    }
  });
  INPUT_GROUPS.set(bpname, devAPI);
  // console.error('input_groups', INPUT_GROUPS);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function InputUpdateCharControl(devAPI, bpname) {
  // STEP 2 is to grab the getController('name') method which we
  // can call any time we want without mucking about with device
  // interfaces
  const { getController, deviceNum, unsubscribe } = devAPI;
  const { getInputs, getChanges, putOutputs } = getController('markers'); // group = markers

  // WORKING VERSION
  const raw_cobjs = getInputs().slice();
  // HACK: Stuff Blueprint spec into the cobjs for now
  // Technically cobjs should not have a blueprint parameter
  // but InputDefs need it to be able to generate an agent.
  const overriden_cobjs = raw_cobjs.map(o => {
    o.bpid = bpname;
    o.label = o.id;
    return o;
  });
  if (DBG) console.log('cobs', overriden_cobjs);
  COBJ_TO_INPUTDEF.syncFromArray(overriden_cobjs);
  COBJ_TO_INPUTDEF.mapObjects();
}
function InputUpdateEntityTracks() {
  const COBJS = ENTITY_TO_COBJ.getMappedObjects();
  if (COBJ_ADDED) {
    // Some new inputs were detected, so update the state's list of `tags`
    // in the CHARACTER CONTROLLERS Panel so pozyx tags can select new bps
    UR.WriteState('instances', 'tags', COBJS);
    COBJ_ADDED = false;
  }
  COBJ_TO_INPUTDEF.syncFromArray(COBJS);
  COBJ_TO_INPUTDEF.mapObjects();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function InputsUpdate() {
  // The basic pipeline is:
  // inputs => INPUTDEFS => AGENTS
  //
  // Inputs from all sources (charcontrol, PTrack, Pozyx, faketrack)
  // are all converted to INPUTDEFS here.

  // 1. Process Char Control inputs
  const blueprintNames = Array.from(INPUT_GROUPS.keys());
  INPUTDEFS.length = 0; // Clear INPUTDEFS with each update
  blueprintNames.forEach(bpname => {
    InputUpdateCharControl(INPUT_GROUPS.get(bpname), bpname);
  });
  // 2. Process PTrack, Pozyx, FakeTrack Inputs
  //    ENTITY_TO_COBJ is regularly updated by api-input.StartTrackerVisuals
  if (ENTITY_TO_COBJ.getMappedObjects().length > 0) InputUpdateEntityTracks();

  // 3. Combine them all
  INPUTDEFS.push(...COBJ_TO_INPUTDEF.getMappedObjects());
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function GetInputGroups(): any {
  return INPUT_GROUPS;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function GetInputDefs(): object[] {
  return INPUTDEFS;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Trigger deletion of Input Agents after agent blueprint is recompiled
 * Input agents should re-create themsevles with next INPUT cycle
 */
export function InputsReset() {
  const defs = GetInputDefs();
  defs.forEach(d => DCAGENTS.DeleteAgent(d));
}
