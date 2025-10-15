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
    setMcqs([]); // Clear previous results

    try {
      const response = await fetch('/api/generate-mcqs', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let the browser set it with the correct boundary
        headers: {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.mcqs && data.mcqs.length > 0) {
        setMcqs(data.mcqs);
      } else {
        throw new Error('No MCQs were generated. Please try again.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'An error occurred while generating MCQs. Please try again.');
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
