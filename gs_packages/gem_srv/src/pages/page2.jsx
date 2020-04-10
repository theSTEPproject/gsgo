/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Root View of GEMSTEP Wireframe

  NOTE: this page runs from the server side, so we can't access objects like
  window or document, or manipulate the DOM. To debug, use the node debugger
  through VSCode.

  PROBLEM: There's no way to trigger hook effects OUTSIDE of a component.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// LOAD LIBRARIES ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import React from 'react';

import GSTabbedView from '../components/examples/ExTabbedView';
import GSBoxLayout from '../components/examples/ExBoxLayout';
import GSView from '../components/examples/ExView';

/// CONSTANTS /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;

/// MAIN COMPONENT ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Main(props) {
  const { store } = props;
  const { currentTab, currentRoute } = store.getRoute();
  if (DBG) console.log(`appstate tab:${currentTab} route:'${currentRoute}'`);

  /// RENDER //////////////////////////////////////////////////////////////////
  return (
    <GSTabbedView store={store}>
      <GSView index={0} name="Sub 1" store={store}>
        <GSBoxLayout label="1" />
      </GSView>
      <GSView index={1} name="Sub 2" store={store}>
        <GSBoxLayout label="2" />
      </GSView>
      <GSView index={2} name="Sub 3" store={store}>
        Empty
      </GSView>
    </GSTabbedView>
  );
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default Main; // functional component
