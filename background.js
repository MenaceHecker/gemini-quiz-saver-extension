// Background script to handle Google Docs API calls
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveQuiz') {
    saveToGoogleDocs(request.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function saveToGoogleDocs(quizData) {
  // Get or create the document
  const docId = await getOrCreateQuizDoc();
  
  // Format the content
  const formattedContent = formatQuizContent(quizData);
  
  // Append to document
  await appendToDoc(docId, formattedContent);
}

async function getOrCreateQuizDoc() {
  // Check if we have a stored document ID
  const result = await chrome.storage.local.get(['quizDocId']);
  
  if (result.quizDocId) {
    return result.quizDocId;
  }
  
  // Create new document
  const token = await getAuthToken();
  
  const response = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Gemini Quiz Questions - ' + new Date().toLocaleDateString()
    })
  });
  
  const doc = await response.json();
  await chrome.storage.local.set({ quizDocId: doc.documentId });
  
  return doc.documentId;
}

async function appendToDoc(docId, content) {
  const token = await getAuthToken();
  
  // Get current document to find end index
  const docResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const doc = await docResponse.json();
  const endIndex = doc.body.content[doc.body.content.length - 1].endIndex - 1;
  
  // Append content
  await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: endIndex },
              text: content
            }
          }
        ]
      })
    }
  );
}

function formatQuizContent(quizData) {
  return `Question: ${quizData.question}
Answer: ${quizData.answer}
Explanation: ${quizData.explanation}

`;
}

async function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}