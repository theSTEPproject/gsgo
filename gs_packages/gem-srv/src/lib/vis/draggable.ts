/** given a VOBJ, decorate it to add new features */
import UR from '@gemstep/ursys/client';
import { Visual } from 'lib/t-visual';
import { GetAgentById } from 'modules/datacore/dc-agents';

export function MakeDraggable(vobj: Visual) {
  let dragStartTime; // Used to differentiate between a click and a drag
  let origX; // Used to restore original position if drag is abandoned
  let origY;

  function onDragStart(event) {
    dragStartTime = Date.now();
    // store a reference to the data
    // the reason for this is because of multitouch
    // we want to track the movement of this particular touch
    this.data = event.data;
    //
    vobj.setCaptive(true);
    this.alpha = 0.5;
    this.tint = 0xff8080;
    //
    const agent = GetAgentById(vobj.id);
    if (agent) {
      agent.setModePuppet();
      agent.setCaptive(true);
      origX = agent.prop.x.value;
      origY = agent.prop.y.value;
    }
  }
  function onDragEnd() {
    const dragStopTime = Date.now();
    vobj.setCaptive(false);
    this.alpha = 1;
    this.tint = 0xffffff;
    //
    const agent = GetAgentById(vobj.id);
    if (agent) {
      agent.setPreviousMode();
      agent.setCaptive(false);
      console.log(`agent id ${agent.id} '${agent.name}' dropped`, agent);
      //
      if (this.data && dragStopTime - dragStartTime > 150) {
        // Consider it a drag if the mouse was down for > 150 ms
        // the originating object is sprite
        const newPosition = this.data.getLocalPosition(this.parent);
        const { x, y } = newPosition;
        agent.prop.x.value = x;
        agent.prop.y.setTo(y);

        UR.RaiseMessage('DRAG_END', { agent });
      } else {
        // otherwise it's a click, so restore the original position
        agent.prop.x.value = origX;
        agent.prop.y.value = origY;
      }
    }
    // set the interaction data to null
    this.data = null;
  }
  function onDragMove() {
    if (vobj.isCaptive) {
      const { x, y } = this.data.getLocalPosition(this.parent);
      this.x = x;
      this.y = y;
      const agent = GetAgentById(vobj.id);
      if (agent) {
        agent.prop.x.value = x;
        agent.prop.y.setTo(y); // alt way of setting
      }
    }
  }
  const spr = vobj.sprite;
  spr.interactive = true; // enable interactive events
  spr.on('mousedown', onDragStart);
  spr.on('mouseup', onDragEnd);
  spr.on('mouseupoutside', onDragEnd);
  spr.on('mousemove', onDragMove);
}
