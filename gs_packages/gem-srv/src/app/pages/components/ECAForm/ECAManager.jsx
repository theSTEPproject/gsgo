/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

ECAManager

Holds the history of chat messages from the ECA

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import React, { useEffect, useState } from 'react';
import ECAForm from './ECAForm';
import * as ACConversationAgent from '../../../../modules/appcore/ac-conversation-agent';

function ECAManager({ showECAChat }) {
  // chat history stored here so it can be saved when the ECAForm is closed.
  const [history, setHistory] = useState([]);
  const [initLoad, setInitLoad] = useState(true);
  const [ecaTypes, setECATypes] = useState([]);

  // I use useEffect and check showECAChat here because
  // when I only check initLoad, GetECATypes() does not return anything.
  // There has to be a delay between loading this component and calling
  // GetECATypes() for it to return anything.
  // Seems like there should be a better way.
  useEffect(() => {
    // If the ECA Chat is displayed
    // and it's the first time it has been opened
    if (initLoad && showECAChat) {
      // get the ECA types from gemprj
      const ecaTypesFromProjFile = ACConversationAgent.GetECATypes();
      let formattedECATypes = ecaTypesFromProjFile
        ? Object.values(ecaTypesFromProjFile)
        : [];
      setECATypes(formattedECATypes);

      let ecaPrompts = [];
      // load an array with each eca type's initial message
      formattedECATypes.forEach(eca => {
        if (eca.initialMessage) {
          ecaPrompts.push({
            utterance: '',
            answer: eca.initialMessage,
            responder: eca.label
          });
        }
      });
      // put the initial messages in the chat history
      setHistory(ecaPrompts);
      // set this to false, so the initial messages don't get added multiple times
      setInitLoad(false);
    }
  }, [initLoad, showECAChat]);

  return (
    <>
      {showECAChat && (
        <ECAForm
          messages={history}
          onNewMessage={setHistory}
          ecaTypes={ecaTypes}
        />
      )}
    </>
  );
}

export default ECAManager;
