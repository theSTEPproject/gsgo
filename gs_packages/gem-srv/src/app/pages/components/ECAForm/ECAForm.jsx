/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

ECAForm

Used to communicate with an Embodied Conversational Agent

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/
import React, { useRef, useState, useEffect } from 'react';
import PanelChrome from '../PanelChrome';
import * as ACConversationAgent from '../../../../modules/appcore/ac-conversation-agent';
import { withStyles } from '@material-ui/core/styles';
import { useStylesHOC } from '../../helpers/page-xui-styles';
import './ECAForm.css';

function ECAForm({ messages, onNewMessage, ecaTypes }) {
  const panelName = 'Messages';
  const chatBottomRef = useRef(null);
  const [ecaType, setECAType] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [isReading, setIsReading] = useState(false); // State to track whether it's currently reading or not
  const [showContext, setShowContext] = useState(false); // Used to track whether message context is displayed.

  // Using useEffect here because the first response from a message sent by a user
  // in the chat would always have null for its responder.
  // This did not affect the dropdown itself. Doing this forces
  // ecaType to update and show a responder for the first response to a
  // message sent by the user.
  useEffect(() => {
    setECAType(
      ecaTypes.length > 0
        ? {
            label: ecaTypes[0].label,
            image: ecaTypes[0].profileImage,
            voice: ecaTypes[0].profileVoice
          }
        : null
    );
  }, [ecaTypes]);

  // scroll down to the bottom of the chat history
  useEffect(() => {
    if (ecaTypes.length > 0) {
      chatBottomRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, []); // only runs once, when component is displayed

  // Get the label and image of the selected ecaType
  // so it can be used in the chat history
  function handleECADropdownChange(selectedOptionIndex) {
    setECAType({
      label: ecaTypes[selectedOptionIndex].label,
      image: ecaTypes[selectedOptionIndex].profileImage,
      voice: ecaTypes[selectedOptionIndex].profileVoice
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const formUtterance = formData.get('Utterance');
    const formECAType = formData.get('ECAType');
    let lastResponse = '';
    setIsMessageLoading(true);

    ACConversationAgent.FetchResponse(formUtterance, formECAType)
      .then(response => {
        lastResponse = response;
        // clear the textarea after submit
        setMessageContent('');
      })
      .catch(error => {
        console.error(`Problem with ECA response: ${error}`);
        lastResponse = 'An error occurred.';
      })
      .finally(() => {
        onNewMessage([
          ...messages,
          {
            utterance: formUtterance,
            context: ACConversationAgent.GetECAContext(),
            answer: lastResponse,
            responder: ecaType.label,
            image: ecaType.image,
            voice: ecaType.voice
          }
        ]);
        setIsMessageLoading(false);
        // scroll to the bottom of the chat so the most recent message is visible
        chatBottomRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        });
      });
  }

  // convert the messages array JSX used by the component
  const dialogues = messages.map((dialogue, index) => {
    return (
      <div key={index}>
        {dialogue.utterance !== '' && (
          <div className={'message'}>
            <div className={'message-sender'}>You</div>
            <div className={'you'}>{dialogue.utterance}</div>
          </div>
        )}
        {dialogue.context && showContext && (
          <div className={'message'}>
            <div className={'you'}>Context: {dialogue.context}</div>
          </div>
        )}
        <div className={'message'}>
          <div className={'message-responder'}>{dialogue.responder}</div>
          <div className={'responder-image-container'}>
            {dialogue.image && (
              <img
                id="responder-image"
                alt="responder profile image"
                src={dialogue.image}
              ></img>
            )}
          </div>
          <div className={'them'}>
            {dialogue.answer}{' '}
            <button
              onClick={() => toggleSpeech(dialogue.answer, dialogue.voice)}
              style={{ width: '60px' }}
            >
              {isReading ? 'Stop' : 'Read'}
            </button>
          </div>
        </div>
      </div>
    );
  });

  // Function to toggle speech synthesis
  function toggleSpeech(text, voiceName) {
    if (isReading) {
      // If currently reading, stop speech synthesis
      window.speechSynthesis.cancel();
    } else {
      // If not currently reading, start speech synthesis
      speak(text, voiceName);
    }
    // Toggle the reading state
    setIsReading(!isReading);
  }

  // Function to speak text using speech synthesis
  function speak(text, voiceName) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);

    // Retrieve the desired voice
    const voice = getVoices(voiceName);

    // Set the voice for the utterance
    utterance.voice = voice;

    if (!voice) {
      setTimeout(() => {
        speak(text, voiceName); // Call speak again after a brief delay
      }, 500); // Adjust the delay time as needed
      return;
    }
    // Speak the text
    synth.speak(utterance);

    // Listen for the end of speech
    utterance.onend = () => {
      // When speech ends, update the button label
      setIsReading(false); // Set reading state to false
    };

    // Update the button label immediately
    setIsReading(true); // Set reading state to true
  }

  // Function to retrieve voices
  function getVoices(voiceName) {
    const synth = window.speechSynthesis;
    // Get all available voices
    const voices = synth.getVoices();

    // Find the desired voice by name
    const desiredVoice = voices.find(voice => voice.name === voiceName);

    // Return the desired voice or the default voice if not found
    return desiredVoice ? desiredVoice : synth.getVoices()[0];
  }

  let content;
  if (ecaTypes.length > 0) {
    content = (
      <div className="chat">
        <div className={'dialogues'}>
          {dialogues}
          {isMessageLoading && (
            <div className={'container'}>
              <div className={'dot'}></div>
              <div className={'dot'}></div>
              <div className={'dot'}></div>
            </div>
          )}
          <div className={'chat-bottom'} ref={chatBottomRef}></div>
        </div>
        <div className={'text-input'}>
          <form method="post" onSubmit={handleSubmit}>
            <textarea
              id="utterance"
              name="Utterance"
              value={messageContent}
              onChange={e => setMessageContent(e.target.value)}
              rows={4}
              cols={50}
            />
            <select
              id="ecatype"
              name="ECAType"
              className={'type-dropdown'}
              onChange={e => handleECADropdownChange(e.target.selectedIndex)}
            >
              {ecaTypes.map(eca => (
                <option key={eca.label} value={eca.name} label={eca.label}>
                  {eca.label}
                </option>
              ))}
            </select>
            <input
              className={'send'}
              type="submit"
              value="Send"
              disabled={!messageContent}
            />
          </form>
          <button
            className={'context-button'}
            onClick={() => setShowContext(!showContext)}
          >
            {showContext? 'Hide Context' : 'Show Context'}
          </button>
        </div>
      </div>
    );
  } else {
    content = <p>No ECA Types exist for this project</p>;
  }

  return (
    <PanelChrome id={panelName} title={panelName}>
      {content}
    </PanelChrome>
  );
}

export default withStyles(useStylesHOC)(ECAForm);
