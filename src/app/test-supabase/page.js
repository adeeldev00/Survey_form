"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabase() {
  const [connectionStatus, setConnectionStatus] = useState("Checking...");
  const [questions, setQuestions] = useState([]);
  const [options, setOptions] = useState([]);
  const [formData, setFormData] = useState({});
  const [responseStatus, setResponseStatus] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all questions
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("id, question_text, question_type");

        if (questionsError) {
          setConnectionStatus("Failed to fetch questions: " + questionsError.message);
          console.error("Questions Error:", questionsError);
          return;
        }

        if (!questionsData || questionsData.length === 0) {
          setConnectionStatus("Connected, but no questions found in questions table.");
          return;
        }

        setQuestions(questionsData);

        // Initialize formData: single-select uses string, multiple-select uses array
        const initialFormData = questionsData.reduce((acc, q) => {
          acc[q.id] = q.question_type === "checkbox" ? [] : "";
          return acc;
        }, {});
        setFormData(initialFormData);

        // Fetch all options
        const { data: optionsData, error: optionsError } = await supabase
          .from("question_options")
          .select("id, question_id, option_text");

        if (optionsError) {
          setConnectionStatus("Failed to fetch options: " + optionsError.message);
          console.error("Options Error:", optionsError);
          return;
        }

        if (optionsData && optionsData.length > 0) {
          setOptions(optionsData);
          setConnectionStatus("Connected successfully! Questions and options loaded.");
        } else {
          setConnectionStatus("Connected, but no options found in question_options table.");
        }
      } catch (err) {
        setConnectionStatus("Connection error: " + err.message);
        console.error("Error:", err);
      }
    }
    fetchData();
  }, []);

  // Handle option selection
  const handleOptionChange = (questionId, value, questionType) => {
    if (questionType === "checkbox") {
      setFormData(prev => ({
        ...prev,
        [questionId]: prev[questionId].includes(value)
          ? prev[questionId].filter(v => v !== value)
          : [...prev[questionId], value],
      }));
    } else {
      setFormData(prev => ({ ...prev, [questionId]: value }));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Check for unanswered questions
    const unanswered = questions.filter(q => 
      q.question_type === "checkbox" 
        ? formData[q.id].length === 0 
        : !formData[q.id]
    );
    if (unanswered.length > 0) {
      setResponseStatus("Please answer all questions.");
      return;
    }

    try {
      const responses = questions.map(q => {
        if (q.question_type === "checkbox") {
          const selectedOptionIds = options
            .filter(opt => opt.question_id === q.id && formData[q.id].includes(opt.option_text))
            .map(opt => opt.id);
          return {
            question_id: q.id,
            response_text: formData[q.id].join(", "), // Comma-separated for multiple selections
            response_option_ids: selectedOptionIds,
          };
        } else {
          const selectedOption = options.find(
            opt => opt.question_id === q.id && opt.option_text === formData[q.id]
          );
          return {
            question_id: q.id,
            response_text: formData[q.id],
            response_option_ids: selectedOption ? [selectedOption.id] : null,
          };
        }
      });

      const { error } = await supabase
        .from("survey_responses")
        .insert(responses);

      if (error) {
        setResponseStatus("Failed to save responses: " + error.message);
        console.error("Response Error:", error);
        return;
      }

      setResponseStatus("All responses saved successfully!");
      // Reset form
      setFormData(questions.reduce((acc, q) => {
        acc[q.id] = q.question_type === "checkbox" ? [] : "";
        return acc;
      }, {}));
    } catch (err) {
      setResponseStatus("Error saving responses: " + err.message);
      console.error("Error:", err);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Supabase Connection Test</h1>
      <p>Status: {connectionStatus}</p>
      {questions.length > 0 && (
        <div>
          <h2>All Questions</h2>
          {questions.map(q => (
            <div key={q.id} style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
              <h3>Question (ID: {q.id})</h3>
              <p>{q.question_text}</p>
              <div style={{ marginBottom: "10px" }}>
                {options
                  .filter(opt => opt.question_id === q.id)
                  .map(opt => (
                    <label key={opt.id} style={{ display: "block", margin: "5px 0" }}>
                      <input
                        type={q.question_type === "checkbox" ? "checkbox" : "radio"}
                        name={`question-${q.id}`}
                        value={opt.option_text}
                        checked={
                          q.question_type === "checkbox"
                            ? formData[q.id].includes(opt.option_text)
                            : formData[q.id] === opt.option_text
                        }
                        onChange={e => handleOptionChange(q.id, e.target.value, q.question_type)}
                      />
                      {opt.option_text}
                    </label>
                  ))}
              </div>
            </div>
          ))}
          <button
            onClick={handleSubmit}
            style={{
              padding: "10px 20px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Submit All Responses
          </button>
          <p>{responseStatus}</p>
        </div>
      )}
    </div>
  );
}