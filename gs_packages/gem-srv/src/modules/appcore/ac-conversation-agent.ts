/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

Manages the following for the Embodied Conversational Agent:
  * Calls and responses to and from the ECA API.
  * Resolving the ECA Type, which determines the subject domain of the ECA

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// const ECAURL = 'https://tracedata-01.csc.ncsu.edu/GetECAResponse';
const ECAURL = 'https://bl-educ-engage.educ.indiana.edu/GetECAResponse';
// This determines the path where the profile images come from
const PROFILEIMAGEPATH = '/assets/art-assets/sprites/';
const STATE = new UR.class.StateGroupMgr('ecaTypes');

STATE.initializeState({
  ecaTypes: [
    {
      'label': '',
      'name': '',
      'initialMessage': '',
      'profileImage': '',
      'profileVoice': ''
    }
  ]
});

const { _getKey, updateKey, _publishState } = STATE;

interface payload {
  Context: string;
  Utterance: string;
  ECAType: string;
  ConfidenceThreshold: number;
}

let requestPayload: payload = {
  Context: '',
  Utterance: '',
  ECAType: '',
  ConfidenceThreshold: 0.6
};

function SetECAContext(context: string): void {
  requestPayload.Context = context;
}

function GetECATypes(): TConversationAgent[] | null {
  const ecaTypes: TConversationAgent[] = [..._getKey('ecaTypes')];
  let ecaTypesWithImagePath: TConversationAgent[] = [];
  // there is at least one ECA type for the project
  if (ecaTypes[0].name !== '') {
    ecaTypes.forEach(ecaType => {
      if (ecaType.profileImage) {
        // add the image path to the profile image property
        ecaTypesWithImagePath.push({
          ...ecaType,
          profileImage: PROFILEIMAGEPATH + ecaType.profileImage
        });
      } else {
        // if there is no profileImage property, leave the ecaType as is
        ecaTypesWithImagePath.push({ ...ecaType });
      }
    });
    return ecaTypesWithImagePath;
  } else {
    return null;
  }
}

/**
 * Gets a response from the ECA API. Uses the ECA Type set based on the current project
 * and a Confidence Threshold.
 * @param {string} formUtterance - The text from a user that is used to determine the response.
 * @returns {Promise<string>} - The response from the ECA.
 */
async function FetchResponse(
  formUtterance: string,
  ecaType: string
): Promise<string> {
  requestPayload.Utterance = formUtterance;
  requestPayload.ECAType = ecaType;

  // Ensures that ConfidenceThreshold will be left as a number
  // which is required by the ECA API
  let formattedPayload = JSON.stringify(requestPayload, (key, value) =>
    isNaN(value) || value === '' ? value : +value
  );

  let logString = `Utterance: "${requestPayload.Utterance}",
                   ECAType: ${requestPayload.ECAType}`;

  // log the request
  // // log file
  UR.LogEvent('ECA Request Sent', [logString]);
  // // log viewer
  UR.RaiseMessage('NET:LOG_EVENT', {
    logString: 'ECA Request Sent: ' + logString
  });

  let response = await fetch(ECAURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: formattedPayload
  });

  // log the response
  // Create a clone of the response specifically for logging,
  // so that response.text() can still be returned.
  const logResponse = response.clone();
  await logResponse.text().then(text => {
    // log file
    UR.LogEvent('ECA Response Received', [text]);
    // log viewer
    UR.RaiseMessage('NET:LOG_EVENT', {
      logString: 'ECA Response Received: ' + text
    });
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error. Status ${response.status}, ${response.statusText}`
    );
  }

  return response.text();
}

function updateAndPublish(ecaTypes) {
  updateKey({ ecaTypes });
  _publishState({ ecaTypes });
}

function SetECATypes(ecaTypes) {
  try {
    updateAndPublish(ecaTypes);
  } catch {
    console.log('No ecaTypes found for current project');
  }
}

export { SetECAContext, FetchResponse, GetECATypes, SetECATypes };
