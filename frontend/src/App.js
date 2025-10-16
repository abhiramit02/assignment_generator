import React, { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mcqs, setMcqs] = useState([]);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid PDF file');
      setFile(null);
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!file) {
    setError('Please select a PDF file first');
    return;
  }

  const formData = new FormData();
  formData.append('pdfFile', file);

  setIsLoading(true);
  setError('');
  setMcqs([]);

  try {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    console.log('Making request to:', `${API_URL}/api/generate-mcqs`);
    
    const response = await fetch(`${API_URL}/api/generate-mcqs`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      },
    });

    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Raw response:', responseText); // Log the raw response

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    try {
      const data = JSON.parse(responseText);
      if (data.mcqs && data.mcqs.length > 0) {
        setMcqs(data.mcqs);
      } else {
        throw new Error('No MCQs were generated. Please try again.');
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      throw new Error('Invalid response from server');
    }
  } catch (err) {
    console.error('Error:', err);
    setError(err.message || 'Failed to generate MCQs. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
  return (
    <div className="app">
      <header className="header">
        <h1>PDF to MCQ Generator</h1>
        <p>Upload a PDF to generate multiple-choice questions</p>
      </header>

      <main className="main-content">
        <div className="upload-section">
          <form onSubmit={handleSubmit}>
            <div className="button-container">
              <div className="file-upload">
                <input
                  type="file"
                  id="pdf-upload"
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
                <label htmlFor="pdf-upload" className="upload-button">
                  {file ? file.name : 'Choose PDF File'}
                </label>
              </div>
              <button
                type="submit"
                className="generate-button"
                disabled={!file || isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate MCQs'}
              </button>
            </div>
            {error && <p className="error-message">{error}</p>}
          </form>
        </div>

        {mcqs.length > 0 && (
          <div className="results-section">
            <h2>Generated MCQs</h2>
            <div className="mcq-list">
              {mcqs.map((mcq, index) => (
                <div key={index} className="mcq-card">
                  <h3>{index + 1}. {mcq.question}</h3>
                  <div className="options">
                    {mcq.options.map((option, optIndex) => (
                      <div 
                        key={optIndex} 
                        className={`option ${optIndex === mcq.correctAnswer ? 'correct' : ''}`}
                      >
                        {String.fromCharCode(65 + optIndex)}. {option}
                      </div>
                    ))}
                  </div>
                  <div className="correct-answer">
                    Correct Answer: {String.fromCharCode(65 + mcq.correctAnswer)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} PDF to MCQ Generator</p>
      </footer>
    </div>
  );
}

export default App;
