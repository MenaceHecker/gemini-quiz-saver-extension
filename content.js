// Content script that monitors Gemini quiz interactions
let currentQuestion = null;
let currentAnswer = null;
let currentExplanation = null;
let hasShownPrompt = false;

// Monitor for answer submissions
function detectQuizActivity() {
  // Observe DOM changes to detect when answers are submitted
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        checkForQuizElements();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function checkForQuizElements() {
  // Look for the answered question (with green highlight - answered-correct class)
  const correctAnswer = document.querySelector('.option.answered-correct');
  
  if (!correctAnswer || hasShownPrompt) {
    return; // No answered question yet, or already showed prompt
  }

  // Extract the question text
  const questionElement = document.querySelector('.question-text-container .markdown p');
  if (questionElement) {
    currentQuestion = questionElement.textContent.trim();
  }

  // Extract the answer text (remove the letter prefix like "A.")
  const answerTextElement = correctAnswer.querySelector('.option-text-container .markdown p');
  if (answerTextElement) {
    currentAnswer = answerTextElement.textContent.trim();
  }

  // Extract the explanation (the text after "That's right!")
  const explanationElement = correctAnswer.querySelector('.explanation-text .markdown p');
  if (explanationElement) {
    currentExplanation = explanationElement.textContent.trim();
  }

  // If we have all components, show the save prompt
  if (currentQuestion && currentAnswer) {
    hasShownPrompt = true;
    showSavePrompt();
  }
}

function showSavePrompt() {
  // Remove existing prompt if any
  const existingPrompt = document.getElementById('quiz-saver-prompt');
  if (existingPrompt) {
    existingPrompt.remove();
  }

  // Create the save prompt overlay
  const prompt = document.createElement('div');
  prompt.id = 'quiz-saver-prompt';
  prompt.innerHTML = `
    <div class="quiz-saver-overlay">
      <div class="quiz-saver-card">
        <h3>Save Quiz Question?</h3>
        <p>Would you like to save this question and answer to Google Docs?</p>
        <div class="quiz-saver-buttons">
          <button id="save-yes">Yes, Save</button>
          <button id="save-no">No, Skip</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(prompt);

  // Add event listeners
  document.getElementById('save-yes').addEventListener('click', () => {
    saveToGoogleDocs();
    prompt.remove();
  });

  document.getElementById('save-no').addEventListener('click', () => {
    prompt.remove();
    resetCurrentQuestion();
  });
}

function saveToGoogleDocs() {
  const quizData = {
    question: currentQuestion,
    answer: currentAnswer,
    explanation: currentExplanation || 'No explanation provided'
  };

  // Send to background script to handle Google Docs API
  chrome.runtime.sendMessage({
    action: 'saveQuiz',
    data: quizData
  }, (response) => {
    if (response.success) {
      showNotification('Saved successfully!');
    } else {
      showNotification('Failed to save: ' + response.error);
    }
    resetCurrentQuestion();
  });
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'quiz-saver-notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function resetCurrentQuestion() {
  currentQuestion = null;
  currentAnswer = null;
  currentExplanation = null;
  hasShownPrompt = false;
}

// Initialize
detectQuizActivity();

// Also check immediately in case question is already answered
setTimeout(checkForQuizElements, 1000);